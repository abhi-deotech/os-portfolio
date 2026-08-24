import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Layers, RotateCcw } from 'lucide-react';
import GameShell from './GameShell';
import useGameLoop from '../../hooks/useGameLoop';
import useGameInput from '../../hooks/useGameInput';
import useGameAudio from '../../hooks/useGameAudio';
import useHighScore from '../../hooks/useHighScore';
import canvasPalette from '../../theme/canvasPalette';
import useOSStore from '../../store/osStore';

/**
 * Tower Stack — drop a sliding block onto the one below; whatever hangs over is sliced off and the
 * tower gets narrower until you miss.
 *
 * Everything that changes every frame (block positions, camera, debris) lives in a single mutable
 * world ref and is painted to a canvas. React state holds only what the chrome renders — score,
 * height, status — so a 60Hz simulation does not drive 60 reconciliations a second.
 *
 * The whole simulation runs in `step`, a loop callback, and in the pointer/key handlers. Nothing
 * here is computed inside a `setX(prev => …)` updater: StrictMode double-invokes those, which is
 * exactly how 2048 came to score 8 for a single merge (tasks/lessons.md). Scores are derived from
 * `scoreRef` and written with a plain `setScore(value)`.
 */

const STEP_MS = 16;
const DT = STEP_MS / 1000;

const BLOCK_H = 26;          // world px — one storey
const START_W = 0.58;        // block width as a fraction of the board, so a resize just rescales
const BASE_SPEED = 0.62;     // board widths per second
const SPEED_GROWTH = 0.035;  // added per storey
const MAX_SPEED = 1.9;
const EDGE_HANG = 0.55;      // how far past the board edge the slide may travel, in block widths
const PERFECT_PX = 4;
const PERFECT_REGAIN = 0.006; // a flawless drop wins a sliver of width back
const MIN_BLOCK_PX = 5;
const CAM_LERP = 0.11;
const CAM_ANCHOR = 0.3;      // where the active block sits once the camera starts following
const GROUND_PAD = 34;
const GRAVITY = 900;         // px/s² on the sliced-off pieces
const HUE_STEP = 0.055;      // fraction of the accent ramp travelled per storey
const POINTS = 10;
const COMBO_CAP = 5;

/** Only `rgb(r g b …)` is parsed. canvasPalette's hex fallbacks are used verbatim instead of
 *  interpolated, so a themeless document degrades to a flat accent rather than to garbage. */
const parseRGB = (v) => {
  if (typeof v !== 'string' || !v.startsWith('rgb')) return null;
  const n = v.match(/[\d.]+/g);
  if (!n || n.length < 3) return null;
  return [Number(n[0]), Number(n[1]), Number(n[2])];
};

const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const scale = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
const rgbStr = (c) => `rgb(${Math.round(c[0])} ${Math.round(c[1])} ${Math.round(c[2])})`;

/** Cyclic walk along the ramp, so storey N and storey N+18 are the same hue and the rise reads as
 *  a gradient rather than as noise. */
const rampAt = (ramp, t) => {
  const n = ramp.length;
  const f = ((t % 1) + 1) % 1 * n;
  const i0 = Math.floor(f) % n;
  return mix(ramp[i0], ramp[(i0 + 1) % n], f - Math.floor(f));
};

/**
 * Read the live SDL roles and pre-parse the three OS accents into an interpolatable ramp. Colour is
 * never stored on a block — only its storey index — so the tower retints the instant the colorway
 * changes instead of freezing whichever palette happened to be active when it was built.
 */
const readPalette = () => {
  const pal = canvasPalette();
  const ramp = [pal.primary, pal.secondary, pal.tertiary].map(parseRGB);
  pal.ramp = ramp.every(Boolean) ? ramp : null;
  return pal;
};

const blockPaint = (pal, storey) => {
  if (!pal.ramp) return { face: pal.accent, edge: pal.accentSoft };
  const c = rampAt(pal.ramp, storey * HUE_STEP);
  return { face: rgbStr(c), edge: rgbStr(scale(c, 0.62)) };
};

const rectPath = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, rad);
  else ctx.rect(x, y, w, h);
};

const createWorld = () => ({
  // Index in this array IS the storey, and drives both the world Y and the hue.
  blocks: [{ x: (1 - START_W) / 2, w: START_W }],
  moving: { x: -START_W * EDGE_HANG, w: START_W, dir: 1, speed: BASE_SPEED, i: 1 },
  debris: [],
  pops: [],
  flash: null,
  cam: null, // resolved on the first paint, so the opening frame does not swoop in from nowhere
});

/** Nothing in this game is directional, and the canvas already drops on pointerdown — mapping the
 *  swipe as well would drop twice for one gesture, since a swipe raises both. */
const NO_DIRECTION = () => {};

/** World Y of a storey's top edge. Up is negative; the base sits on y = 0. */
const storeyTop = (i) => -(i + 1) * BLOCK_H;

const camTarget = (g, H) => {
  const want = storeyTop(g.moving ? g.moving.i : g.blocks.length - 1) - H * CAM_ANCHOR;
  // Clamped so the camera stays parked on the ground until the tower is tall enough to need it;
  // `min` picks the more negative (higher) of the two because up is negative here.
  return Math.min(want, GROUND_PAD - H);
};

const TowerStack = ({ onBack }) => {
  const play = useGameAudio();
  const [best, submitBest] = useHighScore('towerstack', 'max');
  const colorway = useOSStore((s) => s.colorway);
  const accentIntensity = useOSStore((s) => s.accentIntensity);

  const [score, setScore] = useState(0);
  const [height, setHeight] = useState(0);
  const [status, setStatus] = useState('playing');
  const [isRecord, setIsRecord] = useState(false);
  // The loop has to outlive the game over by a beat, otherwise the block you missed with never
  // falls — it just vanishes the frame the overlay appears.
  const [settling, setSettling] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const hostRef = useRef(null);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const worldRef = useRef(null);
  const palRef = useRef(null);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const statusRef = useRef('playing');
  const settlingRef = useRef(false);
  const frameAtRef = useRef(null);

  if (worldRef.current === null) worldRef.current = createWorld();

  const draw = useCallback(() => {
    const ctx = ctxRef.current;
    const pal = palRef.current;
    const g = worldRef.current;
    const { w: W, h: H } = sizeRef.current;
    if (!ctx || !pal || !W || !H) return;

    if (g.cam === null) g.cam = camTarget(g, H);
    const sy = (worldY) => worldY - g.cam;

    ctx.fillStyle = pal.sunken;
    ctx.fillRect(0, 0, W, H);

    // A wash at the top of the board. It is the only thing above the tower, so it gives the camera
    // scroll something to read against once the ground has left the frame.
    const wash = ctx.createLinearGradient(0, 0, 0, H);
    wash.addColorStop(0, pal.accentAt(0.16));
    wash.addColorStop(1, pal.accentAt(0));
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, W, H);

    const groundY = sy(0);
    if (groundY < H) {
      ctx.fillStyle = pal.surface;
      ctx.fillRect(0, groundY, W, H - groundY);
      ctx.fillStyle = pal.hairline;
      ctx.fillRect(0, groundY, W, 1);
    }

    const paintBlock = (x, y, w, storey, glow) => {
      const { face, edge } = blockPaint(pal, storey);
      if (glow) {
        ctx.save();
        ctx.shadowColor = pal.accentAt(0.5);
        ctx.shadowBlur = 18;
      }
      // The dark slab is drawn full height and the lit face slightly shorter, leaving a sliver of
      // shadow along the bottom. That single band is what makes a flat rectangle read as a solid.
      ctx.fillStyle = edge;
      rectPath(ctx, x, y, w, BLOCK_H, 5);
      ctx.fill();
      if (glow) ctx.restore();
      ctx.fillStyle = face;
      rectPath(ctx, x, y, w, BLOCK_H - 5, 5);
      ctx.fill();
    };

    for (let i = 0; i < g.blocks.length; i++) {
      const b = g.blocks[i];
      const y = sy(storeyTop(i));
      if (y > H || y + BLOCK_H < -BLOCK_H) continue; // off-camera storeys are never rasterized
      paintBlock(b.x * W, y, b.w * W, i, false);
    }

    if (g.flash) {
      const b = g.blocks[g.flash.i];
      const y = sy(storeyTop(g.flash.i));
      const t = g.flash.t;
      ctx.fillStyle = pal.inkAt(0.8 * t);
      rectPath(ctx, b.x * W, y, b.w * W, BLOCK_H, 5);
      ctx.fill();
      const spread = (1 - t) * 12;
      ctx.strokeStyle = pal.inkAt(0.45 * t);
      ctx.lineWidth = 2;
      rectPath(ctx, b.x * W - spread, y - spread, b.w * W + spread * 2, BLOCK_H + spread * 2, 8);
      ctx.stroke();
    }

    if (g.moving) {
      const m = g.moving;
      paintBlock(m.x * W, sy(storeyTop(m.i)), m.w * W, m.i, true);
    }

    for (const d of g.debris) {
      const w = d.w * W;
      const cx = d.x * W + w / 2;
      const cy = sy(d.y) + BLOCK_H / 2;
      if (cy - BLOCK_H > H) continue;
      ctx.save();
      ctx.globalAlpha = Math.min(1, d.t);
      ctx.translate(cx, cy);
      ctx.rotate(d.rot);
      const { face } = blockPaint(pal, d.i);
      ctx.fillStyle = face;
      rectPath(ctx, -w / 2, -BLOCK_H / 2, w, BLOCK_H, 4);
      ctx.fill();
      ctx.restore();
    }

    for (const p of g.pops) {
      ctx.fillStyle = pal.inkAt(Math.min(1, p.t));
      ctx.font = '800 12px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.text, p.x * W, sy(p.y) - 10 - (1 - p.t) * 22);
    }
  }, []);

  const endRun = useCallback(() => {
    statusRef.current = 'over';
    setStatus('over');
    settlingRef.current = true;
    setSettling(true);
    play('lose');
    // Guarded, because missing the very first drop ends the run on 0 points. Submitting that
    // stores 0 as the personal best (useHighScore treats any finite value as a record when none is
    // stored) and the overlay congratulates the player on it. Breakout guards the same way.
    setIsRecord(scoreRef.current > 0 && submitBest(scoreRef.current));
  }, [play, submitBest]);

  /** A run in progress is still a score. Without this, hitting Restart on a 900-point tower — or
   *  just closing the window — throws it away, because the only path to submitBest was endRun. */
  const bankScore = useCallback(() => {
    if (statusRef.current !== 'over' && scoreRef.current > 0) submitBest(scoreRef.current);
  }, [submitBest]);

  useEffect(() => bankScore, [bankScore]);

  /** Commit the sliding block. Called from a pointer handler or a key handler — never from a state
   *  updater, so every side effect below runs exactly once per drop under StrictMode. */
  const drop = useCallback((e) => {
    // Primary button only. `pointerdown` fires for the secondary and middle buttons too, so
    // without this a right-click meant for the OS context menu also commits a block. Touch and pen
    // both report button 0, so this costs mobile nothing.
    if (e && typeof e.button === 'number' && e.button !== 0) return;
    const g = worldRef.current;
    if (statusRef.current !== 'playing' || !g.moving) return;

    const W = sizeRef.current.w;
    if (!W) return;
    const m = g.moving;
    const below = g.blocks[g.blocks.length - 1];
    const top = storeyTop(m.i);

    const left = Math.max(m.x, below.x);
    const right = Math.min(m.x + m.w, below.x + below.w);
    const overlap = right - left;

    // A sliver narrower than a few pixels is not a tower any more — it is an invisible ledge that
    // the next block can never be aimed at. Treat it as the miss it effectively is.
    if (overlap * W < MIN_BLOCK_PX) {
      g.debris.push({ x: m.x, w: m.w, y: top, vx: m.dir * 0.18, vy: -60, rot: 0, spin: m.dir * 2.2, t: 1.6, i: m.i });
      g.moving = null;
      endRun();
      return;
    }

    // Centres, not left edges: a perfect drop after a width regain leaves the two edges offset by
    // half the regain even though the block is dead centre.
    const centreOff = Math.abs((m.x + m.w / 2) - (below.x + below.w / 2)) * W;

    // The tolerance floors at half the distance the block covers in one tick, and that floor is not
    // a difficulty knob — it is what makes PERFECT reachable at all.
    //
    // The slide restarts from EXACTLY `lo` (or `hi`) after every bounce and advances by exactly
    // `speed * DT` per tick, so the positions the player can ever drop on are a fixed lattice. A
    // target centre that falls in a gap of that lattice falls in the same gap on every pass, for
    // the rest of the run. With a flat 4px window on a 460px board the lattice pitch passes 8px at
    // storey ~18 and the closest the block EVER comes to centre is 4.14px — measured, on both the
    // left-to-right and right-to-left passes. PERFECT simply dies there, and with it the width
    // regain that is supposed to keep a skilled run alive. Half a tick is the smallest floor that
    // guarantees some sample always lands inside the window.
    const tolerance = Math.max(PERFECT_PX, (m.speed * DT * W) / 2);
    const perfect = centreOff <= tolerance;

    let nx;
    let nw;
    if (perfect) {
      nw = Math.min(START_W, m.w + PERFECT_REGAIN);
      nx = below.x - (nw - m.w) / 2; // grown symmetrically, so the tower stays plumb
    } else {
      nx = left;
      nw = overlap;
      // Exactly one of these can fire. The moving block is always spawned at its support's width,
      // and the regain widens the block and its support together, so `m.w === below.w` holds for
      // every drop — and with equal widths, hanging over on the left and on the right at the same
      // time is arithmetically impossible. Both branches are kept because each is independently
      // correct if that invariant is ever relaxed; neither is reachable today.
      if (m.x < left) {
        g.debris.push({ x: m.x, w: left - m.x, y: top, vx: -0.32, vy: -70, rot: 0, spin: -3.4, t: 1.6, i: m.i });
      }
      if (m.x + m.w > right) {
        g.debris.push({ x: right, w: m.x + m.w - right, y: top, vx: 0.32, vy: -70, rot: 0, spin: 3.4, t: 1.6, i: m.i });
      }
    }

    g.blocks.push({ x: nx, w: nw });
    const storey = g.blocks.length - 1;

    let gained = POINTS;
    if (perfect) {
      comboRef.current += 1;
      gained = POINTS + POINTS * Math.min(comboRef.current, COMBO_CAP);
      g.flash = { i: storey, t: 1 };
      g.pops.push({ text: `PERFECT +${gained}`, x: nx + nw / 2, y: top, t: 1 });
      play('merge');
    } else {
      comboRef.current = 0;
      play('place');
    }

    scoreRef.current += gained;
    setScore(scoreRef.current);
    setHeight(storey);

    const next = storey + 1;
    // Alternate the entry side so the rhythm of the run never settles into one direction.
    const fromLeft = next % 2 === 0;
    g.moving = {
      x: fromLeft ? -nw * EDGE_HANG : 1 - nw + nw * EDGE_HANG,
      w: nw,
      dir: fromLeft ? 1 : -1,
      speed: Math.min(MAX_SPEED, BASE_SPEED + SPEED_GROWTH * next),
      i: next,
    };
  }, [play, endRun]);

  const step = useCallback(() => {
    const g = worldRef.current;
    const H = sizeRef.current.h;
    if (!H) return;

    if (statusRef.current === 'playing' && g.moving) {
      const m = g.moving;
      m.x += m.dir * m.speed * DT;
      const lo = -m.w * EDGE_HANG;
      const hi = 1 - m.w + m.w * EDGE_HANG;
      if (m.x <= lo) { m.x = lo; m.dir = 1; }
      else if (m.x >= hi) { m.x = hi; m.dir = -1; }
    }

    if (g.cam === null) g.cam = camTarget(g, H);
    else g.cam += (camTarget(g, H) - g.cam) * CAM_LERP;

    for (let k = g.debris.length - 1; k >= 0; k--) {
      const d = g.debris[k];
      d.vy += GRAVITY * DT;
      d.y += d.vy * DT;
      d.x += d.vx * DT;
      d.rot += d.spin * DT;
      d.t -= DT;
      if (d.t <= 0) g.debris.splice(k, 1);
    }
    for (let k = g.pops.length - 1; k >= 0; k--) {
      g.pops[k].t -= DT * 1.1;
      if (g.pops[k].t <= 0) g.pops.splice(k, 1);
    }
    if (g.flash) {
      g.flash.t -= DT * 3;
      if (g.flash.t <= 0) g.flash = null;
    }

    // Painting from the loop rather than from a second rAF keeps the canvas dead quiet while paused
    // or minimized — App.jsx keeps minimized windows mounted, and an always-on draw loop in every
    // one of them is exactly the waste the fixed-step loop exists to avoid.
    //
    // But once per FRAME, not once per tick. useGameLoop drains its accumulator in a `while`, so a
    // device rendering at 20fps hands us three ticks per frame and a stall hands us up to fifteen
    // (the 250ms clamp / 16ms) — each one repainting a board that is only composited once. Every
    // tick of a frame runs synchronously inside the one rAF callback, and document.timeline
    // .currentTime is constant for that whole callback, so it identifies the frame exactly. Where
    // there is no timeline to read, this falls back to the old paint-every-tick behaviour.
    const frameStamp = document.timeline?.currentTime;
    if (frameStamp == null || frameStamp !== frameAtRef.current) {
      frameAtRef.current = frameStamp;
      draw();
    }

    if (settlingRef.current && statusRef.current !== 'playing' && !g.debris.length && !g.pops.length) {
      settlingRef.current = false;
      setSettling(false);
    }
  }, [draw]);

  useGameLoop(step, STEP_MS, status === 'playing' || settling);

  const togglePause = useCallback(() => {
    if (statusRef.current === 'playing') { statusRef.current = 'paused'; setStatus('paused'); }
    else if (statusRef.current === 'paused') { statusRef.current = 'playing'; setStatus('playing'); }
  }, []);

  const restart = useCallback(() => {
    bankScore();
    worldRef.current = createWorld();
    scoreRef.current = 0;
    comboRef.current = 0;
    settlingRef.current = false;
    statusRef.current = 'playing';
    setScore(0);
    setHeight(0);
    setIsRecord(false);
    setSettling(false);
    setStatus('playing');
    draw();
  }, [draw, bankScore]);

  const handleKey = useCallback((key) => {
    // Every branch is gated on the status the key actually means something in. Returning true tells
    // useGameInput the key was handled, which both preventDefaults it and suppresses the
    // directional mapping — so claiming Enter/ArrowDown while the tower is down swallowed a
    // keypress to do nothing at all, and left the game with no keyboard route out of the overlay.
    if (statusRef.current === 'playing') {
      if (key === ' ' || key === 'Enter' || key === 'ArrowDown') {
        drop();
        return true;
      }
      return false;
    }
    // Enter restarts from the game-over overlay, matching its "Stack again" button. Space stays
    // unclaimed so it still falls through to the shell's pause binding, which is what the paused
    // overlay tells the player to press.
    if (statusRef.current === 'over' && key === 'Enter') {
      restart();
      return true;
    }
    return false;
  }, [drop, restart]);

  const inputProps = useGameInput(NO_DIRECTION, { onPause: togglePause, onKey: handleKey });

  // Sized from the space the shell actually gives it rather than from a fixed width, so the board
  // fits a 375px phone and a maximized desktop window without either overflowing or stranding room.
  useEffect(() => {
    // Two levels up on purpose. The shell's board wrapper shrink-wraps its child, so measuring it
    // would just be measuring this canvas — a feedback loop that can only ratchet. The element
    // above it is the flex cell whose size the window actually dictates.
    const board = hostRef.current?.parentElement;
    const parent = board?.parentElement ?? board;
    if (!parent || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height: avail } = entry.contentRect;
      const w = Math.max(240, Math.floor(Math.min(width, 460)));
      const h = Math.max(280, Math.floor(Math.min(avail, 640)));
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    });
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    sizeRef.current = size;
    const c = canvasRef.current;
    if (!c || !size.w || !size.h) return;
    // The backing store is scaled by DPR and the context transformed to match, so the board is not
    // a blurry upscale on a retina display. Capped at 2.5 because past that it is only fill rate.
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    c.width = Math.round(size.w * dpr);
    c.height = Math.round(size.h * dpr);
    const ctx = c.getContext('2d');
    if (!ctx) return; // a lost or unsupported context must not take the whole window down
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxRef.current = ctx;
    draw();
  }, [size, draw]);

  useEffect(() => {
    // applyTheme stamps the CSS variables from its own effect, and there is no ordering guarantee
    // between the two, so the palette is read again on the next frame before anything is trusted.
    const read = () => { palRef.current = readPalette(); draw(); };
    read();
    const raf = requestAnimationFrame(read);
    return () => cancelAnimationFrame(raf);
  }, [colorway, accentIntensity, draw]);

  useEffect(() => { draw(); }, [status, draw]);

  return (
    <GameShell
      gameId="towerstack"
      onBack={onBack}
      score={score}
      best={best}
      status={status}
      onRestart={restart}
      onTogglePause={togglePause}
      boardProps={inputProps}
      headerExtra={(
        <div className="text-right hidden sm:block">
          <p className="text-[9px] font-black text-sdl-sec uppercase tracking-[0.2em] leading-none">Height</p>
          <p className="text-lg md:text-xl font-black tabular-nums leading-tight text-os-secondary">{height}</p>
        </div>
      )}
      overlay={(
        <>
          <Layers size={36} className="text-os-secondary mb-3" />
          <h2 className="text-2xl font-black italic uppercase tracking-tighter">Tower Down</h2>
          <p className="text-sdl-sec text-[10px] font-black uppercase tracking-[0.25em] mt-2">
            {height} {height === 1 ? 'storey' : 'storeys'} · {score} points
          </p>
          {isRecord && (
            <p className="text-os-primary text-[10px] font-black uppercase tracking-[0.25em] mt-2">New personal best</p>
          )}
          <button
            onClick={restart}
            className="mt-6 flex items-center gap-2 px-6 py-3 rounded-2xl bg-os-primary text-sdl-onAccent font-black uppercase tracking-widest text-xs shadow-[var(--sdl-lift)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
          >
            <RotateCcw size={16} />
            Stack again
          </button>
        </>
      )}
    >
      <div
        ref={hostRef}
        style={{ width: size.w || undefined, height: size.h || undefined }}
        className="relative rounded-[2rem] overflow-hidden border border-hairline/10 bg-sdl-sunken shadow-[var(--sdl-lift)]"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={drop}
          style={{ width: size.w, height: size.h }}
          className="block touch-none"
        />
      </div>
    </GameShell>
  );
};

export default TowerStack;
