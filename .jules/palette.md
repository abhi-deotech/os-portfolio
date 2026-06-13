## 2026-05-14 - Semantic Taskbar Accessibility
**Learning:** Converting `div` clickables to semantic `<button>` elements in the Taskbar significantly improved keyboard accessibility and screen reader support without breaking the glassmorphism aesthetic. Adding `focus-visible` rings provided clear navigation cues for non-mouse users. Integrating `useSoundEffects` provides a delightful, multi-sensory feedback loop for these interactions.
**Action:** Always use semantic `<button type="button">` for interactive UI elements. Ensure `aria-label`, `title`, and `focus-visible:ring-2` styles are included by default. Include synthesized audio feedback using the `useSoundEffects` hook for primary OS interactions.


## 2026-05-15 - Accessible Custom Sliders and Toggles
**Learning:** Custom UI sliders (Brightness/Volume) and toggles (Wi-Fi/Bluetooth) in a glassmorphism interface are often implemented as `div`s, which breaks keyboard navigation. Implementing `role="slider"` with `tabIndex={0}` and arrow key listeners, along with `role="switch"` for toggles, preserves the aesthetic while making complex OS-style controls fully accessible.
**Action:** For custom sliders, use `role="slider"`, `tabIndex={0}`, and `aria-valuenow`. Implement `onKeyDown` for arrow key adjustments (5% increments) and integrate `playSound('click')` to provide feedback for both mouse and keyboard interactions.

## 2026-06-01 - Draggable Icon Accessibility
**Learning:** For interactive elements that use complex drag-and-drop logic (like desktop icons using Framer Motion), using `role="button"` and `tabIndex={0}` is superior to native `<button>` elements. This approach prevents browser-level button behaviors from interfering with the drag engine while still providing full keyboard navigation and screen reader support. Combining this with `onKeyDown` handlers for Enter/Space keys ensures a seamless experience for all users.
**Action:** For draggable interactive elements, use ARIA roles, tabIndex, and manual key listeners instead of native buttons to preserve drag performance while ensuring full accessibility compliance.

## 2026-06-04 - Accessible Window Controls with Auditory Feedback
**Learning:** Combining ARIA labels and focus-visible rings with synthesized sound effects for window controls (Close, Minimize, Maximize) creates a more inclusive and responsive desktop experience. The auditory cues ('click', 'close') provide immediate confirmation of state changes that visual-only animations might sometimes fail to convey clearly to all users.
**Action:** Consistently apply semantic `<button type="button">` with aria-label, title, focus-visible styles, and useSoundEffects for all system-level window and taskbar interactions.

## 2026-06-05 - Accessible Media Controls with Auditory Feedback
**Learning:** In media viewer applications (like PhotoViewer), image manipulation controls (zoom, rotate) and action buttons (save, share, favorite) often rely purely on visual icons without clear labels. Adding `aria-label` and `title` ensures screen reader compatibility, while implementing `focus-visible:ring-2` allows keyboard navigation. Furthermore, integrating `useSoundEffects` for these interactions adds an auditory layer that confirms the action is registered, particularly helpful during media consumption where visual focus might be scattered.
**Action:** Always ensure media viewer controls have semantic `<button type="button">`, accessible labels (`aria-label`, `title`), keyboard focus rings (`focus-visible`), and auditory feedback via `playSound('click')`.
