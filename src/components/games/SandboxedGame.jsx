import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2, RefreshCw, ShieldAlert, Trophy } from 'lucide-react';
import GameShell from './GameShell';
import useHighScore from '../../hooks/useHighScore';
import { getGamePayload } from '../../store/slices/gamesSlice';

/**
 * Host for games that are not first-party React components: folder games under public/games/
 * and HTML files the visitor sideloaded.
 *
 * SECURITY
 *
 * The frame is `sandbox="allow-scripts"` WITHOUT `allow-same-origin`, which gives the document an
 * opaque security origin. Measured from inside such a frame in this app: scripts and canvas work
 * normally, while `localStorage` and `parent.location` both throw SecurityError. So a hosted game
 * cannot read or write the OS's own persisted state.
 *
 * Note that `location.origin` still REPORTS the real origin string — it reflects the URL, not the
 * security origin. Do not use it to decide whether the sandbox is active; the storage and parent
 * accesses are what actually prove it.
 *
 * This is strictly stronger than what the app did before: the old RetroArcade iframe had NO
 * sandbox attribute at all and executed code fetched from two CDNs with full same-origin access
 * to `os-settings`.
 *
 * `srcdoc` rather than a blob: URL, because blob stores are origin-partitioned and an
 * opaque-origin frame cannot dereference a blob minted by its parent.
 *
 * Messages are validated on `event.source` identity. Origin checks are useless here — an opaque
 * origin reports itself as "null", which is exactly what a hostile frame would also report.
 */

const NS = 'lumina-game';

/**
 * Injected ahead of the game's own scripts. An opaque-origin frame THROWS on localStorage
 * access rather than returning null, so any game that so much as reads a saved setting would
 * die on load with an uncaught SecurityError. This shims a same-shaped in-memory store; the game
 * keeps working and simply does not persist across sessions.
 */
const SHIM = `<script>
(function () {
  var mem = {};
  var fake = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
    setItem: function (k, v) { mem[k] = String(v); },
    removeItem: function (k) { delete mem[k]; },
    clear: function () { mem = {}; },
    key: function (i) { return Object.keys(mem)[i] || null; }
  };
  Object.defineProperty(fake, 'length', { get: function () { return Object.keys(mem).length; } });
  try { localStorage.getItem('probe'); } catch (e) {
    try { Object.defineProperty(window, 'localStorage', { value: fake, configurable: true }); } catch (e2) {}
    try { Object.defineProperty(window, 'sessionStorage', { value: fake, configurable: true }); } catch (e2) {}
  }
  window.lumina = {
    score: function (v) { parent.postMessage({ ns: '${NS}', v: 1, type: 'score', value: v }, '*'); },
    gameOver: function (v) { parent.postMessage({ ns: '${NS}', v: 1, type: 'gameover', value: v }, '*'); },
    ready: function () { parent.postMessage({ ns: '${NS}', v: 1, type: 'ready' }, '*'); }
  };
  window.addEventListener('load', function () { window.lumina.ready(); });
}());
</script>`;

/** Injected after the shim so a bare game still fills the frame. */
const BASE_CSS = `<style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#000}canvas{display:block;max-width:100%;max-height:100%}</style>`;

function wrap(html) {
  // Ahead of <head>'s contents where possible, so the shim beats the game's own scripts.
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head([^>]*)>/i, `<head$1>${SHIM}${BASE_CSS}`);
  if (/<html[^>]*>/i.test(html)) return html.replace(/<html([^>]*)>/i, `<html$1><head>${SHIM}${BASE_CSS}</head>`);
  return `<!doctype html><html><head>${SHIM}${BASE_CSS}</head><body>${html}</body></html>`;
}

const SandboxedGame = ({ gameId, entry, onBack, title }) => {
  const [html, setHtml] = useState(null);
  // Only tracks the sideload fetch. A folder game has a URL and needs no fetch at all, so its
  // readiness is derived below rather than driven through state — setting state from an effect
  // just to say "nothing to load" is a wasted render.
  const [loadState, setLoadState] = useState('loading'); // loading | ready | error
  const status = entry ? 'ready' : loadState;
  const [error, setError] = useState('');
  const [score, setScore] = useState(0);
  const [runOver, setRunOver] = useState(false);
  const [isRecord, setIsRecord] = useState(false);
  const [nonce, setNonce] = useState(0);
  const frameRef = useRef(null);
  // Mirrors for the message listener, which subscribes once: reading `score` state there would be
  // stale, and re-subscribing per point scored just to see it is the alternative nobody wants.
  const scoreRef = useRef(0);
  const overRef = useRef(false);
  // useHighScore takes any string key — folder slugs and minted 'user:…' ids land in the same
  // 'lumina-game-stats' map as the builtins — and the default 'max' direction fits the bridge,
  // whose contract only speaks "higher score".
  const [best, submitBest] = useHighScore(gameId);

  useEffect(() => {
    // A folder game is served from a real URL and loads via `src`, NOT srcdoc. Both are equally
    // sandboxed — `allow-scripts` without `allow-same-origin` gives an opaque origin either way —
    // but a srcdoc document has no base URL, so every relative `<script src='game.js'>` and
    // `<img src='sprites.png'>` in a vendored game would fail to resolve. With `src` the document
    // URL is /games/<slug>/index.html and relative paths work normally.
    if (entry) return undefined;

    // A sideloaded game has no URL — it is a string in IndexedDB — so srcdoc is the only option,
    // and it must be self-contained. That constraint is enforced at upload time.
    // No setLoadState('loading') here — it already starts as 'loading', and Restart resets it
    // from its own click handler. Setting it synchronously in the effect would just cascade an
    // extra render on mount.
    let cancelled = false;
    getGamePayload(gameId)
      .then((payload) => {
        if (cancelled) return;
        if (!payload) throw new Error('This game is no longer in storage.');
        setHtml(wrap(payload));
        setLoadState('ready');
      })
      .catch((e) => {
        if (!cancelled) { setError(e.message || String(e)); setLoadState('error'); }
      });
    return () => { cancelled = true; };
  }, [gameId, entry, nonce]);

  /**
   * The parent's half of the window.lumina contract (see SHIM above). 'score' streams the running
   * total; 'gameover' ends the run, optionally carrying a final score; 'ready' is fire-and-forget.
   * Until now only 'score' was handled, so the bridge advertised a game-over flow that dead-ended:
   * the frame said the run was over and the shell kept insisting status="playing" with best={null}.
   */
  useEffect(() => {
    const onMessage = (event) => {
      // Identity, not origin — see the note at the top of this file.
      if (!frameRef.current || event.source !== frameRef.current.contentWindow) return;
      const d = event.data;
      if (!d || d.ns !== NS || d.v !== 1) return;
      // A finished run accepts nothing further until Restart reloads the frame. Without this gate
      // a game that keeps ticking — or a hostile frame spamming 'gameover' — could rewrite the
      // final score behind the overlay or hammer localStorage through submitBest.
      if (overRef.current) return;
      if (d.type === 'score') {
        const n = Number(d.value);
        // Clamped: a hostile or buggy frame must not put Infinity or NaN into the UI.
        if (Number.isFinite(n)) {
          const v = Math.max(0, Math.min(n, 1e9));
          scoreRef.current = v;
          setScore(v);
        }
      } else if (d.type === 'gameover') {
        // `value` is optional: a game that only ever streamed 'score' may end the run bare, and
        // the last streamed total stands as the final.
        const n = Number(d.value);
        const final = Number.isFinite(n) ? Math.max(0, Math.min(n, 1e9)) : scoreRef.current;
        scoreRef.current = final;
        overRef.current = true;
        setScore(final);
        // Persisted from the event listener, never a setState updater — listeners run once per
        // message, updaters twice under StrictMode (tasks/lessons.md). submitBest also settles
        // "is it a record" against localStorage itself, so no comparison happens here.
        setIsRecord(submitBest(final));
        setRunOver(true);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [submitBest]);

  // One reset for the toolbar Restart and the overlay's button. Remounting the iframe (nonce is
  // its `key`) is the only way to restart a document we cannot reach into — the sandbox denies
  // same-origin access in both directions, which is the point of it.
  const restart = useCallback(() => {
    scoreRef.current = 0;
    overRef.current = false;
    setScore(0);
    setRunOver(false);
    setIsRecord(false);
    setError('');
    if (!entry) setLoadState('loading');
    setNonce((n) => n + 1);
  }, [entry]);

  return (
    <GameShell
      gameId={gameId}
      onBack={onBack}
      score={score}
      best={best}
      status={runOver ? 'over' : 'playing'}
      onRestart={restart}
      overlay={
        <>
          <Trophy size={40} className="text-os-secondary mb-3" />
          <h2 className="text-xl font-black italic uppercase tracking-tighter">Game over</h2>
          <p className="text-sdl-sec text-[10px] font-black uppercase tracking-[0.25em] mt-2">
            {score} points{best != null ? ` · best ${best}` : ''}
          </p>
          {isRecord && (
            <p className="text-os-primary text-[10px] font-black uppercase tracking-[0.25em] mt-1">
              New personal best
            </p>
          )}
          <button
            onClick={restart}
            className="mt-6 flex items-center gap-2 px-6 py-3 bg-os-primary text-sdl-onAccent font-black uppercase tracking-widest text-xs rounded-2xl shadow-[var(--sdl-lift)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
          >
            <RefreshCw size={16} />
            Restart
          </button>
        </>
      }
      headerExtra={
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-sdl-sunken border border-hairline/10">
          <ShieldAlert size={12} className="text-sdl-sec shrink-0" />
          <span className="text-[9px] font-bold text-sdl-sec uppercase tracking-wider hidden sm:inline">
            Sandboxed
          </span>
        </div>
      }
    >
      <div className="relative w-[min(88vw,900px)] h-[min(70vh,620px)] rounded-2xl overflow-hidden border border-hairline/10 bg-sdl-sunken">
        {status === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Loader2 size={32} className="text-os-primary animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-sdl-sec">Loading {title}</p>
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
            <AlertCircle size={32} className="text-sdl-alert" />
            <p className="font-bold text-sdl-ink">Could not load this game</p>
            <p className="text-sdl-sec text-xs max-w-xs">{error}</p>
          </div>
        )}
        {status === 'ready' && (entry || html) && (
          <iframe
            key={nonce}
            ref={frameRef}
            {...(entry ? { src: entry } : { srcDoc: html })}
            sandbox="allow-scripts"
            className="w-full h-full border-0 block"
            title={title || gameId}
          />
        )}
      </div>
    </GameShell>
  );
};

export default SandboxedGame;
