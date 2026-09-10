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

## A metric that condemns everything is a broken metric, not a strict one

Curating "Surprise Me" needed a rule for which wallpaper/colorway pairs look bad. The first two
attempts both measured contrast, and both were wrong in instructive ways.

**Attempt 1 — measuring a surface that isn't there.** Desktop icon labels are `--sdl-ink` drawn
over the wallpaper, so ink-vs-wallpaper contrast looked like the obvious metric. It reported 33 of
80 pairs below 3:1. But `Desktop.jsx:22-26` stacks a three-layer `plane`-coloured halo behind every
label precisely so it survives an arbitrary photo. The labels were never the problem, and the
number overstated it badly. **Read how the surface is actually painted before measuring it.**

**Attempt 2 — a metric with no discrimination.** Switching to the genuinely unhaloed surface (the
app icon glyph) and taking the worst case over 19 hues x every gradient stop reported **79 of 80**
pairs failing. That should have been the tell: the user's report was "most rolls are fine, a few
are bad". A metric that flags 99% cannot be encoding what they were reacting to, and shipping it
would have banned the entire wallpaper library.

**What worked** was three cheap measurements that match how the clash is actually perceived —
tonal polarity (wallpaper luminance vs the colorway's plane), hue distance from the accent, and
chroma relative to the accent. Those flagged a minority, and the ones they flagged were nameable:
Rose Dusk under a green-cyan gradient, a near-black wallpaper under a paper-white shell.

**How to apply:** before adopting a rule, check its flag RATE against the reported symptom. Too
many hits means the metric is measuring the wrong thing, exactly as surely as too few. Do that
check before writing the filter, not after — both wrong metrics here survived being "measured, not
guessed", which is a weaker guarantee than it sounds.

## When consolidating scattered facts, every value is suspect — including the ones you keep

**Context:** SocialWidget's LinkedIn tab was fabricated, so the fix was a single source of truth in
`src/config/profile.js`. I diffed the widget against `AboutMe.jsx` and `public/resume.txt`, found
the contradictions (Noida vs Kota, invented AWS/MongoDB skills), and resolved each one carefully.

**The mistake:** values that did *not* contradict got copied across unexamined. `twitter:
'abhi_deotech'` and `email: 'contact@abhi.dev'` appeared in exactly one place each, so nothing
flagged them — and both were wrong. The owner had to correct them. The Twitter handle was
`TrippySaxena`; the email address did not exist at all, and had been shipping as a live `mailto:`
in AboutMe's social row.

**Why the method missed it:** cross-referencing only detects DISAGREEMENT. A fact stated once, or
stated identically in two files because one was copy-pasted from the other, is invisible to it. The
premise of the task was "this file is full of invented data" — which makes every uncorroborated
value a suspect, not just the mismatched ones.

**How to apply:** when consolidating, sort fields into *corroborated by an independent source* and
*asserted once*. Resolve the contradictions, then explicitly hand the single-source list back to
the owner to confirm, rather than promoting it silently. For anything externally checkable, check
it: a GitHub handle and a LinkedIn vanity URL can be fetched; an email cannot, so it must be asked.
Cheaper than shipping a dead `mailto:` on the page whose entire job is to be believed.

Related: the same pass found `AboutMe.jsx` publishing a full home street address, and a token-less
`npm run build` silently nulling the contribution data it had just fetched. Neither was in scope,
neither was visible on screen, and both were found by reading the data rather than the layout.

---

## Re-run the build after the LAST edit, not the last-but-three

**Context:** building the menu bar. I wrote `MenuBar.jsx`, ran `eslint` and `npm run build` — both
clean, 3823 modules — then captured a screenshot that showed it rendering correctly. Then I made
three follow-up edits to swap hand-rolled `bg-veil/10 backdrop-blur` for the `glass` role token,
and went straight back to screenshotting.

**The mistake:** one of those three edits put a JSX comment as a sibling *before* the root element
inside `return (`, which is a parse error. The dev server had been serving a broken module ever
since. I did not re-run the build, because I had already "verified" the file — against a version
that no longer existed.

**What made it expensive:** the failure surfaced as `scripts/shot.mjs` reporting *"store instance
is not the one React subscribed to"*. That message points at Vite HMR module forking, so I spent
two full server restarts and a port change chasing a Vite problem. I even hypothesized that my
`?raw` change had restructured the module graph. The actual cause was that the app never mounted,
so nothing ever subscribed — the guard was reporting a true fact with a misleading explanation.

**How to apply:** the verification that counts is the one run against the bytes currently on disk.
After the final edit in a sequence, re-run the gate before drawing any conclusion from a screenshot
or a probe — and re-run it *first* when a tool starts reporting something structurally odd. When a
diagnostic names a cause, treat the name as a hypothesis and check the cheap one (does it compile?
did it mount?) before accepting the sophisticated one. `preview_logs` had the exact parse error and
line number the whole time; I read it only after two restarts.

**Also:** when a hand-rolled `bg-*/N backdrop-blur-* border-*` triple goes into a themed app, check
for an existing role token first. This project has `.glass` / `.glass-2`, created specifically to
collapse that pattern from ~386 sites, and they invert correctly in light mode — which the
hand-rolled version did not, rendering the dropdown nearly transparent over a light wallpaper.

---

## New chrome has a blast radius: audit everything positioned against the viewport

**Context:** adding the menu bar. I mounted it as the first flex child of the App shell and verified
the Desktop layer shifted down correctly — measured `firstIconTop: 68` against a 28px bar, no
overlap, done. Except it wasn't: the owner sent a screenshot of a maximized Notepad with its traffic
lights sliced in half by the bar.

**The mistake:** I verified the layer that participates in the flex column, and assumed that covered
everything. Maximized and edge-snapped windows are `position: fixed` — they measure from the
viewport, not from the flex column, so they never saw the bar at all and kept starting at `y=0`.
The bar's `z-80` then painted over the window's `z-50` title bar. The desktop icons moved; the
windows didn't; only one of those got checked.

**Second-order, found only because I re-measured after "fixing" it:** setting `top` was not enough.
The window's height was declared in *two* places that disagreed — inline `style` said
`calc(100vh - 28px)`, the Framer `animate` target said a flat `height: '100%'` — and animate wins.
So the window started in the right place and then overshot the bottom of the screen by exactly the
height of the bar it was supposed to clear. The same latent disagreement had been making mobile
windows 80px too tall for as long as both lines existed.

**How to apply:** when introducing a persistent piece of chrome, grep for what is positioned against
the viewport rather than the layout — `position: fixed`, `100vh`, `inset-0`, `top-0` — and check
each one, including the transient ones (the drag-to-snap preview was wrong too, and only appears
mid-gesture). Then export the size as a named constant and have every consumer read it; three
hard-coded `28`s is the same bug waiting to reappear. And when an element's geometry is set in both
`style` and an animation target, reconcile them to one value — the animation silently wins, so the
style you are reading in the source may not be the one on screen.

**On measurement:** the first probe I wrote reported `windowTop: 0, overlapsBar: true` *after* the
fix, and I nearly concluded the fix hadn't applied. It had — my selector had matched the
full-viewport Widgets overlay instead of the window. `trafficLightTops: []` was the tell that the
element was wrong. Check that a probe found what it claims to have found before trusting its number.
