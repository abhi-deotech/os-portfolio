# Palette's Journal - Lumina OS UX & Accessibility

This journal tracks critical UX and accessibility learnings discovered during the enhancement of Lumina OS.

## 2026-05-15 - Semantic Taskbar Interactions
**Learning:** In a desktop-metaphor web app, using generic `div` tags for taskbar and launcher icons prevents keyboard navigation and screen reader support. Semantic `<button>` elements with `focus-visible` rings and explicit ARIA labels are essential for maintaining the "OS" illusion while ensuring accessibility.
**Action:** Always prefer semantic `<button type="button">` for interactive UI elements and include `focus-visible:ring-2` to provide clear keyboard focus indicators.

## 2026-05-15 - Audible UI Feedback
**Learning:** Auditory feedback (clicks/transitions) significantly enhances the "tactile" feel of a virtual desktop environment, making it feel more responsive and high-end.
**Action:** Integrate the `useSoundEffects` hook into primary navigation components like the Taskbar and Launcher to provide consistent sensory feedback on user actions.
