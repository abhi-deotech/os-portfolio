import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import './relief.css';
import useOSStore from '../../store/osStore';
import useMinuteClock from '../../hooks/useMinuteClock';
import useContextualScene from '../../wallpaper/useContextualScene';
import { lightStyleVars } from '../../wallpaper/solar';
import ChronoRelief from './relief/ChronoRelief';
import TopoRelief from './relief/TopoRelief';
import FocusPrism from './relief/FocusPrism';

/**
 * The stage the faux-3D relief wallpapers stand on.
 *
 * Owns everything the three scenes share: the minute clock, the light vector stamped on the root as
 * custom properties (relief.css reads them), the context a scene may show, the composition box, and
 * pointer parallax. A scene only draws.
 *
 * Loaded lazily by LiveWallpaper, so none of this — nor the scenes — is in the entry chunk.
 *
 * Cost: in passive Plash mode (`interactive` false) nothing runs between minute ticks — no frame
 * loop, no pointer listener, no observer; only the minute clock and a resize listener. Parallax exists only when the page can be pointed at,
 * performance mode is off and motion is not reduced, and even then it is one frame per burst of
 * pointer events, easing home through relief.css's transition once the pointer rests. The layers are
 * promoted (data-tilting) only from the first move until that rest, never for the whole session.
 */

const SCENES = { chrono: ChronoRelief, topo: TopoRelief, prism: FocusPrism };

/** No movement for this long and the tilt eases back to level. */
const REST_MS = 1200;

function useViewport() {
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return size;
}

/* Settings → Reduce motion lands as <html data-motion>; observed, so a change applies live. */
const subscribeMotion = (onChange) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
  return () => observer.disconnect();
};
const subscribeNever = () => () => {};
const motionReduced = () => document.documentElement.dataset.motion === 'reduced';

const clampUnit = (v) => Math.max(-1, Math.min(1, v));

const Faux3DStage = ({ scene, interactive = true, area = null, prefs = null }) => {
  const now = useMinuteClock();
  const ctx = useContextualScene({ now, scene, place: prefs?.place ?? null, calKey: prefs?.calKey ?? '' });
  const { w, h } = useViewport();
  const lowPerformance = useOSStore((s) => s.lowPerformance);
  // Only watched when parallax could run at all: in passive Plash mode there is nothing to switch off.
  const reduced = useSyncExternalStore(interactive ? subscribeMotion : subscribeNever, motionReduced);
  const rootRef = useRef(null);

  // The focal centre is the empty work area's in wallpaper mode (left of the widget column), and
  // just above the screen's middle on the desktop. Whole pixels, so a new `area` object on every
  // host render does not reshape anything that has not moved. The radius is at least 1: a collapsed
  // work area (a window narrower than the widget column) would otherwise divide 0 by 0 in a scene.
  const aLeft = area?.left;
  const aTop = area?.top;
  const aWidth = area?.width;
  const aHeight = area?.height;
  const box = useMemo(() => {
    const hasArea = Number.isFinite(aLeft) && Number.isFinite(aWidth);
    return {
      w,
      h,
      cx: Math.round(hasArea ? aLeft + aWidth / 2 : w * 0.5),
      cy: Math.round(hasArea ? aTop + aHeight / 2 : h * 0.48),
      r: Math.max(1, Math.round(0.38 * Math.min(hasArea ? aWidth : w, hasArea ? aHeight : h))),
    };
  }, [w, h, aLeft, aTop, aWidth, aHeight]);

  const sceneCtx = useMemo(
    () => ({ weather: ctx.weather, todoRatio: ctx.todoRatio, focusText: ctx.focusText, agenda: ctx.agenda }),
    [ctx.weather, ctx.todoRatio, ctx.focusText, ctx.agenda],
  );
  const lightVars = useMemo(() => lightStyleVars(ctx.light), [ctx.light]);

  const parallax = interactive && !lowPerformance && !reduced;

  useEffect(() => {
    const el = rootRef.current;
    if (!parallax || !el) return undefined;
    let frame = 0;
    let rest = 0;
    let px = box.cx;
    let py = box.cy;
    const tilt = (x, y) => {
      el.style.setProperty('--tilt-x', x.toFixed(3));
      el.style.setProperty('--tilt-y', y.toFixed(3));
    };
    // Set on the DOM, not through state: a pointer burst must not re-render the scene.
    const tilting = (on) => { el.dataset.tilting = on ? 'on' : 'off'; };
    const onMove = (e) => {
      px = e.clientX;
      py = e.clientY;
      if (!rest) tilting(true);
      // At most one frame per burst: further events before it runs only move the target.
      if (!frame) {
        frame = requestAnimationFrame(() => {
          frame = 0;
          tilt(clampUnit((px - box.cx) / (box.w / 2)), clampUnit((py - box.cy) / (box.h / 2)));
        });
      }
      clearTimeout(rest);
      rest = setTimeout(() => {
        rest = 0;
        tilt(0, 0);
        tilting(false);
      }, REST_MS);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
      clearTimeout(rest);
      tilt(0, 0);
      tilting(false);
    };
  }, [parallax, box]);

  // An empty viewport (a hidden or collapsing window) has nothing to draw, and would divide by 0.
  const Scene = w > 0 && h > 0 ? SCENES[scene] : null;

  return (
    <div
      ref={rootRef}
      className="relief-stage"
      data-scene={scene}
      // Informational only (relief.css keys on data-tilting, set by the effect above).
      data-parallax={parallax ? 'on' : 'off'}
      aria-hidden="true"
      style={lightVars}
    >
      {/* An unknown scene, or no viewport, leaves the stage floor alone: the colorway's plane. */}
      {Scene && <Scene light={ctx.light} ctx={sceneCtx} now={now} box={box} />}
    </div>
  );
};

export default Faux3DStage;
