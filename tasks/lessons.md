# Lessons

## Deferring a side effect to a microtask does NOT make a state updater pure

**Context:** 2048 double-counted its score. The cause was `setScore` / `localStorage.setItem` /
`unlockAchievement` being called from inside the `setGrid(prev => …)` updater. StrictMode is on
(`src/main.jsx:13`) and deliberately invokes updaters twice.

**The mistake:** the first fix wrapped those effects in `queueMicrotask(...)` while leaving the
call inside the updater. That looks like it defers the side effect past the render phase — and it
does — but the *scheduling* still runs twice, and so does the `scoreRef.current = newScore`
mutation feeding it. Nothing improved. Measured after the "fix": one move merging a single pair of
2s scored **8** instead of 4.

**The rule:** if a line sits lexically inside a state-updater function, StrictMode runs it twice —
`queueMicrotask`, `setTimeout`, ref mutations, all of it. Deferring *when* the effect lands does
not change *how many times* it is scheduled. The fix is to compute from a ref and do the work in
the event handler, where StrictMode does not re-invoke:

```js
// wrong — runs twice under StrictMode, even with the microtask
setGrid(prev => { const next = f(prev); queueMicrotask(() => setScore(s + n)); return next; });

// right — event handlers are invoked once
const next = f(gridRef.current);
gridRef.current = next; setGrid(next); setScore(scoreRef.current + n);
```

**How to apply:** when you see a side effect inside a `setX(prev => …)`, don't defer it — lift it
out entirely, mirroring the state in a ref if the handler needs the previous value. Then verify
with a *numeric* assertion (score delta === expected), not by eyeballing the UI. The doubling was
invisible on screen; only comparing an exact expected delta caught it.

## Verify a claimed fix against the same harness that proved the bug

The 2048 direction bug was proved by differential-testing the shipped `applyMove` against an
independent reference implementation over 800k random moves. Re-running that exact harness after
the fix (0/800,000 mismatches) is what made "fixed" a measurement rather than an assertion. Extract
the real source into the harness — don't retype the logic, or you test your copy, not the code.

## The preview pane does not composite, so rAF never fires

Measured: `visibilityState: "hidden"`, **0 requestAnimationFrame callbacks in 1500ms**. Anything
driven by rAF — the canvas games, `useGameLoop`, every framer-motion transition — simply does not
advance in the Browser pane. That explains a whole class of confusing symptoms: a canvas whose
backing store is never sized, a board that never paints, an `AnimatePresence` exit that never
completes, a login screen that will not advance past a button click.

**How to apply:** before concluding "the canvas game is broken", check whether rAF is running at
all. If it isn't, the visual layer cannot be verified here — say so plainly rather than claiming
it works or that it's broken. Verify the *logic* headlessly instead: extract the pure functions
into a Node harness (as done for the 2048 direction map, the Sudoku generator's uniqueness, and
Minesweeper's first-click safety) and assert on numbers. That is stronger evidence than looking at
a screenshot anyway.

Note that `setTimeout` is throttled but not stopped, so multi-step DOM tests still work — they are
just far slower than the delays you asked for. Budget for it or the tool call times out.

## Don't trust the DOM for game state in a non-compositing preview

The Browser pane doesn't composite frames, so framer-motion exit animations never complete and
removed elements linger. Reading the board from the DOM showed tiles in their *old* positions
alongside their new ones, which looked exactly like a broken move. Reading React's
`memoizedState` off the fiber gave the true grid. When animation and truth disagree in a headless
preview, the animation is lying.
