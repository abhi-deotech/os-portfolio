# Palette's Journal - Critical UX & Accessibility Learnings

## 2025-05-15 - [Initial Accessibility Audit]
**Learning:** Core interactive elements like window controls and taskbar icons were using non-semantic `div` elements or buttons without proper ARIA labeling, making them difficult for screen readers and keyboard users to navigate.
**Action:** Transition interactive elements to semantic `<button>` tags with explicit `type="button"`, `aria-label`, and `title` attributes.
