import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Trophy, RefreshCw } from 'lucide-react';
import GameShell from './GameShell';
import useGameLoop from '../../hooks/useGameLoop';
import useGameInput from '../../hooks/useGameInput';
import useGameAudio from '../../hooks/useGameAudio';
import useHighScore from '../../hooks/useHighScore';
import canvasPalette from '../../theme/canvasPalette';
import useOSStore from '../../store/osStore';

/**
 * Breakout.
 *
 * The simulation runs in a fixed 300x400 world, and the canvas is only ever a scaled *view* of it.
 * That separation is the whole reason the game feels the same on a 330px phone and a 400px desktop
 * board: no speed, no paddle width and no brick size is expressed in pixels, so resizing the window
 * cannot change the physics. It also means the fixed timestep is honest — `dt` is a constant, and
 * a 144Hz display advances the ball exactly as far per second as a 60Hz one.
 *
 * There is no achievement for this game. src/config/achievements.js registers ids for the original
 * five only, and unlockAchievement dev-warns on anything it does not know, so inventing
 * `breakout_pro` here would be a console warning on every clear rather than a badge.
 */

// ── World geometry. All units are world units, never pixels. ────────────────────────────────────
const WORLD_W = 300;
const WORLD_H = 400;

const PADDLE_H = 8;
const PADDLE_Y = WORLD_H - 26;
const PADDLE_W_BASE = 58;
const PADDLE_W_MIN = 38;
const PADDLE_KEY_SPEED = 265; // world units per second when steering with the keyboard

const BALL_R = 4;
const BASE_SPEED = 130;       // world units per second at level 1
const SPEED_STEP = 1.1;       // per level
const MAX_SPEED = 305;

// 60° from vertical is the widest the paddle will throw the ball. Because the launch vector is
// built from an angle rather than by flipping vy, |vy| can never drop below cos(60°) = 0.5 of the
// speed — which is the fix for the classic near-horizontal trap where a shallow ball ping-pongs
// between the two side walls for twenty seconds and the player can only watch.
const MAX_BOUNCE = (60 * Math.PI) / 180;
const MIN_VY_FRAC = 0.3;

const COLS = 7;
const ROWS_BASE = 4;
const ROWS_MAX = 8;
const SIDE = 10;
const GAP_X = 3;
const GAP_Y = 4;
const BRICK_TOP = 42;
const BRICK_H = 12;
const BRICK_W = (WORLD_W - SIDE * 2 - GAP_X * (COLS - 1)) / COLS;

const LIVES = 3;
const STEP_MS = 1000 / 120;
const DT = STEP_MS / 1000;
const MAX_PARTICLES = 140;
const TRAIL_LEN = 12;

// Row tint cycles the four accent roles, so the wall reads as banded on every colorway instead of
// depending on a private palette that would clash the moment someone picks a different theme.
const ROW_ROLES = ['primary', 'secondary', 'tertiary', 'accent'];
const rowColour = (pal, row) => pal[ROW_ROLES[row % ROW_ROLES.length]];

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

const speedFor = (level) => Math.min(MAX_SPEED, BASE_SPEED * SPEED_STEP ** (level - 1));
const paddleWidthFor = (level) => Math.max(PADDLE_W_MIN, PADDLE_W_BASE - (level - 1) * 3.5);
const rowsFor = (level) => Math.min(ROWS_MAX, ROWS_BASE + level - 1);

function buildBricks(level) {
  const rows = rowsFor(level);
  const bricks = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < COLS; c++) {
      bricks.push({
        x: SIDE + c * (BRICK_W + GAP_X),
        y: BRICK_TOP + r * (BRICK_H + GAP_Y),
        w: BRICK_W,
        h: BRICK_H,
        row: r,
        alive: true,
        // Hue alone does not band the wall. Several colorways map primary/secondary/tertiary/accent
        // to neighbouring hues, and a screenshot of the first build showed four rows of the same
        // pink — the rows were tinted correctly and still unreadable. A brightness ramp on top of
        // the hue cycle keeps the wall legible on any theme, in either mode, and doubles as a
        // read-out of value: the brightest row is the one worth the most.
        shade: 1 - 0.44 * (r / Math.max(1, rows - 1)),
        // Higher rows pay more: they are the ones you cannot reach until the rows beneath them
        // have been cleared, so the score tracks difficulty rather than just brick count.
        points: (rows - r) * 10,
      });
    }
  }
  return bricks;
}

function dockBall(w) {
  w.ball.x = w.paddle.x;
  w.ball.y = PADDLE_Y - BALL_R - 1;
  w.ball.vx = 0;
  w.ball.vy = 0;
  w.ball.docked = true;
  w.trail.length = 0;
}

function createWorld(level, score = 0, lives = LIVES) {
  const w = {
    level,
    score,
    lives,
    speed: speedFor(level),
    bricks: buildBricks(level),
    remaining: 0,
    paddle: { x: WORLD_W / 2, w: paddleWidthFor(level) },
    ball: { x: 0, y: 0, vx: 0, vy: 0, docked: true },
    trail: [],
    particles: [],
    flash: 0,
    banner: 0,
    over: false,
  };
  w.remaining = w.bricks.length;
  dockBall(w);
  return w;
}

/**
 * Re-derive the velocity from the current level speed and refuse anything too shallow.
 *
 * Called after every deflection. Renormalising here (rather than only scaling on level-up) is what
 * lets a level change take effect on a ball that is already in flight, and the MIN_VY_FRAC floor
 * catches the one case the paddle's angle model cannot: a corner clip off a brick that leaves the
 * ball skimming sideways under the wall with no way back down.
 */
function retarget(ball, speed) {
  const mag = Math.hypot(ball.vx, ball.vy) || speed;
  let ux = ball.vx / mag;
  let uy = ball.vy / mag;
  if (Math.abs(uy) < MIN_VY_FRAC) {
    uy = (uy < 0 ? -1 : 1) * MIN_VY_FRAC;
    ux = (ux < 0 ? -1 : 1) * Math.sqrt(1 - MIN_VY_FRAC * MIN_VY_FRAC);
  }
  ball.vx = ux * speed;
  ball.vy = uy * speed;
}

function spawnBurst(w, x, y, row, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 18 + Math.random() * 58;
    const life = 0.3 + Math.random() * 0.3;
    w.particles.push({
      x, y, row, life, max: life,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 18,
      r: 0.7 + Math.random() * 1.2,
    });
  }
  // A long rally on a slow phone can otherwise queue hundreds of these. The oldest are also the
  // faintest, so trimming from the front is invisible.
  if (w.particles.length > MAX_PARTICLES) {
    w.particles.splice(0, w.particles.length - MAX_PARTICLES);
  }
}

function roundedPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  // Safari below 16 has no roundRect. A square brick is a cosmetic downgrade; throwing here would
  // take the whole board down with it.
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

const Breakout = ({ onBack }) => {
  const play = useGameAudio();
  const [best, submitBest] = useHighScore('breakout', 'max');

  // App.jsx keeps minimized windows mounted — they are only faded to opacity 0 — so requestAnimation
  // Frame keeps firing for a window nobody can see. Without this gate a minimized Breakout would
  // quietly burn all three lives and be sitting on a game-over screen when it was restored. Gating
  // the loop rather than forcing `status` to 'paused' means nothing has to be un-paused on restore,
  // and a build where this id is never minimized simply never sees the flag go true.
  const isMinimized = useOSStore((s) => (s.minimizedWindows || []).includes('breakout'));

  const [status, setStatus] = useState('playing');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [level, setLevel] = useState(1);
  const [newBest, setNewBest] = useState(false);

  const worldRef = useRef(null);
  if (worldRef.current === null) worldRef.current = createWorld(1);

  // `status` is mirrored so input handlers and the loop can branch on it without closing over a
  // stale render, and so every transition can be written as a plain assignment outside any state
  // updater. StrictMode double-invokes updaters; nothing with a consequence goes inside one.
  const statusRef = useRef('playing');
  const uiRef = useRef({ score: 0, lives: LIVES, level: 1 });
  const keysRef = useRef({ left: false, right: false });

  const boxRef = useRef(null);
  const canvasRef = useRef(null);
  const viewRef = useRef({ cssW: 0, cssH: 0, dpr: 1 });
  const palRef = useRef(null);
  const palAtRef = useRef(0);
  const pointerRef = useRef(null);

  const go = useCallback((next) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  // ── Canvas backing store ──────────────────────────────────────────────────────────────────────
  // clientWidth/clientHeight rather than getBoundingClientRect: they report the CONTENT box, which
  // is the box the bitmap is actually stretched over. Sizing the backing store from the border box
  // makes the bitmap a little larger than its display area, and the browser resamples it — a
  // permanent, subtle blur that looks exactly like a missing devicePixelRatio.
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    if (cw < 1 || ch < 1) return;
    // Capped at 3: a 4x-density phone would otherwise allocate a backing store four times the area
    // it can actually resolve, for no visible gain and a real cost per frame.
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const bw = Math.round(cw * dpr);
    const bh = Math.round(ch * dpr);
    if (canvas.width !== bw) canvas.width = bw;
    if (canvas.height !== bh) canvas.height = bh;
    viewRef.current = { cssW: cw, cssH: ch, dpr };
  }, []);

  useEffect(() => {
    const box = boxRef.current;
    if (!box || typeof ResizeObserver === 'undefined') return undefined;
    // Observing the container, not the canvas: writing `canvas.width` is a backing-store change and
    // never a layout change, but observing the element you also mutate is the shape that produces
    // "ResizeObserver loop completed with undelivered notifications" the first time someone adds a
    // style write here. The container is inert, so it cannot.
    const ro = new ResizeObserver(resizeCanvas);
    ro.observe(box);
    return () => ro.disconnect();
  }, [resizeCanvas]);

  const palette = useCallback(() => {
    const now = performance.now();
    // canvasPalette() reads getComputedStyle, which forces a style recalc. Paying that 60 times a
    // second for values that only change when someone switches colorway is waste; sampling twice a
    // second makes a theme switch land within 500ms, which nobody can perceive as a delay.
    if (!palRef.current || now - palAtRef.current > 500) {
      palRef.current = canvasPalette();
      palAtRef.current = now;
    }
    return palRef.current;
  }, []);

  // ── Input ─────────────────────────────────────────────────────────────────────────────────────
  const launch = useCallback(() => {
    const w = worldRef.current;
    if (!w.ball.docked || statusRef.current !== 'playing') return;
    const angle = (Math.random() * 2 - 1) * MAX_BOUNCE * 0.45;
    w.ball.docked = false;
    w.ball.vx = Math.sin(angle) * w.speed;
    w.ball.vy = -Math.cos(angle) * w.speed;
    play('place');
  }, [play]);

  const paddleTo = useCallback((clientX) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 1) return;
    const w = worldRef.current;
    const half = w.paddle.w / 2;
    w.paddle.x = clamp(((clientX - rect.left) / rect.width) * WORLD_W, half, WORLD_W - half);
    if (w.ball.docked) w.ball.x = w.paddle.x;
  }, []);

  // Pointer events rather than separate mouse and touch paths: one code path covers finger, stylus
  // and mouse, and capture keeps the drag alive when the finger slides off the canvas edge — which
  // on a 375px board is most of the time.
  const handlePointerDown = useCallback((e) => {
    if (statusRef.current !== 'playing') return;
    pointerRef.current = e.pointerId;
    // Capture is best-effort. A pointer that has already been released — which happens when a touch
    // is cancelled by the OS mid-gesture — makes setPointerCapture throw NotFoundError, and losing
    // the drag is a far better outcome than losing the frame.
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
    paddleTo(e.clientX);
    launch();
  }, [paddleTo, launch]);

  // A mouse steers on hover with no button held — that is how the cabinet's spinner behaved and it
  // is why the canvas hides its cursor: the paddle *is* the pointer. Touch and pen have no hover,
  // so they only steer between capture and release.
  const handlePointerMove = useCallback((e) => {
    if (pointerRef.current !== e.pointerId && !(e.pointerType === 'mouse' && statusRef.current === 'playing')) return;
    paddleTo(e.clientX);
  }, [paddleTo]);

  const handlePointerUp = useCallback((e) => {
    if (pointerRef.current !== e.pointerId) return;
    pointerRef.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* never captured */ }
  }, []);

  // useGameInput reports a keypress, not a key *hold*, and a paddle driven by OS key-repeat stalls
  // for half a second before it moves. So left/right are intercepted here and held in a ref that
  // the physics step integrates, and the mapped direction is suppressed by returning true.
  const handleKey = useCallback((key) => {
    if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
      keysRef.current.left = true;
      return true;
    }
    if (key === 'ArrowRight' || key === 'd' || key === 'D') {
      keysRef.current.right = true;
      return true;
    }
    // Space serves double duty. It launches a docked ball, and only when there is nothing to launch
    // does it fall through to GameShell's pause — so the key that starts the point is also the key
    // that stops the clock, without the two ever fighting.
    if (key === ' ' || key === 'ArrowUp' || key === 'w' || key === 'W') {
      if (statusRef.current === 'playing' && worldRef.current.ball.docked) {
        launch();
        return true;
      }
    }
    return false;
  }, [launch]);

  const handleKeyUp = useCallback((e) => {
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') keysRef.current.left = false;
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') keysRef.current.right = false;
  }, []);

  // A keyup raised while the board is not focused never reaches it, and the paddle would then slide
  // into the wall and stay there. Losing focus clears the held state, which is the only moment we
  // can be certain no key is still being tracked.
  const handleBlur = useCallback(() => {
    keysRef.current.left = false;
    keysRef.current.right = false;
    pointerRef.current = null;
  }, []);

  const noDirection = useCallback(() => {}, []);

  const togglePause = useCallback(() => {
    const s = statusRef.current;
    if (s === 'playing') go('paused');
    else if (s === 'paused') go('playing');
  }, [go]);

  // A run in progress is still a score. Without this, restarting after a 4,000-point level 5 threw
  // the whole thing away, because the only path to submitBest was the game-over branch.
  const bankScore = useCallback(() => {
    const w = worldRef.current;
    if (!w.over && w.score > 0) submitBest(w.score);
  }, [submitBest]);

  useEffect(() => bankScore, [bankScore]);

  const restart = useCallback(() => {
    bankScore();
    worldRef.current = createWorld(1);
    uiRef.current = { score: 0, lives: LIVES, level: 1 };
    setScore(0);
    setLives(LIVES);
    setLevel(1);
    setNewBest(false);
    handleBlur();
    go('playing');
  }, [go, handleBlur, bankScore]);

  const inputProps = useGameInput(noDirection, { onPause: togglePause, onKey: handleKey });

  // ── Simulation ────────────────────────────────────────────────────────────────────────────────
  const step = useCallback(() => {
    const w = worldRef.current;
    const { ball, paddle } = w;

    // Paddle. Pointer drags write paddle.x directly (drag wants to feel absolute); the keyboard
    // integrates a velocity here so a held key produces smooth travel.
    const dir = (keysRef.current.right ? 1 : 0) - (keysRef.current.left ? 1 : 0);
    if (dir !== 0) {
      const half = paddle.w / 2;
      paddle.x = clamp(paddle.x + dir * PADDLE_KEY_SPEED * DT, half, WORLD_W - half);
    }

    if (w.flash > 0) w.flash = Math.max(0, w.flash - DT * 2.2);
    if (w.banner > 0) w.banner = Math.max(0, w.banner - DT);

    for (let i = w.particles.length - 1; i >= 0; i--) {
      const p = w.particles[i];
      p.life -= DT;
      if (p.life <= 0) { w.particles.splice(i, 1); continue; }
      p.x += p.vx * DT;
      p.y += p.vy * DT;
      p.vy += 150 * DT;
    }

    if (ball.docked) {
      ball.x = paddle.x;
      ball.y = PADDLE_Y - BALL_R - 1;
      return;
    }

    ball.x += ball.vx * DT;
    ball.y += ball.vy * DT;

    w.trail.push({ x: ball.x, y: ball.y });
    if (w.trail.length > TRAIL_LEN) w.trail.shift();

    // Side and ceiling walls.
    if (ball.x - BALL_R < 0) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx); play('move'); }
    else if (ball.x + BALL_R > WORLD_W) { ball.x = WORLD_W - BALL_R; ball.vx = -Math.abs(ball.vx); play('move'); }
    if (ball.y - BALL_R < 0) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy); play('move'); }

    // Paddle. The deflection is built from where along the paddle the ball landed, not from a
    // mirror of the incoming vector — that is what turns the paddle into an aiming device instead
    // of a wall, and it is also what guarantees the minimum vertical component.
    if (
      ball.vy > 0 &&
      ball.y + BALL_R >= PADDLE_Y &&
      ball.y - BALL_R <= PADDLE_Y + PADDLE_H &&
      Math.abs(ball.x - paddle.x) <= paddle.w / 2 + BALL_R
    ) {
      const offset = clamp((ball.x - paddle.x) / (paddle.w / 2), -1, 1);
      const angle = offset * MAX_BOUNCE;
      ball.y = PADDLE_Y - BALL_R;
      ball.vx = Math.sin(angle) * w.speed;
      ball.vy = -Math.cos(angle) * w.speed;
      play('place');
    }

    // Bricks. At most one per step: with dt = 1/120s the ball travels under 2.6 world units, so it
    // cannot legitimately be inside two bricks at once, and resolving two would double-reflect the
    // ball straight back into the wall it just left.
    for (const b of w.bricks) {
      if (!b.alive) continue;
      const nx = clamp(ball.x, b.x, b.x + b.w);
      const ny = clamp(ball.y, b.y, b.y + b.h);
      const dx = ball.x - nx;
      const dy = ball.y - ny;
      if (dx * dx + dy * dy > BALL_R * BALL_R) continue;

      const insideX = ball.x > b.x && ball.x < b.x + b.w;
      const insideY = ball.y > b.y && ball.y < b.y + b.h;
      let flipY;
      if (insideX !== insideY) {
        flipY = insideX;
      } else {
        // Corner clip: reflect on whichever axis is least penetrated, which is the face the ball
        // actually arrived through.
        const overX = BALL_R + b.w / 2 - Math.abs(ball.x - (b.x + b.w / 2));
        const overY = BALL_R + b.h / 2 - Math.abs(ball.y - (b.y + b.h / 2));
        flipY = overY <= overX;
      }

      if (flipY) {
        ball.vy = -ball.vy;
        ball.y = ball.vy > 0 ? b.y + b.h + BALL_R + 0.01 : b.y - BALL_R - 0.01;
      } else {
        ball.vx = -ball.vx;
        ball.x = ball.vx > 0 ? b.x + b.w + BALL_R + 0.01 : b.x - BALL_R - 0.01;
      }
      retarget(ball, w.speed);

      b.alive = false;
      w.remaining -= 1;
      w.score += b.points;
      spawnBurst(w, b.x + b.w / 2, b.y + b.h / 2, b.row, 7);
      play('merge');
      break;
    }

    if (w.remaining === 0) {
      // Clearing the wall is a promotion, not an ending: more rows, a narrower paddle, a faster
      // ball, and a bonus that scales so a deep run is worth more than grinding level one.
      w.score += 50 * w.level;
      const next = w.level + 1;
      w.level = next;
      w.speed = speedFor(next);
      w.bricks = buildBricks(next);
      w.remaining = w.bricks.length;
      w.paddle.w = paddleWidthFor(next);
      w.paddle.x = clamp(w.paddle.x, w.paddle.w / 2, WORLD_W - w.paddle.w / 2);
      w.banner = 1.5;
      w.particles.length = 0;
      dockBall(w);
      play('win');
    } else if (ball.y - BALL_R > WORLD_H) {
      w.lives -= 1;
      w.flash = 1;
      w.particles.length = 0;
      if (w.lives <= 0) {
        w.lives = 0;
        w.over = true;
        dockBall(w);
        // submitBest writes localStorage. It sits here in the loop callback, which React invokes
        // exactly once per tick — putting it inside a setState updater is the mistake documented in
        // tasks/lessons.md, where StrictMode's second pass ran the same side effect again.
        setNewBest(submitBest(w.score));
        go('over');
        play('lose');
      } else {
        dockBall(w);
        play('lose');
      }
    }

    const ui = uiRef.current;
    if (ui.score !== w.score) { ui.score = w.score; setScore(w.score); }
    if (ui.lives !== w.lives) { ui.lives = w.lives; setLives(w.lives); }
    if (ui.level !== w.level) { ui.level = w.level; setLevel(w.level); }
  }, [play, submitBest, go]);

  useGameLoop(step, STEP_MS, status === 'playing' && !isMinimized);

  // ── Render ────────────────────────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // The view is re-checked every frame rather than trusted to ResizeObserver alone. Two cases the
    // observer cannot cover: dragging the window to a display with a different density changes
    // devicePixelRatio without changing any element's size, so no notification is ever raised; and
    // an environment that does not deliver observer callbacks at all would otherwise leave cssW at
    // 0 forever and the board would simply never paint. Reading clientWidth here is a clean layout
    // read — nothing in the draw loop writes layout, so it cannot thrash.
    const seen = viewRef.current;
    if (
      canvas.clientWidth !== seen.cssW
      || canvas.clientHeight !== seen.cssH
      || Math.min(window.devicePixelRatio || 1, 3) !== seen.dpr
    ) resizeCanvas();
    if (viewRef.current.cssW < 1) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pal = palette();
    const w = worldRef.current;
    const v = viewRef.current;

    ctx.setTransform((v.dpr * v.cssW) / WORLD_W, 0, 0, (v.dpr * v.cssH) / WORLD_H, 0, 0);
    ctx.clearRect(0, 0, WORLD_W, WORLD_H);

    ctx.fillStyle = pal.sunken;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    const wash = ctx.createLinearGradient(0, 0, 0, WORLD_H);
    wash.addColorStop(0, pal.accentAt(0.12));
    wash.addColorStop(0.6, pal.accentAt(0));
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);

    // The line the ball must not cross, so the danger zone is legible rather than implied.
    ctx.strokeStyle = pal.hairline;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, PADDLE_Y + PADDLE_H + 9);
    ctx.lineTo(WORLD_W, PADDLE_Y + PADDLE_H + 9);
    ctx.stroke();

    for (const b of w.bricks) {
      if (!b.alive) continue;
      ctx.globalAlpha = b.shade;
      ctx.fillStyle = rowColour(pal, b.row);
      roundedPath(ctx, b.x, b.y, b.w, b.h, 2.5);
      ctx.fill();
      // A lit top edge reads as a bevel and keeps adjacent rows separable even when two roles in a
      // colorway sit close together in hue.
      ctx.globalAlpha = 0.3 * b.shade;
      ctx.fillStyle = pal.ink;
      roundedPath(ctx, b.x + 1.2, b.y + 1.2, b.w - 2.4, b.h * 0.34, 1.5);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const p of w.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max) * 0.85;
      ctx.fillStyle = rowColour(pal, p.row);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (let i = 0; i < w.trail.length; i++) {
      const t = w.trail[i];
      const k = (i + 1) / w.trail.length;
      ctx.fillStyle = pal.accentAt(0.3 * k * k);
      ctx.beginPath();
      ctx.arc(t.x, t.y, BALL_R * (0.35 + 0.6 * k), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowColor = pal.accent;
    ctx.shadowBlur = 12;
    ctx.fillStyle = pal.ink;
    ctx.beginPath();
    ctx.arc(w.ball.x, w.ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();

    const half = w.paddle.w / 2;
    roundedPath(ctx, w.paddle.x - half, PADDLE_Y, w.paddle.w, PADDLE_H, PADDLE_H / 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // The centre stripe is not decoration: it marks the neutral point of the deflection model, so a
    // player can see where to stand to send the ball straight back up.
    ctx.fillStyle = pal.accent;
    roundedPath(ctx, w.paddle.x - w.paddle.w * 0.11, PADDLE_Y + 2, w.paddle.w * 0.22, PADDLE_H - 4, 2);
    ctx.fill();

    ctx.textAlign = 'center';
    if (w.banner > 0) {
      ctx.globalAlpha = Math.min(1, w.banner / 0.4);
      ctx.fillStyle = pal.accent;
      ctx.font = 'bold 22px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(`LEVEL ${w.level}`, WORLD_W / 2, WORLD_H * 0.44);
      ctx.globalAlpha = 1;
    } else if (w.ball.docked && statusRef.current === 'playing') {
      ctx.fillStyle = pal.sec;
      ctx.font = 'bold 9px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText('DRAG TO AIM  ·  TAP OR SPACE TO LAUNCH', WORLD_W / 2, PADDLE_Y - 22);
    }

    if (w.flash > 0) {
      ctx.globalAlpha = w.flash * 0.22;
      ctx.fillStyle = pal.alert;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
      ctx.globalAlpha = 1;
    }
  }, [palette, resizeCanvas]);

  // Rendering is its own rAF rather than a call at the end of `step`. The physics runs at 120Hz and
  // the display usually does not, so drawing from the step would paint twice per frame on a 60Hz
  // panel; and the board still has to repaint while paused or on the game-over screen, when no
  // physics step is running at all.
  useEffect(() => {
    if (isMinimized) return undefined;
    let raf = requestAnimationFrame(function frame() {
      raf = requestAnimationFrame(frame);
      draw();
    });
    return () => cancelAnimationFrame(raf);
  }, [draw, isMinimized]);

  const headerExtra = (
    <div className="flex items-center gap-3 md:gap-4">
      <div className="text-right">
        <p className="text-[9px] font-black text-sdl-sec uppercase tracking-[0.2em] leading-none">Level</p>
        <p className="text-lg md:text-xl font-black tabular-nums leading-tight text-os-secondary">{level}</p>
      </div>
      <div className="flex items-center gap-1" role="img" aria-label={`${lives} lives remaining`}>
        {Array.from({ length: LIVES }, (_, i) => (
          <span
            key={i}
            className={`w-2 h-2 rounded-full transition-opacity duration-hover ${
              i < lives ? 'bg-os-tertiary' : 'bg-veil/20'
            }`}
          />
        ))}
      </div>
    </div>
  );

  return (
    <GameShell
      gameId="breakout"
      onBack={onBack}
      score={score}
      best={best}
      status={status}
      onRestart={restart}
      onTogglePause={togglePause}
      boardProps={{ ...inputProps, onKeyUp: handleKeyUp, onBlur: handleBlur }}
      headerExtra={headerExtra}
      overlay={
        <>
          <Trophy size={44} className="text-os-secondary mb-4" />
          <h2 className="text-2xl font-black italic uppercase tracking-tighter">Game Over</h2>
          <p className="text-sdl-sec text-[10px] font-black uppercase tracking-[0.25em] mt-2">
            Level {level} · {score} points
          </p>
          {newBest && (
            <p className="text-os-primary text-[10px] font-black uppercase tracking-[0.25em] mt-1">
              New personal best
            </p>
          )}
          <button
            onClick={restart}
            className="mt-6 flex items-center gap-2 px-6 py-3 bg-os-primary text-sdl-onAccent font-black uppercase tracking-widest text-xs rounded-2xl shadow-[var(--sdl-lift)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
          >
            <RefreshCw size={16} />
            Play again
          </button>
        </>
      }
    >
      {/* Width drives the box and aspect-ratio derives the height, so the board can never be taller
          than 64vh and never wider than the phone it is on — 48vh caps it against a short window
          and 88vw against a 375px handset, whichever bites first.

          The frame (border, radius, shadow) lives on this container and NOT on the canvas, so the
          canvas has no border and its content box is its border box. That is what lets the backing
          store match the display area exactly. The canvas also carries its own touch-none:
          touch-action is not inherited from GameShell's wrapper, and without it a drag scrolls the
          window instead of moving the paddle. */}
      <div
        ref={boxRef}
        style={{ width: 'min(88vw, 400px, 48vh)', aspectRatio: '3 / 4' }}
        className="relative overflow-hidden rounded-[1.75rem] border border-hairline/10 bg-sdl-sunken shadow-[var(--sdl-lift)]"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="block w-full h-full touch-none cursor-none"
        />
      </div>
    </GameShell>
  );
};

export default Breakout;
