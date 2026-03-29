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
        os: {
          background: "var(--os-background)",
          surface: "var(--os-surface)",
          surfaceContainerLow: "rgb(var(--os-surface-container-low-rgb) / <alpha-value>)",
          surfaceContainerHigh: "rgb(var(--os-surface-container-high-rgb) / <alpha-value>)",
          surfaceContainerHighest: "rgb(var(--os-surface-container-highest-rgb) / <alpha-value>)",
          primary: "rgb(var(--os-primary-rgb) / <alpha-value>)",
          primaryDim: "var(--os-primary-dim)",
          secondary: "rgb(var(--os-secondary-rgb) / <alpha-value>)",
          secondaryDim: "var(--os-secondary-dim)",
          tertiary: "rgb(var(--os-tertiary-rgb) / <alpha-value>)",
          onSurface: "var(--os-on-surface)",
          onSurfaceVariant: "var(--os-on-surface-variant)",
          outline: "rgb(var(--os-outline-rgb) / <alpha-value>)",
        }
      }
    },
  },
  plugins: [],
}
