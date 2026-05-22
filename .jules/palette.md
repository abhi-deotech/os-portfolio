## 2026-05-22 - [Semantic Taskbar Buttons]
**Learning:** Using non-semantic elements (like `div`) for interactive UI components prevents keyboard navigation and doesn't provide enough context to screen readers. In a complex OS-like UI, explicitly using `<button type="button">` with `aria-label` and `focus-visible` styles is crucial for accessibility.
**Action:** Always prefer semantic `<button>` elements for any interactive taskbar or launcher item, ensuring they have descriptive labels and clear focus indicators.
