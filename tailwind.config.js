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
      colors: {
        os: {
          background: "var(--os-background)",
          surface: "var(--os-surface)",
          surfaceContainerLow: "var(--os-surface-container-low)",
          surfaceContainerHigh: "var(--os-surface-container-high)",
          surfaceContainerHighest: "var(--os-surface-container-highest)",
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
