# Palette's Journal - Lumina OS UX & Accessibility

This journal tracks critical UX and accessibility learnings discovered during the development of Lumina OS.

## 2026-05-15 - [Taskbar Accessibility Refactor]
**Learning:** Interactive elements in the Lumina OS Taskbar (App Launcher, Control Center, and About Me buttons) were initially implemented as `div` elements with `onClick` handlers. This pattern lacks inherent keyboard accessibility and semantic meaning for screen readers. Using `<button type="button">` with explicit `aria-label` and `focus-visible` rings ensures the OS remains navigable for all users.
**Action:** Always refactor custom interactive `div` containers to semantic `<button>` elements and ensure they provide auditory feedback via `useSoundEffects` to enhance the "OS" feel.
