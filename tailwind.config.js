/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Manrope', 'sans-serif'],
        title: ['var(--sdl-font-title)'],
      },
      spacing: {
        s1: 'var(--sdl-s1)', s2: 'var(--sdl-s2)', s3: 'var(--sdl-s3)',
        s4: 'var(--sdl-s4)', s5: 'var(--sdl-s5)', s6: 'var(--sdl-s6)',
        s7: 'var(--sdl-s7)', s8: 'var(--sdl-s8)', s9: 'var(--sdl-s9)',
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      colors: {
        // EVERY key must be `rgb(var(--x-rgb) / <alpha-value>)` backed by a SPACE-separated
        // triple. Two failure modes this shape avoids, both previously live in this file:
        //   1. plain `var(--x)` — Tailwind emits NO rule at all for a /N modifier, so
        //      `bg-os-surface/80` silently vanished (24 such classes).
        //   2. <alpha-value> against a COMMA triple — the declaration is invalid and gets
        //      dropped, so even the base `bg-os-primary` rendered transparent (778 sites).
        // See the header comment in src/index.css before changing anything here.
        os: {
          background: "rgb(var(--os-background-rgb) / <alpha-value>)",
          surface: "rgb(var(--os-surface-rgb) / <alpha-value>)",
          surfaceContainerLowest: "rgb(var(--os-surface-container-lowest-rgb) / <alpha-value>)",
          surfaceContainerLow: "rgb(var(--os-surface-container-low-rgb) / <alpha-value>)",
          surfaceContainerHigh: "rgb(var(--os-surface-container-high-rgb) / <alpha-value>)",
          surfaceContainerHighest: "rgb(var(--os-surface-container-highest-rgb) / <alpha-value>)",
          primary: "rgb(var(--os-primary-rgb) / <alpha-value>)",
          primaryDim: "rgb(var(--os-primary-dim-rgb) / <alpha-value>)",
          secondary: "rgb(var(--os-secondary-rgb) / <alpha-value>)",
          secondaryDim: "rgb(var(--os-secondary-dim-rgb) / <alpha-value>)",
          tertiary: "rgb(var(--os-tertiary-rgb) / <alpha-value>)",
          onSurface: "rgb(var(--os-on-surface-rgb) / <alpha-value>)",
          onSurfaceVariant: "rgb(var(--os-on-surface-variant-rgb) / <alpha-value>)",
          outline: "rgb(var(--os-outline-rgb) / <alpha-value>)",
        },
        // SDL roles — the target vocabulary. New work uses these; `os-*` above is the bridge that
        // keeps ~1,020 existing call sites working, and is deleted when the census hits zero.
        sdl: {
          plane: "rgb(var(--sdl-plane-rgb) / <alpha-value>)",
          surface: "rgb(var(--sdl-surface-rgb) / <alpha-value>)",
          surface2: "rgb(var(--sdl-surface-2-rgb) / <alpha-value>)",
          sunken: "rgb(var(--sdl-sunken-rgb) / <alpha-value>)",
          chart: "rgb(var(--sdl-chart-rgb) / <alpha-value>)",
          ink: "rgb(var(--sdl-ink-rgb) / <alpha-value>)",
          sec: "rgb(var(--sdl-sec-rgb) / <alpha-value>)",
          sunkSec: "rgb(var(--sdl-sunk-sec-rgb) / <alpha-value>)",
          accent: "rgb(var(--sdl-accent-rgb) / <alpha-value>)",
          soft: "rgb(var(--sdl-soft-rgb) / <alpha-value>)",
          aInk: "rgb(var(--sdl-aink-rgb) / <alpha-value>)",
          barA: "rgb(var(--sdl-bar-a-rgb) / <alpha-value>)",
          barB: "rgb(var(--sdl-bar-b-rgb) / <alpha-value>)",
          chartInk: "rgb(var(--sdl-chart-ink-rgb) / <alpha-value>)",
          titleInk: "rgb(var(--sdl-title-ink-rgb) / <alpha-value>)",
          btnInk: "rgb(var(--sdl-btn-ink-rgb) / <alpha-value>)",
          onAccent: "rgb(var(--sdl-on-accent-rgb) / <alpha-value>)",
          alert: "rgb(var(--sdl-alert-rgb) / <alpha-value>)",
          warn: "rgb(var(--sdl-warn-rgb) / <alpha-value>)",
          done: "rgb(var(--sdl-done-rgb) / <alpha-value>)",
        },
        // Mode-aware alpha channels. `veil` LIFTS in dark (white over a dark plane) and DEEPENS in
        // light, using the colorway's own ink rather than pure black so each pack stays in register.
        // This is what replaces the 925 bare white/black literals in P4.
        veil: "rgb(var(--sdl-veil-rgb) / <alpha-value>)",
        hairline: "rgb(var(--sdl-hairline-rgb) / <alpha-value>)",
      },
      borderRadius: {
        sdl: "var(--sdl-radius)",
        'sdl-sm': "var(--sdl-radius-sm)",
        'sdl-lg': "var(--sdl-radius-lg)",
        'sdl-panel': "var(--sdl-radius-panel)",
      },
      // One tempo per theme; press = hover/2, pane = hover x 1.4. Never mix within a theme.
      transitionDuration: {
        hover: "var(--sdl-t-hover)",
        press: "var(--sdl-t-press)",
        pane: "var(--sdl-t-pane)",
        toast: "var(--sdl-t-toast)",
      },
      transitionTimingFunction: { sdl: "var(--sdl-ease)" },
      boxShadow: {
        lift: "var(--sdl-lift)",
        'lift-hover': "var(--sdl-lift-hover)",
        'lift-window': "var(--sdl-lift-window)",
        hairline: "var(--sdl-hairline)",
      },
      // Density-aware space scale lives in the `spacing` block above (s1..s9). Existing numeric
      // spacing (p-4, gap-3) is untouched, so density adoption is opt-in per component.
    },
  },
  plugins: [],
}
