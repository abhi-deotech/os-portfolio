# Palette's Journal - Lumina OS UX & Accessibility

## 2026-05-15 - Taskbar Semantic Buttons & Feedback
**Learning:** Core navigation elements in the Taskbar were implemented as `div` elements, which prevents keyboard navigation and lacks screen reader support. Additionally, despite the availability of a synthesized sound engine, these high-traffic interactions lacked auditory feedback.
**Action:** Always use semantic `<button type="button">` for interactive UI elements in Lumina OS and ensure they trigger the `click` sound effect via `useSoundEffects` for a "premium" OS feel.
