# Styling and Theming Guide

Lumina OS is themed by the **Sarva Design Language (SDL)** — a role-based system where components
never name a colour, only its *role*. Sixteen colorways (fifteen SDL, plus the preserved pre-SDL
"Lumina Neon" pack) swap every role at once, and ten of the sixteen are light.

## The role vocabulary

Colour lives in CSS custom properties on `documentElement`, written by exactly one module,
`src/theme/applyTheme.js`.

```css
/* surfaces, back to front */
--sdl-plane      /* the page itself — undertoned, never paper-default (law 1) */
--sdl-surface    /* panels and cards sitting on the plane */
--sdl-sunken     /* wells and insets */
--sdl-chart      /* chart wells, which must demarcate (law 4) */

/* ink */
--sdl-ink        /* primary text */
--sdl-sec        /* secondary text */
--sdl-sunk-sec   /* secondary text on a sunken surface */

/* accent — chrome speaks quietly (law 2) */
--sdl-accent
--sdl-soft       /* accent-tinted fill */
--sdl-aink       /* accent-toned ink, lightened + desaturated before bolding (law 3) */
--sdl-on-accent  /* ink that reads ON an accent fill */

/* data — data speaks sharply (law 2) */
--sdl-bar-a
--sdl-bar-b

/* status — completed is neutral grey, never green beside red (law 10) */
--sdl-alert  --sdl-warn  --sdl-done
```

Every colour role emits **two** variables: a hex (`--sdl-accent`) for gradients, shadows, SVG,
canvas and WebGL, and a space-separated RGB triple (`--sdl-accent-rgb`) for Tailwind's alpha syntax.

### Why the triples are space-separated

This is load-bearing, not style. Tailwind emits `rgb(var(--sdl-accent-rgb) / <alpha-value>)`. With a
**comma** triple that resolves to `rgb(204, 151, 255 / 1)`, which matches neither the legacy nor the
modern `rgb()` grammar — so the browser drops the declaration and the class renders transparent.

That was a real bug in this codebase: 778 token call sites rendered invisible, including
`.bg-os-primary` with no opacity modifier at all. It is why the app once carried 925 white/black
literals and 327 hardcoded hexes — they were *compensation* for a token layer that silently did
nothing.

Consequence: hand-written CSS must use the **slash** form, `rgb(var(--sdl-accent-rgb) / .3)`. The
legacy `rgba(var(--x), .3)` form only works with comma triples and is invalid everywhere now. The
two forms cannot coexist on one variable.

## Usage

```jsx
/* Tailwind classes — the normal path */
<div className="bg-sdl-surface text-sdl-ink" />
<div className="bg-sdl-accent/20 border border-hairline/10" />
<span className="text-sdl-alert">Delete</span>

/* CSS variables — for gradients, shadows, canvas and inline styles */
<div style={{ background: 'var(--sdl-soft)', borderRadius: 'var(--sdl-radius)' }} />
```

### Mode-aware helpers

`--sdl-veil` and `--sdl-hairline` invert with the mode: white over a dark plane, the colorway's own
**ink** over a light one. So `bg-veil/5` lifts in dark mode and deepens in light with no branching.
`bg-scrim` is the modal backdrop — black at 55% in dark, ink at 28% in light.

## Modes, density and motion

Mode is **derived**, never stored: SDL law 7 says temperature decides it, so a warm or earthy
colorway lives light and a cool or deep one lives dark. `applyTheme` stamps the result as
`data-mode` on the root, alongside `data-theme`, `data-colorway`, `data-grammar`, `data-density`,
`data-glass` and `data-motion`. `src/theme/grammar.css` keys off those attributes.

## Brightness and atmosphere

Brightness is a fixed `body::after` scrim driven by `--os-dim`, **not** a CSS `filter`. A filter on
the app root makes that element a containing block for every `position: fixed` descendant — the
taskbar, control centre, spotlight and toasts all broke. A scrim has no such side effect, composites
more cheaply, and also covers the boot and login screens.

The "Atmosphere" slider drives `--sdl-atmo`, which multiplies wash alpha, motif opacity and glow
alpha together — law 8's "atmosphere is whisper-quiet" on one control.

## Best practices

1. **Reach for a role, never a hex.** If no role fits, the missing thing is a role, not a literal.
2. **Use the slash form** for alpha in hand-written CSS: `rgb(var(--sdl-x-rgb) / .3)`.
3. **Status colour carries meaning** — `sdl-alert` / `sdl-warn` / `sdl-done`, not stock red/green.
4. **Content is exempt.** Brand logos, third-party palettes and gamification badges keep their own
   colour; see `scripts/denylist.mjs`, which records the reason for each exemption.
5. **Only `applyTheme.js` writes theme state to the DOM.** Everything else reads.

SDL is authored by **Aditya Sarva**. Settings > Design Language documents it live, with measurements
computed from the running theme rather than transcribed.