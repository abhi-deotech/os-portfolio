## 2026-05-14 - [Semantic Buttons in Lumina OS Taskbar]
**Learning:** Lumina OS uses a "glassmorphism" aesthetic that often leads to using `div` elements for interactive areas to maintain complex styling. However, this breaks keyboard navigation and screen reader support. Replacing these with `<button type="button">` and `focus-visible` styles preserves the look while enabling accessibility.
**Action:** Audit other high-level UI containers (Dock, App Launcher, Window Controls) for non-semantic interactive elements and replace them with buttons and appropriate ARIA labels.
