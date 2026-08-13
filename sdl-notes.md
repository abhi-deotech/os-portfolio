# SDL working memory — vibe-os-portfolio (Lumina OS)

Per `sarva-design-language/SKILL.md`: dated entries for proposals, drift observations, and owner
reactions worth remembering. Feeds the consolidation ritual (`EVOLUTION.md`). Nothing here edits
SDL itself — proposals land upstream only during a "consolidate SDL" pass.

---

## 2026-08-13 — First SDL audit of the desktop shell

Full review: `SDL-DESKTOP-REVIEW.md`. Method: 6 dimension reviewers → adversarial verification
(1 skeptic per dimension, instructed to default to refuted) → synthesis. **66 findings survived,
56 refuted** (46% kill rate). Status: **proposed, not applied. Nothing accepted by the owner yet.**

### Measured evidence (probed from the running app, not estimated)

| | this project | SDL locked dark colorways |
|---|---|---|
| accent HSL saturation | **100%** — all four presets | 46.4%–82% |
| peak accent rel. luminance | **0.678** (`#00f5a0`) | 0.317 (`#ef6f8e`, the brightest ever locked) |

`#00f5a0` is 2.2× the brightest locked accent; the *quietest* preset (`#ff68f0`, 0.375) is still
21% above `barA` `#8d8df1` (0.311) — SDL's sharpest **data** channel. Cobalt `#5387ee` was passed
as chrome at relLum 0.253; all four presets sit above it and all four do chrome duty.

Verified by grep across the 12 shell files:
- surfaces: **52** `bg-white/N` + **38** `border-white/N` vs **14** `bg-os-surfaceContainer*`
- type: **73** `font-bold` + **52** `font-black` + 1 `font-extrabold`, against an
  `Inter:wght@400;500;600` import — only **one** site (`Settings.jsx:570`) has a real face
- motion: `duration-300`×12, `duration-500`×3, `duration-1000`×1, **32** bare `transition-all`,
  springs at stiffness 300/350/500
- `prefers-reduced-motion`: **0 matches in all of `src/`**
- 49 labels below the 11px label floor (30@10px, 10@9px, 9@8px)

### Open axis — NOT decided

**Steel Night (snap/depth, 150-80-210)** vs **Jewel Night (silk/wash, 320-140-420)**.
Review recommends **Steel Night**: a shell is a substrate you act *through*, and the existing navy
ramp (`#091328/#141f38/#192540`) is already Carbon-shaped. Awaiting owner.

### Drift observations — where SDL had to bend for this product

1. **Radius.** SDL Steel = 12; this shell's signature is a coherent 2.5rem/40px family across five
   surfaces. Radius is not one of the ten laws. Recommendation: keep the 40, log the deviation.
2. **Focus-ring alpha.** SDL says 30%. These 23 rings are the only keyboard affordance and sit on
   glass over *user-chosen photo* wallpapers, where 30% may fall under WCAG 1.4.11's 3:1 floor.
   Recommendation: hold ~45–50%, take the 2px→3px half now. **SDL's 30% assumes a plane the
   designer controls — a user-wallpaper product may need a rule SDL does not yet have.**
3. **No locked green dark accent exists.** The `green` preset has nothing to map to. Derived a moss
   (`#3aa082` chrome / `#23a37f` barA — relLum 0.273/0.281, sat 46.8%/64.7%, inside the locked band
   on both axes). **Arithmetic, not taste. Must pass the owner's eye before shipping.**
4. **Title face.** Steel Night mandates system-stack titles; Manrope is a written contract in
   `STYLING.md` and typography/SKILL.md leaves non-Steel faces open per project. Unresolved.
5. **Translucency is a product feature here.** The `transparencyEffects` toggle means fills cannot
   be opacified to conformance without making a shipped user control inert. Every surface proposal
   in the review stays translucent for this reason.

### Notable non-findings (proposed, then refuted — do not re-raise)

- `--desktop-gradient` (`index.css:34`) **conforms**. The violet stop `#1a103c` lifts off the base
  by ~8–11% — already the whisper register, already an undertoned plane. It reads as absent only
  because the default wallpaper paints over it. Uncover it; don't rewrite it.
- The 300/30 spring (`Window.jsx:108/125`, `Desktop.jsx:68`) is the shell's *most consistent*
  motion — one config, three sites. SDL never forbids springs. Leave it.
- ControlCenter's ON state (`:103/:120`) already **is** the dark selected grammar (accent-soft fill
  + accent border) — one of the few genuinely pronounced states in the shell.
- `.light-mode` (`index.css:37-48`) is unreachable dead code — no class applier, no store flag.
  Do not build a Carbon Day role set nothing can activate.

### Biggest missing SDL system

**Density.** `grep data-density src/` → 0 hits, while `App.jsx:176-182` already injects the colorway
switch on the exact element that should carry it. SDL names density first-class, switched *beside*
the colorway switch.
