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
      },
      spacing: {
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
        }
      }
    },
  },
  plugins: [],
}
