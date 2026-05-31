## 2026-05-31 - [Taskbar Accessibility & Ambiguous Locators]
**Learning:** Converting UI elements to semantic buttons with ARIA labels significantly improves accessibility but can introduce ambiguity in automated tests if the same label is used for different functional areas (e.g., a dedicated "About" shortcut vs. a dynamic Dock entry).
**Action:** Use specific parent containers or positional selectors (like `.first()`) in Playwright when multiple semantic controls share identical labels to ensure reliable verification.
