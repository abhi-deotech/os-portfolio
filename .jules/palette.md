## 2026-05-27 - Semantic Interactive Elements
**Learning:** Lumina OS uses many `div` elements with `onClick` handlers for key UI components like Taskbar items and Window controls. This breaks keyboard navigation and screen reader support by default.
**Action:** Always wrap interactive icons in semantic `<button type="button">` elements, provide explicit `aria-label` and `title` attributes, and utilize `focus-visible:ring-2` to ensure the glassmorphism UI remains accessible without sacrificing aesthetics. Incorporate `useSoundEffects` for auditory click feedback to enhance the "OS" feel.
