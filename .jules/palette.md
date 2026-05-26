## 2026-05-18 - Semantic Taskbar for Accessibility
**Learning:** Using generic `div` elements for interactive UI components like a taskbar breaks keyboard navigation and screen reader support. Converting them to `<button type="button">` with `aria-label` and `focus-visible` styles significantly improves accessibility with minimal code impact (< 50 lines).
**Action:** Always prefer semantic `<button>` for clickable UI elements and ensure they include `aria-label` and `title` when they contain only icons.
