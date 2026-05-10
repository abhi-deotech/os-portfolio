# Palette's Journal - Critical UX & Accessibility Learnings

## 2026-05-10 - Taskbar Semantic Accessibility & Focus States
**Learning:** Using non-semantic elements (like `div`) for core OS navigation (Taskbar/Launcher) creates a critical accessibility gap, making the system unusable for screen reader and keyboard-only users. Additionally, standard browser focus rings are often poorly visible against glassmorphic/translucent backgrounds.
**Action:** Always use semantic `<button type="button">` for interactive controls. Implement custom, high-contrast focus indicators using `focus-visible:ring-2` and thematic colors (e.g., `os-primary`) to ensure visibility without breaking the aesthetic.

## 2026-05-10 - Auditory Feedback in Desktop Metaphor UIs
**Learning:** In a "Desktop OS" web application, users expect a higher degree of sensory feedback than a standard website. Subtle auditory cues on button clicks significantly enhance the "tactile" feel of the virtual interface and provide immediate non-visual confirmation of actions.
**Action:** Consistently integrate the `playSound('click')` hook for primary OS interactions (Launcher, Taskbar shortcuts, App icons) to reinforce the desktop metaphor.
