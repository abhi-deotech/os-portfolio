# Palette's Journal - Lumina OS UX & Accessibility

## 2026-05-14 - Taskbar Accessibility & Micro-interactions
**Learning:** Interactive elements in the Taskbar were using `div` tags with `onClick` handlers. This prevents keyboard navigation (cannot tab to them) and doesn't provide semantic information to screen readers.
**Action:** Use semantic `<button type="button">` with `aria-label` and `focus-visible` rings for all taskbar toggles and app icons.

**Learning:** Adding auditory feedback (click sounds) to primary OS interaction points (Taskbar) significantly enhances the "desktop OS" feel of a web-based portfolio.
**Action:** Integrate `useSoundEffects` into the Taskbar component and trigger 'click' sounds on interaction.
