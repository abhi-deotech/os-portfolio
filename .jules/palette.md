# Palette's Journal - Lumina OS

## 2026-05-21 - Interactive Element Accessibility
**Learning:** Many interactive elements in Lumina OS (Taskbar icons, window controls, etc.) are implemented using `div` elements instead of semantic `button` elements. This hinders keyboard navigation and screen reader accessibility. Additionally, while a sound engine exists, it is not consistently applied to all core UI interactions.
**Action:** Replace interactive `div`s with semantic `<button type="button">` elements, add appropriate ARIA labels, and integrate `useSoundEffects` for consistent auditory feedback.
