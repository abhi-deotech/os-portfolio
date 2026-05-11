# Palette's Journal - Critical UX & Accessibility Learnings

## 2026-05-19 - Semantic Buttons and Accessibility
**Learning:** Interactive elements like taskbar icons and window controls in Lumina OS often use `div` or `span` instead of semantic `<button>` elements, which hinders keyboard navigation and screen reader accessibility. Standardizing on `<button type="button">` with `aria-label` and `title` improves the experience for all users.
**Action:** Always use semantic `<button>` elements for interactive UI components and ensure they have descriptive labels.
