# SDL working memory — vibe-os-portfolio (Lumina OS)

Per `sarva-design-language/SKILL.md`: dated entries for proposals, drift observations, and owner
reactions worth remembering. Feeds the consolidation ritual (`EVOLUTION.md`). Nothing here edits SDL
itself — proposals land upstream only during a "consolidate SDL" pass.

---

## 2026-08-14 — full-repo audit: what P0–P8 missed

Full review: `SDL-AUDIT-2026-08-14.md`. Owner asked what else needs attention; six parallel research
passes plus direct verification turned up ~180 findings. Headlines: the `SHELL` list in
`scripts/denylist.mjs` was mistaken for a lint exemption when it's actually a priority TODO —
`ControlCenter.jsx`/`SystemDashboard.jsx`/`SystemMetricsWidget.jsx` were never finished, not
protected. `SystemMetricsWidget.jsx` references three CSS variables (`--blue-500-rgb` etc.) that
don't exist anywhere except as prose inside a stale in-app doc — three of its four metric cards are
silently unstyled. `cv`/`skills` are configured apps with no implementing component. Density and
motion-tempo tokens are fully built and correctly derived but consumed almost nowhere outside
`src/theme/` itself. `--sdl-alert/warn/done` exist and are used almost nowhere — every error/success
state in the app reaches for stock Tailwind red/green instead. Keyboard-focus coverage is ~15-20%,
concentrated in five files; the Games launcher cards are not reachable by keyboard at all. Two prior
entries below turned out to understate reality: focus-ring alpha is two numbers (.45 dark / .40
light), not one "~45%"; only Garden Dawn of the four Botanical colorways actually has a `wash`
field, the other three ship plane-only.

**All of the above is now fixed** — see the Resolution section at the foot of the audit for what
shipped, what was deliberately left as content, and the seven items still genuinely open.

### The finding worth carrying upstream: a role can be right and still be wrong

Three separate defects in this pass were the same shape — a token applied where its *contract* did
not hold, while the token's own value was correct:

- `text-sdl-onAccent` on a `bg-white` surface. `onAccent` is DEFINED by measuring contrast against
  the **accent**; on white it means nothing. (Five sites, incl. the login CTA.)
- `shadow-sdl-ink/50` for a drop shadow. `ink` is near-white in every dark colorway, so a shadow
  became a white halo.
- `sdl-done` on an earned achievement. The role is a neutral grey per law 10 — right for *status* in
  a data context, where green-beside-red is the anti-pattern. On a gamification badge it made the
  completed row the dullest on the panel, weaker than the unfinished ones, i.e. it read as disabled.

None of these is catchable by a linter or by the contrast probe: the measurement is right, but it
was taken against a surface the value never lands on. This is the same gap that produced the icon
system's `bare` channel in P8 (Solid's ink reads inside its tile, not on the bare dock).

> **Proposal:** SDL role definitions should name the SURFACE or SITUATION a role is measured
> against, not only its value. `onAccent` in particular reads like a generic "ink for coloured
> fills" and is not one. Roles whose correctness is contextual need that context in the contract,
> or every consumer re-derives it — and some of them will get it wrong.

---

## 2026-08-13 — SDL adopted wholesale (P0–P7 shipped)

Full review: `SDL-DESKTOP-REVIEW.md`. 16 colorways now ship (SDL's 15 + a preserved legacy pack),
light and dark, with the shell and all 18 apps migrated onto roles.

### The finding that reframed the project

**The design-token layer had never worked.** `tailwind.config.js` emitted
`rgb(var(--os-primary-rgb) / <alpha-value>)` against COMMA-separated triples, producing
`rgb(204, 151, 255 / 1)` — invalid in both the legacy and modern `rgb()` grammars, so the declaration
was dropped. Even `.bg-os-primary` with no opacity modifier rendered transparent. **778 call sites.**

Verified in-browser, not inferred:
```
--os-primary-rgb   → "204, 151, 255"      (the var IS defined)
.bg-os-primary     → rgba(0, 0, 0, 0)     ← dead
.bg-white/5        → rgba(255,255,255,.05) ← works, which is why it was everywhere
```

That is the origin of this codebase's 925 white/black literals and 327 hardcoded hexes. They were
**compensation**, not sloppiness. Anyone who reached for a token got nothing and fell back to
`#cc97ff` or `bg-white/5`. Worth carrying upstream as a caution: *a silently-broken token layer
doesn't look broken, it looks like a team with bad discipline.*

### Measured evidence

| | this project (before) | SDL locked dark colorways |
|---|---|---|
| accent HSL saturation | **100%** — all four presets | 46–82% |
| peak accent rel. luminance | **0.678** (`#00f5a0`) | 0.317 (`#ef6f8e`) |

`#00f5a0` is 2.2× the brightest locked accent. Cobalt `#5387ee` was passed *as chrome* at 0.253;
all four legacy presets sit above it. These numbers are computed live in Settings → Design Language
→ Colorways, so they can never drift from the swatches.

### Drift observations — where SDL had to bend

1. **SDL has no rules for a product where the USER owns the plane.** Law 8's atmosphere grammar
   assumes the designer controls the background; this OS hands it to the user via wallpapers. The
   wash renders at `z-index: -21`, below the wallpaper, so a photo legitimately hides it. Resolved
   with a "Colorway" wallpaper that renders nothing. **This is the same root as the focus-ring drift
   below, and is the most generalizable gap found.**
2. **Focus-ring alpha.** SDL says 30%. These rings are the only keyboard affordance and sit on glass
   over user-chosen photos, where 30% can fall under WCAG 1.4.11's 3:1. Holding ~45%.
3. **Panel radius.** SDL runs 12–22px; this shell's signature is a coherent ~40px family and radius
   is not one of the ten laws. Resolved as `radius × 1.8`, so geometry scales *with* the theme rather
   than tracking it — Steel/Carbon stay disciplined, Hearth/Botanical keep the signature.
4. **Motif tiles do not exist.** SDL ships *descriptions* ("dense leaf-vine tile: 8 winding stems,
   ~46 outline leaves, 300px, 16% stroke"), not SVGs. The four Botanical colorways ship
   correct-but-quieter with plane + wash only. **Authoring them needs the owner's eye — the largest
   remaining gap between the skill as written and the skill as implementable.**
5. **`onAccent` is a missing role.** SDL specifies "plane-family ink" for primary buttons, but that
   is inverted for half the lineup: Honey Vivid is a LIGHT colorway whose accent is a DARK teal, so
   plane-family ink on it measured 1.09:1. Implemented by picking whichever of plane/ink has higher
   **measured contrast against the accent**. *Proposal: SDL should name this role explicitly.*

### Upstream desync found (resolved in-app, NOT patched upstream)

`colorways/design-tokens.json` gives Rose Dusk and Garden Dawn `font: "Gill Sans"`, but
`typography/SKILL.md` v1.1.0 — locked **later**, 2026-08-12, after two shopping rounds across 11
faces — records Gill Sans as **REJECTED for titles** and assigns the washed pair Palatino.

Resolution: typography owns typography. The JSON's `font` field is dropped entirely and title faces
derive per-theme. Verified: Rose Dusk renders Palatino. The skill is untouched — a `font` field
change is a grammar change and `EVOLUTION.md` requires an explicit owner lock.

### Migration decision worth recording

Every pre-SDL user migrates to **Lumina Neon (Legacy)**, not to a hue-matched SDL colorway. All four
legacy accents *are* one identity, so mapping them individually would silently change a returning
visitor's look — and `green` has no locked SDL counterpart at all. Legacy preserves exactly what
they had; SDL is opt-in. **Never change a user's mode without them asking** is the general rule.

### What the verification caught that reading could not

- `ACCENT_FILL` matched `bg-white/5`, so inputs carrying a 5% veil were misread as solid fills and
  got dark on-accent text — unreadable on a dark plane.
- `text-sdl-ink/40` on a light plane measured 1.18:1. SDL has exactly two ink roles; an arbitrary
  40% of ink is not one of them. Collapsed to `sec`.
- LoginScreen painted a hardcoded near-black gradient, leaving dark ink on a near-black plane under
  a light colorway (1.5:1).

Final state: **16/16 colorways resolve, 14 fully clean on the contrast probe**, the remaining 2
reporting only a known probe artifact (gradient fills are `background-image`, so the probe measures
the plane behind them — a ratio of exactly 1.00 on a gradient element is that artifact).

Census: white/black literals **927 → 226**, untokenized colour **1325 → 623**, legacy
`rgba(var(--x), N)` **37 → 0**. The remaining 226 are concentrated in media surfaces
(RetroArcade, MediaPlayer, Browser, PhotoViewer) where they are mode-invariant by design.

---

## 2026-08-13 (later) — app icons, and a proposal SDL should probably absorb

Owner reaction, verbatim: *"the app icon options are not satisfying and often look very bad when
certain colorways are selected."* Both halves were true and measurable — 18 of 18 icons fell below
3:1 on every one of the ten light colorways, bottoming out at **1.01:1** on Periwinkle Vivid.

### Proposal: SDL should say something about IDENTITY colour

SDL law 2 gives a product one accent voice. It says nothing about a product that has to distinguish
eighteen peer objects at a glance — a dock, a file-type list, a tag system, a service status board.
The two obvious readings are both bad: literal per-object hexes (what this codebase had) pin the set
to one colorway's temperament, and collapsing everything to the accent throws away the fastest
wayfinding cue there is.

The resolution shipped here, offered upstream:

> **Identity is the HUE. Discipline is the colorway.**
> An object declares an OKLCH hue angle. The system renders it at the ACTIVE colorway's own chroma
> and lightness, then walks lightness until measured contrast against the plane clears the floor.
> Chroma is capped at the accent's, never above it — so an identity colour can never out-shout the
> accent, and law 2 holds.

Three properties that make it worth locking rather than leaving to taste:

1. **It degrades honestly.** On Mono Soft (accent chroma 0.011) the set correctly collapses to
   greyscale, because that colorway has no colour to lend. The UI says so rather than pretending.
2. **It must be measured, not asserted.** OKLab lightness and WCAG relative luminance are different
   functions of the same colour: at a fixed L, yellow carries far more luminance than blue. Holding
   L constant across the wheel passes for some hues and fails for others. Only the walk generalises.
3. **sRGB gamut clipping shifts hue** — clip a vivid violet's blue channel and it slides to magenta.
   Since hue is the whole point, chroma is reduced by bisection instead. Same L, same h, most chroma
   sRGB can actually show.

### Second proposal: `onAccent` needs a sibling for filled tiles

P2 already found that `onAccent` should be a named role (see the earlier entry). The Solid icon
theme surfaced its second half: the ink that reads *inside* a filled shape is NOT the ink that reads
when the same glyph floats free. Solid's dock icons were cream-on-cream and invisible while every
contrast number in the audit was correct — the numbers were measured against a surface the glyph
never landed on. **A role that depends on context needs the context in its name.**

### Where the review process itself was wrong

Every visual claim in the P0–P7 entry above was a *measurement*. None was a look. The in-app browser
pane never composites — `document.hidden` is permanently true, `requestAnimationFrame` never fires,
so framer-motion's `AnimatePresence mode="wait"` never resolves its exit and the app sits frozen on
the pre-boot screen. Computed styles read fine, which is exactly what made it feel like verification.

`scripts/shot.mjs` drives headless Chrome over raw CDP instead. Both bugs in this pass — the Solid
dock ink, and a Quantum core that rendered as a black hole because `metalness: 0.8` with no
environment map reflects nothing — were found by looking at a PNG, and neither was reachable by any
contrast walk. *Measurement proves a colour is right; only a picture proves it is on the right
thing.*
