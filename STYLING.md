# Styling and Theming Guide

Lumina OS uses a comprehensive theming system built on CSS custom properties and Tailwind CSS.

## Color System

### CSS Custom Properties

The OS uses RGB format for colors to enable opacity support via `rgba()`:

```css
:root {
  /* Primary accent colors (RGB for alpha support) */
  --os-primary-rgb: 204, 151, 255;    /* Purple - main accent */
  --os-secondary-rgb: 0, 210, 253;    /* Cyan - secondary accent */
  --os-tertiary-rgb: 0, 245, 160;     /* Green - tertiary accent */
  
  /* Utility colors */
  --blue-500-rgb: 59, 130, 246;
  --red-500-rgb: 239, 68, 68;
  --yellow-500-rgb: 234, 179, 8;
  
  /* Surfaces */
  --os-background: #060e20;
  --os-surface: #060e20;
  --os-surface-container-low: #091328;
  --os-surface-container-high: #141f38;
  --os-surface-container-highest: #192540;
  
  /* Text colors */
  --os-on-surface: #dee5ff;
  --os-on-surface-variant: #a3aac4;
  --os-outline-rgb: 109, 117, 140;
  
  /* Dimmed accent variants */
  --os-primary-dim: #9c48ea;
  --os-secondary-dim: #00c3eb;
  
  /* Background gradient */
  --desktop-gradient: radial-gradient(circle at 50% -20%, #1a103c 0%, #060e20 60%, #030712 100%);
}
```

### Accent Color Schemes

The application supports 4 accent color presets:

| Theme | Primary | Secondary | Tertiary |
|-------|---------|-----------|----------|
| `purple` (default) | `204, 151, 255` | `0, 210, 253` | `0, 245, 160` |
| `cyan` | `0, 210, 253` | `204, 151, 255` | `255, 104, 240` |
| `magenta` | `255, 104, 240` | `204, 151, 255` | `0, 210, 253` |
| `green` | `0, 245, 160` | `0, 210, 253` | `204, 151, 255` |

```javascript
// From App.jsx
const accentColorsMap = {
  purple:  { primary: '204, 151, 255', secondary: '0, 210, 253', tertiary: '0, 245, 160' },
  cyan:    { primary: '0, 210, 253', secondary: '204, 151, 255', tertiary: '255, 104, 240' },
  magenta: { primary: '255, 104, 240', secondary: '204, 151, 255', tertiary: '0, 210, 253' },
  green:   { primary: '0, 245, 160', secondary: '0, 210, 253', tertiary: '204, 151, 255' },
};
```

## Tailwind Configuration

### Custom Colors

The Tailwind config extends the default theme with OS-specific colors:

```javascript
// tailwind.config.js
colors: {
  os: {
    background: "var(--os-background)",
    surface: "var(--os-surface)",
    surfaceContainerLow: "var(--os-surface-container-low)",
    surfaceContainerHigh: "var(--os-surface-container-high)",
    surfaceContainerHighest: "var(--os-surface-container-highest)",
    
    // RGB colors support opacity via / modifier
    primary: "rgb(var(--os-primary-rgb) / <alpha-value>)",
    secondary: "rgb(var(--os-secondary-rgb) / <alpha-value>)",
    tertiary: "rgb(var(--os-tertiary-rgb) / <alpha-value>)",
    
    // Dimmer variants
    primaryDim: "var(--os-primary-dim)",
    secondaryDim: "var(--os-secondary-dim)",
    
    // Text colors
    onSurface: "var(--os-on-surface)",
    onSurfaceVariant: "var(--os-on-surface-variant)",
    outline: "rgb(var(--os-outline-rgb) / <alpha-value>)",
  }
}
```

### Font Configuration

```javascript
fontFamily: {
  sans: ['Inter', 'sans-serif'],
  display: ['Manrope', 'sans-serif'],
}
```

## Usage Examples

### Basic Colors

```jsx
// Solid colors
<div className="text-os-primary">Primary text</div>
<div className="bg-os-surface">Surface background</div>

// With opacity (using Tailwind's / modifier)
<div className="bg-os-primary/20">20% opacity primary</div>
<div className="text-os-secondary/80">80% opacity secondary text</div>
<div className="border-os-outline/50">50% opacity border</div>
```

### Dynamic Theming

```jsx
// App.jsx injects CSS variables based on active accent
<div style={{
  '--os-primary-rgb': currentAccent.primary,
  '--os-secondary-rgb': currentAccent.secondary,
  '--os-tertiary-rgb': currentAccent.tertiary,
  '--os-accent-intensity': accentIntensity / 100,
  filter: `brightness(${brightness}%)`,
}}>
```

## Utility Classes

### Glassmorphism Panel

```css
.glass-panel {
  @apply bg-os-surfaceContainerHighest/50 backdrop-blur-2xl 
         border border-os-outline/10 shadow-2xl;
}
```

### Custom Scrollbar

```css
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  @apply bg-os-outline/20 rounded-full border border-white/5;
  backdrop-filter: blur(4px);
}
::-webkit-scrollbar-thumb:hover {
  @apply bg-os-primary/40;
}
```

### Card Glow Effect

```css
.os-card-glow {
  @apply relative overflow-hidden transition-all duration-300;
}
.os-card-glow::after {
  content: '';
  @apply absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none;
  background: radial-gradient(circle at center, rgb(var(--os-primary-rgb) / 0.15), transparent);
}
.os-card-glow:hover::after {
  @apply opacity-100;
}
```

### Hide Scrollbar

```css
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
```

## Light Mode Support

A light mode class is defined but not currently implemented:

```css
.light-mode {
  --os-background: #f8fafc;
  --os-surface: #ffffff;
  --os-surface-container-low: #f1f5f9;
  --os-surface-container-high: #e2e8f0;
  --os-surface-container-highest: #cbd5e1;
  
  --os-primary-rgb: 124, 58, 237;
  --os-secondary-rgb: 14, 165, 233;
  --os-tertiary-rgb: 5, 150, 105;
  
  --os-on-surface: #0f172a;
  --os-on-surface-variant: #475569;
  --os-outline-rgb: 148, 163, 184;
  
  --desktop-gradient: radial-gradient(circle at 50% -20%, #e0e7ff 0%, #f8fafc 60%, #f1f5f9 100%);
}
```

To enable: Toggle `document.body.classList.add('light-mode')`

## Mobile Optimizations

```css
@media (max-width: 768px) {
  .touch-hit-area {
    @apply min-h-[44px] min-w-[44px] flex items-center justify-center;
  }
  
  button, .cursor-pointer {
    @apply active:scale-95 transition-transform;
  }
}
```

## Context Menu Styling

React-contexify is styled for OS theme:

```css
.os-context-menu.contexify {
  background: rgba(14, 14, 22, 0.75) !important;
  backdrop-filter: blur(24px) saturate(160%) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 1rem !important;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.06) !important;
}
```

## Best Practices

1. **Always use RGB format** for colors that need opacity support
2. **Use Tailwind's `/` modifier** for opacity: `bg-os-primary/20`
3. **Prefer utility classes** over inline styles for consistency
4. **Use CSS variables** for values that change dynamically (themes)
5. **Use `backdrop-blur`** sparingly - it impacts performance

## Changing Themes Programmatically

```javascript
import useOSStore from './store/osStore';

function ThemeSwitcher() {
  const { activeAccent, setActiveAccent } = useOSStore();
  
  const themes = ['purple', 'cyan', 'magenta', 'green'];
  
  return (
    <div>
      {themes.map(theme => (
        <button
          key={theme}
          onClick={() => setActiveAccent(theme)}
          className={activeAccent === theme ? 'ring-2' : ''}
        >
          {theme}
        </button>
      ))}
    </div>
  );
}
```
