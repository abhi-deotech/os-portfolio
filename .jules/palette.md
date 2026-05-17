# Palette's Journal - Critical UX/Accessibility Learnings

## 2026-05-15 - [Taskbar Accessibility Enhancement]
**Learning:** In complex OS-style simulations, interactive elements are often implemented as `div` or `motion.div` for styling flexibility, which breaks keyboard navigation and screen reader support. Converting these to semantic `<button type="button">` with explicit focus states and ARIA labels is essential for accessibility.
**Action:** Always prefer semantic `<button>` elements for interactive UI components and ensure they have visible focus rings and descriptive `aria-label` attributes.
