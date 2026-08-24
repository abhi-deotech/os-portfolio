import { useEffect, useRef } from 'react';

/**
 * A fixed-timestep game loop on requestAnimationFrame.
 *
 * Replaces the `setInterval(moveSnake, speed)` pattern, which had three problems worth naming:
 *
 *   1. `setInterval` drifts and is throttled hard in background tabs, so a game left in an
 *      unfocused window would either stutter or fire a burst of queued ticks on return.
 *   2. The interval was rebuilt whenever its callback identity changed. With `score` in the
 *      dependency array that meant tearing down and recreating the timer on every point scored.
 *   3. Nothing paused. The old code gated the interval on a focus flag, so the board simply
 *      froze with no indication it had stopped.
 *
 * The accumulator decouples simulation rate from frame rate: `step` is called a whole number of
 * times per frame based on elapsed real time, so a 144Hz monitor and a 60Hz monitor advance the
 * game at the same speed. `stepMs` may change between renders (Snake speeds up as it grows)
 * without restarting anything.
 *
 * @param {(n: number) => void} step   advance the simulation one tick; receives the tick index
 * @param {number} stepMs              ms of game time per tick
 * @param {boolean} running            false pauses the loop and freezes the accumulator
 */
export default function useGameLoop(step, stepMs, running) {
  const stepRef = useRef(step);
  const stepMsRef = useRef(stepMs);

  // Synced after every render (no dependency array) rather than assigned during render, so the
  // loop always calls the newest closure without the effect below re-running. Assigning a ref in
  // the render body is what React's refs rule forbids, and it is genuinely unsafe under
  // concurrent rendering, where a render can be thrown away after the assignment has happened.
  useEffect(() => {
    stepRef.current = step;
    stepMsRef.current = stepMs;
  });

  useEffect(() => {
    if (!running) return undefined;

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let ticks = 0;

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      // Clamped so a backgrounded tab returning after 30s does not run 200 ticks in one frame
      // and kill the snake instantly. Dropping that time is the honest behaviour: the game was
      // not being watched, so it should not have advanced.
      const delta = Math.min(now - last, 250);
      last = now;
      acc += delta;

      const ms = stepMsRef.current;
      while (acc >= ms) {
        acc -= ms;
        stepRef.current(ticks++);
      }
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [running]);
}
