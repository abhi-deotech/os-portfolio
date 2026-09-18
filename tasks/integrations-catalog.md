# Integration catalog — what a website can reach on the user's computer in 2026, and what it can run

Written 2026-09-17 for the Lumina web OS (this repo). Scope: every integration that gives the site
(a) more access to the visitor's machine and peripherals, (b) more OS-like presence, or (c) more real
tools and software running inside the OS windows. Grouped by category; each row says what it unlocks,
where it would land in Lumina, and browser support. **Policy (owner decision, 2026-09-17): cross-browser first;** anything
narrower ships only with a complete fallback or an explanatory notice in the visitor's browser (§1, §5).

Legend
- ✅ already in the codebase · 🟡 wired but not working · 🔒 needs SharedArrayBuffer (cross-origin isolation, see Gates, item 3) · 🌐 works in all three engines: the preferred tier
- Support: 🌐 **All** = Chrome/Edge + Firefox + Safari · **Chromium** = Chrome, Edge, Brave, Arc, Opera, Vivaldi (not Firefox/Safari) · **OT** = origin trial
- † = status checked against 2025–2026 sources during this pass (see "Verification notes" at the end). Unmarked rows are from training knowledge (mid-2026); confirm on caniuse/chromestatus before building.
- Stable browsers at time of writing: Chrome 152, Firefox 155, Safari 27.

What is already integrated (from the codebase survey, 2026-09-17): `hardwareConcurrency`, `deviceMemory`, `platform`/`userAgent`,
WebGPU adapter + matmul benchmark, Network Information, `performance.memory`, Web Audio (synth SFX only), `showDirectoryPicker`
folder mount, IndexedDB via idb-keyval, localStorage mirrors, Web Workers, ResizeObserver, clipboard `writeText`, HTML file drag-drop
(games). Services: YouTube IFrame, Gemini (key in bundle), Puter (auth + cloud FS + KV), Transformers.js MiniLM embeddings, Last.fm,
GitHub (build-time), Unsplash URLs, EmulatorJS (disabled), WebContainers (🟡 cannot boot: isolation removed). **No PWA layer at all**
(no manifest, no service worker).

---

## 1. Policy: cross-browser first (owner decision, 2026-09-17)

1. **Prefer capabilities that work in all three engines** (Chrome/Edge, Firefox, Safari). Those rows are marked 🌐 in the catalog and ship without caveats.
2. **A feature missing from one or two engines may still ship**, but only in one of two shapes:
   - with a **complete fallback** that produces the same result another way (then no notice is needed), or
   - behind a **clear notice in the visitor's browser** that says what is missing, why that browser doesn't have it, what Lumina does instead, and where it works. The notice replaces the control in place. It is never a silent no-op, a disabled button without explanation, or a faked result.
3. **Detect the feature, never the browser** (`'bluetooth' in navigator`, `'showDirectoryPicker' in window`, `'PressureObserver' in window`). Read the browser name only to *word* the notice: `navigator.userAgentData.brands` where present, the UA string otherwise.
4. **State the vendor's own reason and link to it.** Mozilla's and WebKit's standards-positions repositories are the source of truth (https://github.com/mozilla/standards-positions, https://github.com/WebKit/standards-positions); MDN's compatibility table gives versions. Positions change (Firefox shipped Web Serial and Document PiP in 2026 after years of "no"), so store the link with the capability rather than hardcoding prose.
5. **One mechanism, not per-app if-statements.** The seed exists: `FileExplorer.jsx` calls `osAlert` when `showDirectoryPicker` is missing. Generalise it into a capability registry (id, `detect()`, engine matrix, reason + link, fallback id), a `useCapability(id)` hook, a `<CapabilityGate>` that renders either the feature or the notice, and a Settings → Compatibility pane listing every capability with this browser's status. **Proposed, not built; needs its own plan.**
6. Rows that no public browser can use (Isolated-Web-App-only APIs) stay in the catalog for completeness and are out of scope.

### Notice template

> **{Feature} isn't available in {Browser} {major version}.** {Vendor} {hasn't implemented it / has declined to implement it}, citing {reason from their published position}. {What Lumina does instead, one sentence.} Works in: {engines}. [Why]({position link}) · [Support table]({MDN link})

Placement: the existing `SystemDialog` (`osAlert`, `tone: 'warn'`) for one-off actions; an inline panel in place of the control for persistent surfaces (a settings pane, a device list); a per-metric label ("not exposed by Firefox") inside data displays such as the System Dashboard.

---

## 2. Top picks, re-ranked under the policy

### Tier 1 — works in all three engines (🌐): ship first, no notice needed

| # | Pick | Why it matters here | Effort |
|---|------|--------------------|--------|
| 1 | **Truthful system panel from universal facts**: `hardwareConcurrency`, `storage.estimate()`, WebGPU `adapter.info` (all engines now), WebGL renderer string, screen / HDR / P3 facts, Intl locale and timezone | Replaces the `Math.random()` CPU% and the "M3 Max" neofetch with numbers every browser reports. Chromium-only extras (Compute Pressure, Battery, Client Hints, `deviceMemory`) appear as extra rows labelled "not exposed by this browser" elsewhere, never as invented values | S |
| 2 | **Passkeys on the LoginScreen** (+ PRF extension to encrypt the virtual FS) | Touch ID / Face ID / Windows Hello / phone unlock in Safari, Firefox and Chrome alike | M |
| 3 | **PWA base: manifest + service worker** | Installs on Chromium and Safari (Add to Dock / Add to Home Screen); offline boot everywhere. Firefox desktop cannot install web apps, so the Install pane says so and offers a bookmark. Window Controls Overlay is a Tier 3 enhancement on top | S–M |
| 4 | **Media Session + Screen Wake Lock + Web Share** for Music, Media and Notepad | Hardware media keys and the OS now-playing card drive Music; no sleep during playback; share notes through the native sheet (files fall back to download where unsupported) | S |
| 5 | **OPFS-backed virtual FS + `navigator.storage.persist()`** (+ SQLite WASM as the index) | Real file semantics, GB-scale, eviction-protected, in all three engines | M |
| 6 | **On-device AI: WebLLM** (WebGPU in all engines) with **Transformers.js** WASM fallback (Whisper, Kokoro, RMBG, embeddings ✅) | Offline Lumina AI, dictation, speech and background removal everywhere. Chrome's built-in Gemini Nano appears only as a greyed "Built-in (Chrome desktop)" option with its disk requirement | M |
| 7 | **Real Terminal without isolation**: Pyodide `python`, v86 `vm`, SQLite `sqlite3`, Nodebox `node` | Real interpreters in the existing shell; none need SharedArrayBuffer, all run in every engine | M |
| 8 | **Multi-window pop-out** via `window.open` + `BroadcastChannel` + Web Locks | Any Lumina window becomes a real OS window sharing one store. Document PiP (Chromium + Firefox 151) upgrades it to always-on-top where present; Safari gets the plain popup | S–M |
| 9 | **RetroArcade back on with `EJS_threads=false`** | EmulatorJS runs single-threaded in every engine | S |
| 10 | **Real guestbook + Mail**: Giscus or Nostr (serverless) / Supabase; Mail through Resend behind a Worker | Two simulated apps become real | S–M |
| 11 | **Camera and mic apps**: Photo Booth, mic-driven Visualizer with a real `AnalyserNode`, Screen Recorder (MediaRecorder) | `getUserMedia` / `getDisplayMedia` are universal; only tab-audio capture is Chromium-only and falls back to the mic | M |
| 12 | **Cloud drives inside Files**: Google Drive Picker, OneDrive via Microsoft Graph, Dropbox Chooser, WebDAV | The visitor's real files next to the virtual FS, in any browser | M |
| 13 | **Native bridge** (localhost helper daemon or Tauri desktop build) | Browser-independent by construction; the only path to CPU temps, process lists and a real PTY | L |
| 14 | **Key hygiene**: proxy Gemini through a Worker, or Puter AI / OpenRouter PKCE | `VITE_GEMINI_API_KEY` ships in the bundle today | S |

### Tier 2 — two engines: ship, with the notice in the third

| Pick | Has it | Missing in | Notice / fallback |
|---|---|---|---|
| **Web Serial** apps (serial monitor, ESP Web Tools flasher) | Chromium desktop + Android 148, Firefox 151+ | Safari | notice (WebKit opposed); no fallback |
| **Web MIDI** synth | Chromium, Firefox | Safari | notice; fallback: on-screen / QWERTY keyboard |
| **Document PiP** | Chromium 116+, Firefox 151+ | Safari | fallback: plain `window.open` popup (loses always-on-top only) |
| **Web Share with files** | Safari, Chromium Windows / macOS / ChromeOS | Firefox desktop, Chrome on Linux (unverified) | fallback: download + copy link |
| **Badging** | Chromium desktop, Safari 17+ installed | Firefox | silent (cosmetic); note in the Install pane |
| **WebGPU** compute / WebLLM | Chromium, Safari 26+, Firefox Windows / macOS | Firefox on Linux (flag) | notice names the flag `dom.webgpu.enabled`; fallback: WASM |

### Tier 3 — Chromium-only: ship behind the gate, explained

Kept because they are the best demonstrations of "this site can touch my hardware"; each renders the notice in Firefox/Safari instead of the control. Details per row in §5.

| Pick | Fallback in Firefox / Safari |
|---|---|
| **Files as a real app**: pickers, `file_handlers`, `protocol_handlers`, `share_target`, Save As to disk, dropped-folder handles | `<input type=file webkitdirectory>` read-only import + download to save; notice: "imports are copies, changes won't write back" |
| **Window Controls Overlay** (MenuBar as the title bar) | standard installed-PWA window on Safari; notice in the Install pane |
| **Web Bluetooth / WebUSB / WebHID** apps (Bluetooth pane, Phone Link, Stream Deck) | none; notice: both vendors declined to implement (Mozilla: negative; WebKit: oppose, WebHID concerns) |
| **Window Management** (multi-monitor) | `window.open` at default position; Displays pane says "monitor layout not exposed" |
| **Keyboard Lock** (immersive mode) | Fullscreen only; notice: "Esc / Alt+Tab will leave immersive mode here" |
| **Idle Detection** (real lock screen) | existing activity timer + Page Visibility; note in Screensaver settings |
| **Local Font Access** | curated list + `document.fonts.check()` probes of common fonts; notice |
| **EyeDropper** | native `<input type=color>`; tooltip |
| **Compute Pressure / Battery / Client Hints / `deviceMemory`** | per-metric "not exposed by this browser" label; never a substitute number |
| **Tab-audio capture** for the Visualizer | microphone or CORS-clean streams; source picker explains |
| **Background Fetch / Storage Buckets** | foreground fetch + Cache API; notice: "keep this tab open while downloading" |
| **Chrome built-in AI** (Gemini Nano) | WebLLM → Transformers.js → cloud; greyed option with reason |
| **On-device Web Speech recognition** | Whisper via Transformers.js (works everywhere; Firefox has no `SpeechRecognition` at all) |

---

## 3. Gates that apply to everything below

1. **HTTPS + user gesture + permission prompt** for every hardware/media/file API. Use `navigator.permissions.query()` to show state without prompting; ask in context (the Bluetooth pane, not the boot screen); one-click revoke in a Privacy pane.
2. **Browser reality.** Nearly all device access and PWA power is Chromium-only. Firefox and Safari give you: OPFS (not the pickers), camera/mic/screen capture, passkeys, Wake Lock, Web Share, Push (installed on iOS), WebGPU (recent versions), Web Audio, Gamepad, Media Session. Feature-detect and degrade the way the codebase already does for `showDirectoryPicker`.
3. **Cross-origin isolation is off, on purpose** (`vite.config.js` header comment): COOP/COEP broke every cross-origin iframe on Firefox/Safari (Flow-Net, YouTube). Consequences: no SharedArrayBuffer → no WebContainers, no threaded WASM, no WebVM/CheerpX, no Wasmer SDK, no `measureUserAgentSpecificMemory`. Ways through, in order of preference:
   - Prefer tools that don't need SAB: Pyodide, v86, JSLinux, Boxedwine, EmulatorJS (threads off), js-dos, Ruffle, SQLite/DuckDB/PGlite WASM, single-thread ffmpeg core, Nodebox, or a cloud sandbox (§K).
   - Scope COOP/COEP to a route (`/lab/*` in `vercel.json` / `netlify.toml` / `render.yaml`) and open 🔒 apps as their **own top-level window** via `window.open`. COOP severs the opener reference, but same-origin `BroadcastChannel` and IndexedDB still cross the gap, so the popped-out app can share store state.
   - Chromium-only escape hatch (`COEP: credentialless` + `<iframe credentialless>` + `WebContainer.boot({ coep: 'credentialless' })`) still kills embeds on Firefox/Safari. Not worth it.
4. **Keys.** Every `VITE_*` variable is public. Options per service: keyless (Puter, Open-Meteo, Bluesky, HN, Wikipedia, npm, Pollinations, LRCLIB, MusicBrainz), user-brings-own via OAuth PKCE (Spotify, Google, Microsoft, GitHub, OpenRouter), or a Cloudflare Worker / Vercel Function proxy with rate limits.
5. **Localhost from a public site.** `http://127.0.0.1` / `ws://127.0.0.1` are "potentially trustworthy" so HTTPS pages may call them, but Chrome 142+ / Edge 143+ gate public-site → local-network requests behind a **Local Network Access** permission prompt (it replaced Private Network Access), and the local service must send CORS headers (e.g. `OLLAMA_ORIGINS=https://yourdomain`). Verify Safari behaviour before relying on it.
6. **iOS**: Push, Badging and standalone windows only for the installed PWA; no file pickers, no WebUSB/BLE/Serial/HID.
7. **Licensing traps**: WebContainers (licence required for production for-profit use; prototypes free; no written open-source exemption), CheerpX/WebVM (free for personal use only), Photopea (free tier shows ads), StackBlitz embeds (fine), Spotify Web Playback SDK (Premium listeners only), Apple MusicKit (developer token + subscriber).

---

## 4. Catalog

### A. Read-only system facts (no permission prompt)

| Integration | What it unlocks | Where it fits | Support |
|---|---|---|---|
| `navigator.hardwareConcurrency` ✅ | logical core count | Dashboard, Benchmark, neofetch | 🌐 All (Safari caps at 8) |
| `navigator.deviceMemory` ✅ | RAM bucket, capped at 8 GB | Dashboard | Chromium |
| **User-Agent Client Hints** `navigator.userAgentData.getHighEntropyValues(['platform','platformVersion','architecture','bitness','model','fullVersionList'])` | real OS name + version, CPU arch (arm/x86, 64-bit), device model, exact browser build. `navigator.platform` is frozen and lies | "About This Mac"-style panel, neofetch that prints the truth | Chromium |
| **WebGPU `adapter.info`** (+ `limits`, `features`) ✅ partly | GPU vendor / architecture / description, max buffer sizes | neofetch GPU line, Dashboard GPU card | Chromium (Linux partial), Safari 26+, Firefox 141+ (Linux behind flag) † |
| WebGL `WEBGL_debug_renderer_info` (`UNMASKED_RENDERER_WEBGL`) | full GPU string, e.g. "NVIDIA GeForce RTX 4070", where the browser doesn't mask it | GPU fallback name | 🌐 All (Firefox/Safari often mask) |
| **Compute Pressure API** `new PressureObserver(cb).observe('cpu')` | real CPU pressure states (nominal / fair / serious / critical) at ~1 Hz. The honest replacement for the random CPU% | Dashboard, Task Manager, MenuBar load dot, throttle LiveWallpaper under pressure | Chromium 125+ (`cpu` only; Safari opposes) † |
| **CPU Performance API** (device performance tier) | a coarse device tier, no prompt | pick wallpaper quality, local-AI model size and animation budget per device | Chrome 152+ † |
| **Battery Status** `navigator.getBattery()` | level, charging, time to empty/full, live events | Real battery icon in MenuBar, "Low Power Mode" toggle in Control Center | Chromium |
| Network Information ✅ `navigator.connection` | effectiveType, downlink, rtt, saveData | Network tab, defer wallpaper/model downloads on saveData | Chromium (+Firefox Android) |
| **`navigator.storage.estimate()`** | quota and usage bytes (per-origin) | Real "Disk" gauge in Dashboard/About, Storage settings pane, per-app usage via `usageDetails` | 🌐 All |
| `performance.memory` ✅ / `performance.measureUserAgentSpecificMemory()` 🔒 | JS heap used/limit (the latter is accurate but needs isolation) | Dashboard RAM | Chromium |
| Screen facts: `screen.width/height/colorDepth`, `devicePixelRatio`, `screen.isExtended`, refresh rate from rAF deltas, `matchMedia('(dynamic-range: high)')`, `(color-gamut: p3)` | monitor size, scale, multi-monitor presence, Hz, HDR/P3 | Displays settings pane with real values; enable HDR wallpapers on HDR screens | 🌐 All (isExtended: Chromium) |
| Media queries ✅ partly: `prefers-color-scheme`, `prefers-reduced-motion`, `prefers-contrast`, `forced-colors`, `prefers-reduced-transparency` | follow the OS appearance and accessibility settings | Appearance "Auto" mode, glass → solid fallback | 🌐 All (reduced-transparency: Chromium/Safari) |
| `Intl.*`, `navigator.languages`, `Intl.DateTimeFormat().resolvedOptions().timeZone` | locale, calendar, timezone | Clock, Region settings, World Clock widget | 🌐 All |
| `navigator.keyboard.getLayoutMap()` | physical key → printed character map | Show correct shortcut hints per keyboard layout | Chromium |
| `navigator.getInstalledRelatedApps()` | whether our PWA / native app is installed | Hide the install banner, "Open in app" | Chromium |
| Device Posture API (`navigator.devicePosture`) | folded / continuous state on foldables | Split layout across the hinge | Chromium 125+ |
| `navigator.maxTouchPoints`, `(pointer: coarse)`, `(hover: none)` | touch vs mouse | Density and hit-target defaults | 🌐 All |
| **Permissions API** `navigator.permissions.query({name})` | current grant state of each capability, without prompting | A real "Privacy & Security" pane listing camera, mic, location, notifications, Bluetooth… with granted/denied/prompt badges | 🌐 All (feature names vary) |
| `navigator.userActivation`, `document.hasFocus()`, `visibilityState` ✅ | gesture and focus state | gate autoplay and prompts correctly | 🌐 All |

### B. Files and storage

| Integration | What it unlocks | Where it fits | Support |
|---|---|---|---|
| **File System Access**: `showDirectoryPicker` ✅, `showOpenFilePicker`, `showSaveFilePicker` | read + write real files and folders. Handles are structured-cloneable: store them in IndexedDB and call `handle.requestPermission()` next visit so mounted folders survive reloads | Files (in), Notepad "Save As…" to disk, Photos/Media "Open…", wallpaper from disk, Terminal `mount` | Chromium desktop 86+ † |
| Drag-and-drop with `DataTransferItem.getAsFileSystemHandle()` | drop a folder from Finder/Explorer onto the desktop → mounted read-write | Desktop and Files drop zones | Chromium (fallback `webkitGetAsEntry`, read-only: All) |
| **Origin Private File System** `navigator.storage.getDirectory()` + `createSyncAccessHandle()` in workers | fast private disk, GB-scale, real file semantics for WASM tools | Back the virtual FS with OPFS instead of IndexedDB blobs; SQLite/DuckDB/PGlite storage; Pyodide/v86 disks | 🌐 All (Chrome 86+, Safari 15.2+, Firefox 111+) † |
| `navigator.storage.persist()` | ask the browser never to evict this origin's data | Protect the user's notes, uploads and VM disks | 🌐 All † |
| **Storage Buckets API** | independent buckets with their own eviction priority | keep user documents safer than wallpaper cache | Chromium 122+ † |
| **Async Clipboard**: `read()` for images/HTML, `write()` images, custom `web ` formats | paste screenshots into Photos/Notepad, copy an image out of Photos, clipboard history app | Photos, Notepad, Files, a "Clipboard" menu-bar app | 🌐 All (Firefox `read()` shows a paste button; custom formats: Chromium) |
| **File Handling API** (manifest `file_handlers` + `window.launchQueue`) | double-click a `.md`, `.png`, `.mp4`, `.pdf` in the real OS → opens in the installed Lumina with the file handle | Notepad, Photos, Media, PDF viewer become real default apps | Chromium desktop, installed PWA |
| **Web Share Target** (manifest `share_target`) | the OS share sheet lists Lumina; receives text, URLs and files | "Send to Lumina" from a phone → lands in Files/Notepad | Chrome Android, ChromeOS, Windows Chromium |
| Web Share `navigator.share({ files })` | share a note or screenshot through the native share sheet | Notepad, Photos, Screen Recorder | Safari 15+ (files); Chrome Windows/ChromeOS 89+ and macOS 128+ (files), Linux unverified; Firefox desktop off by default † |
| **Background Fetch** | large downloads (AI models, VM images) that outlive the tab, with OS-level progress UI | "Downloads" app for WebLLM weights and v86 disk images | Chromium |
| Service Worker + Cache Storage | offline shell, precached apps, instant reboot | whole OS offline | 🌐 All |
| `<input type=file webkitdirectory multiple>`, `<input capture=environment>` | read-only folder import; camera capture on mobile | Files fallback for Firefox/Safari; Photos on phones | 🌐 All |
| Compression Streams, streaming `showSaveFilePicker().createWritable()`, fflate / zip.js / libarchive.js | zip/unzip/tar/7z in-browser, stream multi-GB exports without buffering | "Archive Utility", Files → "Compress", export the virtual FS as a zip | 🌐 All |
| IndexedDB ✅ (idb-keyval) / `localStorage` ✅ | key-value persistence | store (in) | 🌐 All |
| Web Locks API | single writer across tabs/windows | protect persistStorage when the OS is open in two windows | 🌐 All |

### C. Hardware and peripherals (permission-gated)

| Integration | What it unlocks | Where it fits | Support |
|---|---|---|---|
| **Web Bluetooth** `navigator.bluetooth.requestDevice()` | connect BLE devices: heart-rate bands, smart bulbs, ESP32 boards, sensors, toys; GATT read/write/notify | Bluetooth settings pane that really scans and pairs; heart-rate widget; BLE light control | Chromium desktop + Android † |
| **Web Serial** `navigator.serial` | serial consoles, Arduino/ESP32/RP2040 boards; **ESP Web Tools** flashes firmware from a web page | "Serial Monitor" / firmware flasher app | Chromium desktop + Android 148+, **Firefox 151+** (desktop) † |
| **WebUSB** `navigator.usb` | raw USB transfers; **ya-webadb** runs Android ADB in the browser (shell, install APK, file push, **scrcpy screen mirror**); DFU/WebDFU flashing | "Phone Link" app mirroring the visitor's Android phone in a window | Chromium desktop + Android |
| **WebHID** `navigator.hid` | HID devices: **Elgato Stream Deck** (`@elgato-stream-deck/webhid`), advanced gamepad features, keyboards, some mice | Stream Deck as a physical dock for Lumina apps | Chromium desktop |
| **Web MIDI** `navigator.requestMIDIAccess()` | keyboards, pads, Launchpad, sysex | "Synth" / piano app with Web Audio, Launchpad-driven launcher | Chromium, Firefox |
| **Gamepad API** + `vibrationActuator` haptics | controllers in games, rumble | Game Center (Breakout, Snake, TowerStack) with a pad | 🌐 All (haptics: Chromium, Safari) |
| Web NFC `NDEFReader` | read/write NFC tags | tap a tag to open a Lumina app | Chrome Android |
| **Geolocation** | coordinates (with accuracy), watch mode | Weather widget (Open-Meteo), Maps app, auto timezone | 🌐 All |
| DeviceOrientation / DeviceMotion | tilt, accelerometer, compass | parallax wallpaper, tilt-controlled games on phones | 🌐 All (iOS asks permission; Chrome 151+ adds `requestPermission()` too) |
| Generic Sensor API (Accelerometer, Gyroscope, Magnetometer, AmbientLightSensor) | typed high-rate sensors | same, smoother | Chromium (light sensor behind flag) |
| Vibration API | haptic ticks | button feedback on Android | Chrome Android, Firefox |
| **Screen Wake Lock** | keep the display on | while Media/Music/Benchmark run | 🌐 All |
| **Idle Detection** `IdleDetector` | user idle and screen-locked signals from the OS | real lock screen / screensaver trigger replacing the mousemove timer; "Away" status in the guestbook | Chromium 94+ (permission); Mozilla negative, WebKit not implementing † |
| Pointer Lock | raw mouse deltas, hidden cursor | first-person games, orbiting the Quantum widget | 🌐 All |
| **Keyboard Lock** `navigator.keyboard.lock()` (in fullscreen) | capture Esc, Tab, Alt/Cmd+Tab-class and Ctrl+W-class keys | a kiosk/"immersive" mode where OS shortcuts stay inside Lumina; working Alt+Tab app switcher | Chromium desktop 68+ † |
| **Local Font Access** `window.queryLocalFonts()` | enumerate the visitor's installed fonts, with SFNT table data | Fonts settings pane, Notepad font picker showing real system fonts, use their fonts in the UI | Chromium desktop 103+ † |
| **EyeDropper API** | pick a colour from anywhere on screen, outside the browser | Appearance accent picker | Chromium desktop |
| Contact Picker `navigator.contacts.select()` | pick names/emails/phones | share a note to a contact (mobile) | Chrome Android, Safari iOS |
| Screen Orientation lock | force landscape | Game Center on phones | Mobile browsers |
| Web Smart Card, Web Printing, Direct Sockets, Web Bluetooth Scanning | powerful, but only inside Isolated Web Apps | not for a public site (see §L) | Chromium IWA only |

### D. Media, capture and output

| Integration | What it unlocks | Where it fits | Support |
|---|---|---|---|
| **getUserMedia** (camera/mic) | webcam and microphone streams | "Photo Booth" app with canvas/WebGL filters; **mic-driven Visualizer with a real `AnalyserNode`** | 🌐 All |
| **getDisplayMedia** (+ `preferCurrentTab`, `selfBrowserSurface`, `systemAudio`, Region Capture `CropTarget`, Element Capture) | capture a screen, window or tab, with audio | "Screen Recorder" app (→ MediaRecorder → WebM/MP4); **capture our own tab's audio to feed the Visualizer with the actual YouTube spectrum** | 🌐 All desktop; tab audio, Capture Handle 102+, Region Capture 104+, Element Capture 132+: Chromium † |
| MediaRecorder | record streams to WebM/MP4 | Screen Recorder, Voice Memos, GIF maker | 🌐 All |
| **WebCodecs** (`VideoEncoder/Decoder`, `AudioEncoder/Decoder`, `ImageDecoder`) | hardware-speed encode/decode/transcode, frame-level access | video trimmer, thumbnail generator, AVIF/HEIC decode | Chromium, Safari 16.4+, Firefox 130+ |
| Web Audio ✅ (`AudioContext` in) + `AnalyserNode`, `AudioWorklet`, `MediaElementAudioSourceNode` | real FFT, custom DSP | Visualizer from mic, CORS-enabled streams (Jamendo, Radio Browser, Internet Archive), or tab capture; EQ in Music | 🌐 All |
| **Media Session API** | hardware media keys, headset buttons, OS now-playing card with artwork, lock-screen controls | Music app driven by real keyboard media keys and the OS media widget | 🌐 All |
| Picture-in-Picture (`video.requestPictureInPicture()`) | float a video above every app | Media Player | Chromium, Safari (Firefox: own UI only) |
| **Document Picture-in-Picture** `documentPictureInPicture.requestWindow()` | float **any HTML** in an always-on-top window | pop out NowPlaying, Clock, Terminal, a widget; keeps running while the visitor works elsewhere | Chromium 116+, **Firefox 151+** † |
| **Remote Playback API** / **Google Cast Web Sender SDK** | AirPlay / Chromecast the video or the music | Cast button in Media and Music | Remote Playback: Safari, Chrome Android · Cast SDK: Chromium desktop |
| Presentation API | drive a second display / Chromecast with a web page | "Present" the resume slides | Chromium |
| **Web Speech**: `speechSynthesis` (system voices) / `SpeechRecognition` (cloud or on-device) | TTS, dictation, voice commands | Terminal `say`, voice-driven Spotlight ("open terminal"), read a note aloud | TTS: All · ASR: Chromium (on-device since 139), Safari (`webkitSpeechRecognition`, no on-device control); Firefox none † |
| Shape Detection `BarcodeDetector` (+ Face/Text behind flags) | QR/barcode decode from camera frames | scan a QR to open it in Flow-Net | Chromium, Safari 17+ (barcode) |
| Image Capture API (`ImageCapture.takePhoto`, torch, zoom) | full-resolution photos and camera controls | Photo Booth | Chromium |
| Fullscreen API | true fullscreen shell | "Immersive mode" toggle (pair with Keyboard Lock) | 🌐 All |
| WebXR Device API (+ hand tracking, hit test, DOM overlay) | VR/AR sessions | walk around the desktop in VR; AR wallpaper preview | Chromium Android/desktop, Quest Browser, visionOS Safari |
| Web Audio Output Devices `setSinkId`, `selectAudioOutput()` | choose speakers/headphones per app | Sound settings pane with a real output picker | Chromium (selectAudioOutput: Firefox too) |

### E. Behaving like an installed app (PWA) — currently absent

| Integration | What it unlocks | Where it fits | Support |
|---|---|---|---|
| **Web App Manifest + Service Worker** (e.g. `vite-plugin-pwa`) | installable; own window without browser chrome; dock/taskbar/Start icon; splash; offline; `standalone` display | Foundation for every row below | 🌐 All (install: Chromium desktop/Android, Safari macOS 14+ "Add to Dock", iOS "Add to Home Screen"; Safari honours display mode, name, theme_color and start_url but not WCO/tabbed) |
| **`display_override: ["window-controls-overlay"]`** + `env(titlebar-area-*)` + `app-region: drag` | our MenuBar *is* the OS window's title bar; custom traffic lights; draggable region | MenuBar/Taskbar as native window chrome | Chromium desktop 105+ † |
| `display_override: ["tabbed"]` / `"borderless"` | tab strip inside the app window / no frame at all | multiple Lumina "sessions" as tabs | tabbed: ChromeOS only, behind a flag elsewhere; borderless: IWA only † |
| **Web Install API** `navigator.install()` | our own "Install Lumina" button; can also install *other* web apps by manifest id | onboarding; an "App Store" that installs real PWAs | Chromium; origin trial ended, targeted for Chrome 156 — feature-detect only; WebKit opposes † |
| `beforeinstallprompt` | custom install button (Chromium's current mechanism) | onboarding | Chromium |
| `shortcuts` | right-click the dock/taskbar icon → Terminal, Files, Music | jump list | Chromium desktop/Android |
| `file_handlers`, `protocol_handlers` (`web+lumina://`), `share_target`, `launch_handler: { client_mode: "focus-existing" }` | open files, links and shares in the installed OS; single-instance behaviour | see §B | Chromium desktop |
| **Badging API** `navigator.setAppBadge(n)` | unread count on the dock icon | Mail / guestbook unread, achievements | Chromium desktop, Safari 17+ (installed) |
| **Notifications + Web Push** (VAPID; server: `web-push` on a Worker) | OS-native toasts even when Lumina is closed | achievement unlocked, guestbook replies, "your build finished" | 🌐 All (iOS: installed PWA) |
| Periodic Background Sync / Background Sync | refresh feeds in the background; retry queued sends offline | Social widget snapshot, Mail outbox | Chromium (Periodic 80+, installed PWA; Background Sync 49+); Firefox/Safari negative † |
| Notification Triggers | scheduled local notifications | (abandoned by Chrome, do not plan on it) † | none |
| `widgets` manifest member (Adaptive Cards) | Clock / NowPlaying / Monitor as **Windows 11 Widgets Board** widgets | widgets outside the browser | Edge 108+ on Windows 11, still labelled experimental (docs updated Sep 2026) † |
| `edge_side_panel` | Lumina docked in Edge's side panel | companion mode | Edge |
| `scope_extensions`, `id`, `screenshots`, `categories`, `related_applications` | richer install dialog, store metadata, multi-origin scope | polish | Chromium |
| **PWABuilder** / Bubblewrap (TWA) / Meta Quest PWA | package the PWA for the Microsoft Store, Google Play and Quest store with no native code | store presence | tooling |
| Speculation Rules, cross-document View Transitions, Navigation API | app-like transitions when deep-linking into apps | polish | Chromium (+Safari partial) |

### F. Windowing and input for a web OS

| Integration | What it unlocks | Where it fits | Support |
|---|---|---|---|
| **Window Management API** `getScreenDetails()` | enumerate monitors with geometry/labels; `window.open` on a chosen screen; fullscreen on a specific screen; `currentscreenchange` | drag a Lumina window off the edge → it opens on the visitor's second monitor; "Displays" pane with the real arrangement | Chromium desktop 100+ † |
| **Multi-window OS**: `window.open` (popup with `popup=1,width,height,left,top`) + `BroadcastChannel` / `SharedWorker` + Web Locks | each Lumina window can pop out into a real OS window sharing one Zustand store (Figma-style) | "Pop out" button in the Window title bar | 🌐 All |
| Document PiP | always-on-top floating widget/app | see §D | Chromium, Firefox 151+ |
| Keyboard Lock + Fullscreen | capture Esc / Alt+Tab-class combos | Alt+Tab switcher that really works | Chromium desktop |
| Virtual Keyboard API `navigator.virtualKeyboard` + `env(keyboard-inset-*)` | control the on-screen keyboard overlay geometry | Terminal / Notepad on phones and touch laptops | Chromium Android/Windows |
| `<dialog>` / Popover top layer, CSS anchor positioning | menus above every window without z-index wars | context menus, Spotlight | 🌐 All (anchor: Chromium/Safari) |
| Pointer Events `getCoalescedEvents()`, `pointerrawupdate`, pressure/tilt | high-rate pen input | Paint / whiteboard app | 🌐 All (rawupdate: Chromium) |
| `scheduler.postTask` / `scheduler.yield` / `requestIdleCallback` / `isInputPending` | keep the shell at 60 fps under Benchmark/AI load | shell scheduling | Chromium (rIC: Firefox too) |
| `navigator.keyboard.getLayoutMap`, `KeyboardEvent.code` | layout-aware shortcuts | Keyboard settings | Chromium |
| Long Animation Frames API, `PerformanceObserver` | find jank in the wild | Dashboard "Performance" tab | Chromium |

### G. Identity, credentials, payments

| Integration | What it unlocks | Where it fits | Support |
|---|---|---|---|
| **WebAuthn / passkeys** (`navigator.credentials.create/get`, conditional UI autofill, **PRF extension**, `signalAllAcceptedCredentials`) | Touch ID / Face ID / Windows Hello / phone-as-key unlock. PRF returns a per-credential secret → encrypt the virtual FS at rest with WebCrypto | LoginScreen becomes a real biometric lock; "FileVault" for Files/Notes | 🌐 All |
| WebCrypto `crypto.subtle` | AES-GCM, ECDH, HKDF, signing | encrypted notes, signed exports | 🌐 All |
| Credential Management (`PasswordCredential`) | remember the guest name | Guestbook | Chromium |
| **FedCM** `navigator.credentials.get({ identity })` | "Sign in with Google/…" via a browser-mediated account picker, no redirects, no third-party cookies | account picker on the LoginScreen | Chromium, Firefox (partial) |
| Google Identity Services / **MSAL.js** (Microsoft) / Sign in with Apple JS / GitHub OAuth (via proxy) | OAuth PKCE in the browser; tokens for Drive/Calendar/Gmail-readonly and Microsoft Graph (Outlook, OneDrive, Calendar, To Do) | Mail, Calendar, Files → cloud drives | 🌐 All (libraries) |
| Puter auth ✅ | keyless accounts + cloud FS + KV | in | 🌐 All |
| Web OTP `navigator.credentials.get({ otp })` | SMS code autofill | 2FA demo | Chrome Android (Safari via autofill) |
| **Payment Request API** / Apple Pay JS / Google Pay API | native pay sheets with one tap | "Tip jar" app | Chromium, Safari (Apple Pay); Firefox off |
| Stripe Checkout / Payment Links, **Razorpay**, Lemon Squeezy / Polar / Paddle (merchant of record), Ko-fi / Buy Me a Coffee widgets, GitHub Sponsors | hosted payments, zero PCI scope | "Support" app | any |
| **Digital Credentials API** `navigator.credentials.get({ digital })` | request a verified ID / mobile driver's licence from the OS wallet | identity demo only, rarely appropriate | Chrome 141+ (OpenID4VP + ISO 18013-7), Safari 26+ (mdoc only), Firefox not shipped † |
| Wallets: EIP-6963 discovery, MetaMask SDK, WalletConnect (Reown AppKit), Solana Wallet Standard; ENS name/avatar lookup | wallet login, ENS avatar as the user avatar, sign-in-with-Ethereum | LoginScreen "Connect wallet" | any (with a wallet installed) |
| Storage Access API, CHIPS partitioned cookies | third-party embeds keep their login (YouTube, Spotify, Google Docs) | Flow-Net embeds | 🌐 All |
| Web Monetization (Interledger) | streaming micropayments from visitors with a wallet extension | — | extension-based |

### H. On-device AI (no key, private, offline)

| Integration | What it unlocks | Where it fits | Support |
|---|---|---|---|
| **Chrome built-in AI (Gemini Nano)**: Prompt API `LanguageModel`, Summarizer, Translator, Language Detector, Writer / Rewriter, Proofreader | local LLM tasks in a few lines, model downloaded and managed by the browser; Prompt API takes images and audio | Lumina AI "offline" mode, `summarize` / `translate` commands, Notepad proofreading, Spotlight answers | Chrome desktop only (not Edge, not mobile). Translator / Language Detector / Summarizer stable since 138; **Prompt API stable for websites since Chrome 148**; Writer / Rewriter / Proofreader flag-only. Needs 22 GB free disk and a >4 GB VRAM GPU, or 16 GB RAM + 4 cores on CPU † |
| **WebLLM** (`@mlc-ai/web-llm`) | Llama 3.x / Phi / Gemma / Qwen 1–8B fully in WebGPU; OpenAI-compatible API, streaming, JSON mode, service-worker caching of weights | Lumina AI "Local model" toggle with a model download manager (pair with Background Fetch) | WebGPU only (v0.2.85, Sep 2026): Chromium, Safari 26+, Firefox (Linux behind flag) † |
| **Transformers.js v4** ✅ (embeddings in) | **Whisper** (dictation/transcription), **Kokoro-js** (82M-param TTS), SmolVLM / Florence-2 / Moondream (describe images), **RMBG** (background removal), Depth-Anything (parallax depth maps), CLIP (image search), TrOCR (OCR), SmolLM/Qwen chat | Photos "Describe" / "Remove background" / "Search by meaning", Terminal `whisper` and `say`, Notepad dictation, Spotlight semantic + image search, depth-parallax wallpapers | 🌐 All. v4.3 (Sep 2026): WASM is still the default backend, pass `device: 'webgpu'` (works on Safari 26+) † |
| ONNX Runtime Web / TensorFlow.js / **MediaPipe Tasks** (hands, face mesh, pose, gestures, selfie segmentation) | real-time vision from the webcam | gesture control of the OS (pinch to click, swipe to switch apps), Photo Booth effects, background blur | 🌐 All (WebGL/WASM/WebGPU) |
| **WebNN** | NPU/GPU acceleration for ORT Web on Copilot+ PCs and Macs | faster local inference | Chromium flag only; origin trial ended without shipping † |
| Web Speech on-device ASR (`processLocally`, `SpeechRecognition.available()`) | private dictation with no model management | Spotlight voice | Chrome 139+ (`available()`, `install()`, `processLocally`) †; Safari has no on-device control |
| **Local LLM servers on the visitor's machine**: Ollama (`:11434`), LM Studio (`:1234`), llama.cpp server, Jan, GPT4All | use the visitor's own models over localhost HTTP (they set `OLLAMA_ORIGINS`; Chrome's Local Network Access prompt) | Lumina AI → "Use my Ollama" setting with model list | 🌐 All (visitor setup) |
| **Cloud AI without shipping a key**: OpenRouter OAuth PKCE (visitor brings their key), **Puter AI `puter.ai.chat()`** (visitor-pays; SDK already loaded ✅), Pollinations.ai (free, no key, text + images), Hugging Face Inference (visitor token), Gemini/Anthropic/OpenAI behind a Worker proxy | remove the bundled `VITE_GEMINI_API_KEY`; add an image generator app | Lumina AI, "Imagine" app | 🌐 All |
| Voice agents: OpenAI Realtime / Gemini Live / ElevenLabs Conversational (ephemeral tokens via proxy) over WebRTC | full-duplex voice with Lumina AI | Lumina AI voice mode | 🌐 All |
| Chrome Prompt API tool calling + WebMCP (`navigator.modelContext`) | expose Lumina's own apps as tools to browser agents | agents can "open Terminal, run X" | Chrome 149 origin trial † |

### I. Real software inside a window (WebAssembly)

| Integration | What it unlocks | Where it fits | Support |
|---|---|---|---|
| **Pyodide** (CPython 3.13, numpy/pandas/matplotlib via micropip, FS on OPFS/IndexedDB) | a real Python REPL and scripts, no SAB needed | Terminal `python`, "Notebooks" app via **JupyterLite** | 🌐 All |
| **WebContainers** ✅ wired 🟡 🔒 | real Node.js + npm + Vite dev server in-browser; commercial sites need a licence | Terminal `node`/`npm` — cannot boot today; needs the `/lab` isolated-window route from Gates, item 3 | Chromium; Firefox and Safari 16.4+ marked beta. Licence required for production for-profit use, prototypes free, charges beyond 10k API requests/month, no written open-source exemption † |
| **CodeSandbox Nodebox** | Node.js-compatible runtime that does **not** need SAB (npm packages, no native addons) | Terminal `node` fallback that works in the main document | 🌐 All |
| Wasmer JS SDK 🔒 / Runno / webassembly.sh | run WASI packages from a registry (python, php, sqlite, bash, cowsay…) | `lumina-get install` that installs real packages | Chromium, Firefox |
| container2wasm 🔒 | x86/RISC-V Docker images (Alpine, Ubuntu, Python) in the browser | "Docker" app | WASM browsers |
| **v86** | x86 emulator, **no SAB required**: boots Alpine/Buildroot/Arch Linux, FreeDOS, Windows 95/98/2000, ReactOS, KolibriOS, Haiku; save/restore state; network via a WebSocket proxy | "Virtual Machine" app; the honest way to get a real Linux shell in the main document | 🌐 All |
| JSLinux (Bellard) / **WebVM** (CheerpX 🔒, full Debian with apt; personal use licence) | RISC-V/x86 Linux; a real Debian | VM app | 🌐 All / Chromium + Firefox |
| Boxedwine | Wine compiled to WASM: runs 32-bit Windows apps (faster with SAB, works without) | "Windows apps" demo | 🌐 All |
| **EmulatorJS** ✅ disabled (RetroArch cores: NES/SNES/GBA/N64/PS1/DOS/arcade), **js-dos** (DOSBox / DOSBox-X), **Ruffle** (Flash), QuakeJS, wasm-doom, OpenTTD web | classic games and software; EmulatorJS and js-dos run without isolation with threads off | RetroArcade re-enabled, DOOM, Flash games | 🌐 All |
| **SQLite WASM** (`@sqlite.org/sqlite-wasm` on OPFS), **DuckDB-WASM**, **PGlite** (Postgres in WASM) | real databases persisted in OPFS | "Database" app with a SQL console; a real backing store for Files/Notes/Spotlight | 🌐 All |
| **ffmpeg.wasm** (single-thread core; 🔒 for the multithread core), libav.js, Mediabunny | convert / trim / remux video and audio | "Converter" app, Screen Recorder export to MP4 | 🌐 All |
| Squoosh codecs (mozjpeg, avif, webp, oxipng), wasm-vips, ImageMagick-WASM, Photon | resize / compress / convert images | Photos "Export…", wallpaper optimiser | 🌐 All |
| **PDF.js**, pdf-lib, mupdf.js | view, annotate, merge, fill PDFs | "Preview" for `Abhimanyu.pdf` and the visitor's PDFs | 🌐 All |
| Tesseract.js | OCR | Photos "Copy text" | 🌐 All |
| Typst.ts, Pandoc-WASM, SwiftLaTeX | typesetting and document conversion | Notepad → PDF/DOCX export | 🌐 All (LaTeX 🔒 in places) |
| 7z-wasm / libarchive.js / fflate / zip.js | archives incl. rar/7z | Archive Utility | 🌐 All |
| Godot 4 web export 🔒 (threads), Unity WebGL, Phaser, PlayCanvas, Babylon.js, Three.js ✅ | 3D games and scenes | Game Center, wallpapers | 🌐 All |
| WebR (R), ruby.wasm, php-wasm, WebPerl, Blazor (.NET), Go/TinyGo, Kotlin/Wasm, Swift WASM | more interpreters | polyglot Terminal | 🌐 All |
| Wasmer Edge / **Piston** / Judge0 / Godbolt Compiler Explorer API | server-side execution for 50+ languages | Terminal `run main.cpp` | any (network) |

### J. Embeddable tools (drop-in apps for the OS)

| Integration | What it unlocks | Where it fits | Support |
|---|---|---|---|
| **Monaco Editor** / CodeMirror 6 | the VS Code editing engine with TypeScript IntelliSense | "Code" app; Terminal `vim` replacement; Notepad code mode | 🌐 All |
| **xterm.js** (+ fit, webgl, search, web-links addons) | the terminal emulator VS Code uses | front-end for Pyodide / v86 / Nodebox / SSH / cloud sandbox | 🌐 All |
| **Sandpack** (CodeSandbox) / **StackBlitz SDK** embed | live React/Vue/vanilla playground with preview; StackBlitz brings a whole IDE (its WebContainers still need the host page isolated) | "Playground" app; live demos in Projects | 🌐 All |
| **Excalidraw** / **tldraw** (React components) | whiteboard, diagrams, multiplayer-ready | "Freeform" app | 🌐 All |
| **jspaint** (MS Paint clone, iframe + postMessage API), miniPaint, **Photopea** (iframe API), Pintura, Filerobot, TOAST UI Image Editor | paint and photo editing | "Paint" app; Photos "Edit" | 🌐 All |
| **Webamp** (Winamp 2 clone with skins) + **Butterchurn** (Milkdrop presets in WebGL) | an iconic player and a real preset visualizer | Music alternate skin; Visualizer on mic/tab audio | 🌐 All |
| Univer / Luckysheet / Handsontable / Jspreadsheet | spreadsheets with formulas | "Numbers" app | 🌐 All |
| TipTap / Lexical / BlockNote / Milkdown / Quill | rich-text and block editors, collaborative with Yjs | Notepad → "Pages" | 🌐 All |
| Reveal.js / Marp / Slidev | slides from markdown | "Keynote" app for resume and projects | 🌐 All |
| diagrams.net (`embed.diagrams.net`), Mermaid, Kroki | diagrams | Docs app | 🌐 All |
| **JupyterLite** (Pyodide + xeus kernels, full Lab UI) | notebooks | "Notebooks" app | 🌐 All |
| OnlyOffice / Collabora Online (self-hosted) | full office suite in an iframe | "Office" | self-hosted |
| **MapLibre GL** + OpenFreeMap / Protomaps (free tiles, no key) or Google Maps JS / Mapbox | maps, geocoding via Nominatim/Photon | "Maps" app with Geolocation | 🌐 All |
| Cal.com / Calendly / Google Appointment inline embeds | booking | "Book a call" app | 🌐 All |
| **Giscus** / utterances (GitHub Discussions-backed) | real comments with GitHub identity, no server | guestbook backend | 🌐 All |
| Video.js / Vidstack / hls.js / dash.js / Shaka | HLS/DASH streaming, subtitles, chapters | Media Player | 🌐 All |
| epub.js, PDF.js viewer, CBZ via zip | readers | "Books" app | 🌐 All |
| Tone.js, Strudel (live-coding music), Wavesurfer.js, Web MIDI | synths, DAW-lite, waveforms | "GarageBand-lite" | 🌐 All |
| YouTube ✅, Spotify / SoundCloud / Bandcamp embeds, Figma, CodePen, Replit, Twitch, Google Docs/Slides "publish to web", Observable | content embeds | Flow-Net, Projects | 🌐 All |
| PICO-8 / TIC-80 / LÖVE / Godot / Unity web exports; **Internet Archive** embeds (thousands of DOS/console titles) | more games | Game Center | 🌐 All |
| Three.js ✅ / R3F ✅, Babylon.js, PlayCanvas, Spline | 3D scenes | wallpapers | 🌐 All |
| Emoji Mart, Iconify, Lucide ✅ | pickers | Notepad, Files | 🌐 All |

### K. Real machines behind the window (remote)

| Integration | What it unlocks | Where it fits | Support |
|---|---|---|---|
| **noVNC** (websockify) / Apache Guacamole / RustDesk web / Kasm Workspaces / linuxserver.io **Webtop** / GTK Broadway | stream a real desktop (VNC/RDP) into a window; a small VM (Fly Machines, Hetzner, Oracle free tier) gives visitors a real Linux desktop | "Remote Desktop" app | 🌐 All |
| **ttyd** / wetty / gotty / sshwifty / Cloudflare Access browser SSH | a real shell over WebSocket → xterm.js | Terminal `ssh lab` that is real | 🌐 All |
| **code-server** / Coder / OpenVSCode Server (self-hosted, iframe-able) · vscode.dev / github.dev (link out) | real VS Code in a window | "Code" app | 🌐 All |
| **Cloud sandboxes with APIs**: E2B, Daytona, Modal, Cloudflare Sandbox SDK / Containers, Vercel Sandbox, Fly Machines, CodeSandbox SDK, Northflank | per-visitor ephemeral Linux with Node/Python/git, seconds to start, billed per second — makes `node` / `python` / `git` real without SAB | Terminal backend behind a small Worker API with quotas | any |
| GitHub Codespaces / Gitpod / Firebase Studio / Replit | link out to a real dev environment of the repo | Projects "Open in Codespace" | any |
| **Home Assistant** WebSocket API, OctoPrint, **WLED**, Tasmota / ESPHome, Philips Hue (cloud API) | control the visitor's own devices (they enter host + token; Local Network Access prompt for LAN hosts) | "Home" app | 🌐 All |
| Steam Web API, Discord `widget.json`, Twitch Helix, Last.fm ✅, ListenBrainz | presence / now-playing / online data | Social widget | any |
| Chromecast (Cast SDK), AirPlay (Remote Playback), Sonos Control API, Spotify Connect (Web API "transfer playback") | send media to the visitor's speakers and TVs | Music / Media cast menu | see §D |

### L. Beyond the browser sandbox (native bridges) — the only way to get real "computer access"

| Integration | What it unlocks | Where it fits | Support |
|---|---|---|---|
| **Companion browser extension** (MV3; Chrome/Edge/Firefox/Safari) + `externally_connectable` + **Native Messaging** host | site ↔ extension ↔ local binary: real CPU/GPU/temps/processes (e.g. `systeminformation`), read/write anywhere, launch apps, real browser tabs/bookmarks/history, screenshots, global shortcuts; extension `fetch` also lets Flow-Net open sites that forbid framing | "Lumina Helper" extension: real Task Manager and neofetch, Flow-Net that opens anything, "Open in VS Code" | 🌐 All (visitor installs) |
| **Local helper daemon** on `127.0.0.1` (Go/Rust/Node; WebSocket/HTTP; pairing token; origin allow-list) — the Discord RPC / Figma font-helper / Arduino Create Agent / Wallpaper Engine pattern | same powers without an extension; `ws://127.0.0.1` is allowed from HTTPS; Chrome shows a Local Network Access prompt | "Lumina Agent" download in Settings → live system stats, a **real PTY shell** streamed to xterm.js, browse the real disk in Files | 🌐 All (visitor installs) |
| Custom URL scheme (`lumina://…` registered by the helper) + `navigator.registerProtocolHandler('web+lumina', …)` | deep links between the real OS and the web OS | "Open in Lumina Desktop" | any / Chromium + Firefox |
| **Tauri v2** desktop build of the same React bundle (plugins: fs, shell, os, process, tray, global-shortcut, autostart, notification, updater, deep-link, window-state, clipboard, dialog, sql, store, websocket, upload, http) · or **Electron** (+ `node-pty`, `systeminformation`), Neutralinojs, Wails, Electrobun · **Pake** wraps a URL into a Tauri app in one command | full native access: real terminal, real files, tray icon, autostart, multiple native windows, no browser limits at all | "Lumina Desktop" download; Terminal is a real shell there | Windows / macOS / Linux |
| Capacitor / Tauri mobile | iOS/Android apps with native plugins (biometrics, haptics, BLE, filesystem, push, share, camera) | phone edition | mobile |
| PWABuilder / Bubblewrap (TWA) / Microsoft Store PWA / Meta Quest PWA | store listings without a wrapper | distribution | tooling |
| **Isolated Web Apps** (Chromium; policy-installed; Direct Sockets TCP/UDP, Controlled Frame, borderless, Web Bluetooth scanning, higher permission ceilings) | very powerful, but not installable from a public URL | not for a portfolio | Chromium, enterprise-managed devices only (dev-mode flag otherwise) † |
| Chrome DevTools Protocol / Playwright / Puppeteer (driven from the helper) | automate the visitor's real browser | — | via helper |

### M. Services and accounts (third-party APIs)

| Domain | Integrations | What they unlock in Lumina |
|---|---|---|
| **Music & media** | **Spotify Web Playback SDK + Web API** (Premium listeners; PKCE), **Apple MusicKit JS** (developer token; subscribers), SoundCloud Widget API, Bandcamp / Deezer embeds, **Jamendo / Free Music Archive / Radio Browser** (free, CORS-friendly streams), Podcast Index / iTunes Search, **Internet Archive** (audio/video/software, CORS), Plex / Jellyfin / Navidrome (Subsonic API — visitor's own server), YouTube Data API v3, Last.fm ✅ (+ scrobbling after auth), ListenBrainz, **MusicBrainz + Cover Art Archive** (metadata, free), **LRCLIB** (synced lyrics, free, CORS), Genius (proxy) | Music becomes a real player of the visitor's library; CORS-clean streams give the Visualizer a real `AnalyserNode` without capture prompts; radio and podcast apps; synced lyrics in FullscreenPlayer |
| **Cloud files** | **Google Drive Picker + Drive API**, **Dropbox Chooser/Saver**, **OneDrive File Picker / Microsoft Graph**, Box, **WebDAV** (Nextcloud, Synology, ownCloud), S3-compatible (R2, B2, MinIO) via presigned URLs, remoteStorage.js, Solid Pods, Puter ✅, IPFS via Helia (in-browser node) + Pinata/Storacha | mount real drives in Files next to the virtual FS; Photos/Media open cloud files |
| **Developer** | GitHub REST/GraphQL ✅ (build-time) → runtime OAuth (device flow via proxy) for the visitor's own repos, gists, notifications, Actions status; GitLab; **npm registry** (CORS ok — `lumina-get search` becomes real); **jsDelivr / esm.sh dynamic `import()`** (an App Store that installs real ESM apps from npm); PyPI / crates.io; Vercel / Netlify deploy hooks; Bundlephobia; Shields.io | real package manager in the Terminal, a real App Store, live project status in Projects |
| **Productivity** | Google Calendar / Tasks / Gmail-readonly (GIS token client; sensitive-scope verification), **Microsoft Graph via MSAL.js** (Outlook mail + calendar + OneDrive + To Do from one client-side OAuth), Notion (proxy), Todoist REST (CORS), Linear GraphQL, Trello, Cal.com / Calendly, iCal feeds (proxy), **Resend / Formspree / Web3Forms** (make Mail actually send, via a Worker) | Mail and a Calendar app with the visitor's real data; the portfolio's contact form really delivers |
| **Social & feeds** | **Bluesky AT Protocol** (public read, no key, CORS; OAuth to post), Mastodon (public timelines CORS; OAuth to post), **Hacker News Firebase API** (CORS), Reddit (proxy), RSS/Atom (proxy or rss2json), Dev.to / Hashnode (blog app), YouTube ✅, Twitch (embeds + Helix), Discord `widget.json` + Activities SDK, Telegram Login Widget, Giphy / Tenor, **Unsplash API** ✅ URLs (dynamic wallpapers with attribution), Pexels API, Bing daily image (proxy), NASA APOD, **Wikipedia / Wikidata REST** (CORS) | real feeds in the Social widget, a News app, Spotlight "instant answers" from Wikipedia, daily wallpapers |
| **Data & utilities** | **Open-Meteo** (weather + air quality; free; no key; CORS) with Geolocation, Nominatim / Photon geocoding, MapLibre + OpenFreeMap, Frankfurter (currency), CoinGecko / Finnhub (stocks/crypto widget), TMDB / OMDb (movies app), Open Library / Google Books, Wolfram Alpha (proxy), QuickChart, ipapi / ipinfo (approximate location with no prompt), Have I Been Pwned range API (k-anonymity password check) | Weather / Stocks / Clock widgets with real data, a Maps app, a "Password check" utility |
| **Comms** | **Matrix** (matrix-js-sdk; real chat on any homeserver), XMPP (converse.js), IRC via gateway, **Nostr** (public relays, serverless guestbook), **Jitsi Meet iframe API** / Daily / LiveKit (video calls), WebRTC P2P (PairDrop-style "AirDrop" between visitors; **Trystero** for serverless signalling), ntfy.sh (free push to phones), Twilio / Vonage (proxy), Discord / Slack webhooks (proxy) | a real Messages app, video calls, AirDrop between two visitors |
| **Realtime & collaboration** | **Liveblocks** (presence, cursors), **PartyKit / Cloudflare Durable Objects**, Supabase Realtime, Ably, Pusher, **Yjs** (+ y-webrtc / y-websocket), Automerge, Multisynq | see other visitors' cursors on the desktop; collaborative Notepad and Freeform; multiplayer games |
| **Backend glue** | **Supabase**, Firebase, Convex, InstantDB, PocketBase, Appwrite, **Cloudflare Workers + KV / D1 / R2 / Queues / Durable Objects** (key proxies, guestbook, cron), Vercel / Netlify Functions (already deploy targets ✅), Upstash Redis / QStash, Turso, Neon | real guestbook, real Mail, key proxies, scheduled snapshot refresh |
| **Payments & support** | Stripe, Razorpay, Lemon Squeezy, Polar, Paddle, Ko-fi / Buy Me a Coffee, GitHub Sponsors, Payment Request API (§G), Web Monetization, crypto wallets (§G) | "Support" app |
| **Push & notifications** | Web Push (VAPID via `web-push`), OneSignal, Firebase Cloud Messaging, Novu, ntfy | see §E |
| **Analytics & observability** | Plausible / Umami / PostHog (session replay) / Microsoft Clarity, Sentry / GlitchTip, Vercel Speed Insights, `web-vitals`, Cloudflare Web Analytics | Dashboard "Performance" tab with real field data |
| **Search** | **Orama** (in-browser full-text + vector; fits Spotlight with the existing MiniLM embeddings), MiniSearch / FlexSearch / Fuse.js, Pagefind, Meilisearch / Typesense / Algolia (server) | semantic Spotlight across files, docs, notes |
| **Smart home & devices** | Home Assistant, WLED, OctoPrint, Hue, Chromecast (Cast SDK), Sonos, Spotify Connect, **ESP Web Tools** (Web Serial flasher), **ya-webadb** (WebUSB Android), Elgato Stream Deck (WebHID), Launchpad (Web MIDI), BLE heart-rate (Web Bluetooth) | see §C and §K |

---

## 5. Fallbacks and notices for every non-universal capability

One row per capability family that is not 🌐. "Why" is the wording to put in the visitor-facing notice; confirm the live entry in the
standards-positions repositories before shipping, because positions move.

| Capability | Missing in | Why (for the notice) | Cross-browser fallback | Notice placement |
|---|---|---|---|---|
| File System Access pickers (`showOpenFilePicker`, `showDirectoryPicker`, `showSaveFilePicker`), dropped-folder handles | Firefox, Safari | Mozilla: negative (#154, persistent write access to the user's disk); WebKit: oppose (#28), implemented only the origin-private part | `<input type=file webkitdirectory multiple>` copies files in; save via download or Web Share; OPFS for Lumina's own storage | Replace "Mount folder" with the explanation (the existing `osAlert` in FileExplorer); label imported folders "copy, read-only" |
| Web Bluetooth, WebUSB, WebHID | Firefox, Safari | Both vendors declined to implement, citing device security and fingerprinting (Mozilla: negative; WebKit: oppose for Bluetooth #570 and USB #68, concerns for WebHID #510 with oppose proposed 2026-09-14) | none for hardware; a demo mode with simulated devices, clearly labelled as simulated | Inline panel replacing the Scan / Connect button, listing the browsers where it works |
| Web Serial | Safari (Firefox 151+ has it) | WebKit opposed | none | Same inline panel |
| Web MIDI | Safari | Not implemented; device enumeration is a fingerprinting surface | on-screen keyboard, QWERTY-to-notes; the Web Audio synth itself works | Panel in the Synth app's device picker |
| Compute Pressure, Battery Status, Network Information, `deviceMemory`, UA Client Hints | Firefox, Safari (Firefox removed Battery in 52; WebKit opposes Compute Pressure) | Privacy / fingerprinting positions | Universal facts only: cores, `storage.estimate()`, screen, WebGPU adapter, WebGL renderer, `navigator.onLine` | Per-metric label "not exposed by {Browser}" in Dashboard / Task Manager / neofetch; never a substitute number |
| Idle Detection | Firefox, Safari | Mozilla: negative, surveillance risk (#453); WebKit: not implementing, no positions issue (webkit.org/tracking-prevention) | existing mousemove/keydown timer + Page Visibility | One line in Screensaver settings: "using in-page activity; {Browser} doesn't expose the system idle state" |
| Keyboard Lock | Firefox, Safari | Mozilla: negative on `navigator.keyboard.lock` (#196) but positive on the fullscreen keyboard-lock option (#1385); WebKit: concerns (#182), fullscreen keyboard lock #481 unlabelled | Fullscreen API only | Toast on entering immersive mode: "Esc and Alt+Tab will leave immersive mode in {Browser}" |
| Window Management (`getScreenDetails`) | Firefox, Safari | Not implemented; monitor topology is a fingerprinting surface | `window.open` at default position | Displays pane: "{Browser} doesn't expose the monitor layout; showing this screen only" |
| Document Picture-in-Picture | Safari (Firefox 151+ has it) | WebKit: concerns (#41; oppose proposed 2026-04-23, not yet labelled) | `window.open` popup with the same content; loses always-on-top only | Tooltip on the pop-out button |
| Local Font Access | Firefox, Safari | Not implemented; installed-font enumeration is a fingerprinting surface | curated font list + `document.fonts.check()` probes for common system fonts | Fonts pane header: "showing common fonts; {Browser} doesn't expose the installed list" |
| EyeDropper | Firefox, Safari | Not implemented (reads pixels outside the page) | native `<input type=color>` | Hide the pipette; tooltip |
| Window Controls Overlay, `tabbed`, `file_handlers`, `protocol_handlers` (manifest), `share_target`, `launch_handler`, `shortcuts`, Periodic Background Sync, Background Fetch, Web Install API, `widgets` | Firefox (no desktop install at all), Safari (plain standalone install only) | Firefox dropped desktop PWA install; WebKit implements the manifest core but opposes the install API and hasn't shipped the extras | Safari: Add to Dock / Add to Home Screen gives a standalone window, offline and push; Firefox: bookmark or the "taskbar tabs" experiment; foreground fetch instead of background | An **Install Lumina** pane that detects the browser, shows its install steps, and lists exactly which extras will be missing and why |
| Badging | Firefox | Not implemented | none (cosmetic) | Note in the Install pane only |
| Web Share with files | Firefox desktop, Chrome on Linux (unverified) | Firefox desktop ships Web Share off by default and without files | download + copy link | Show "Download" instead of "Share" |
| Chrome built-in AI (Gemini Nano) | Edge, Firefox, Safari, all mobile | Proprietary to Chrome desktop; Mozilla negative, WebKit opposed; needs 22 GB free disk | WebLLM (WebGPU, all engines) → Transformers.js small models (WASM) → cloud via proxy / Puter AI | Model picker shows "Built-in (Chrome desktop only)" greyed, with the reason and the requirement |
| Web Speech recognition (cloud or on-device) | Firefox | Never shipped `SpeechRecognition` | Whisper via Transformers.js, on-device everywhere | Badge "on-device Whisper" rather than a warning; notice only if the model download is declined |
| Tab-audio capture (`getDisplayMedia` audio, `preferCurrentTab`), Region / Element Capture | Firefox, Safari | Not implemented | microphone input or CORS-enabled streams (Jamendo, Radio Browser, Internet Archive) for the Visualizer; whole-screen capture still works for recording | Source picker explains the options |
| Background Fetch, Storage Buckets | Firefox, Safari | Not implemented | foreground fetch + Cache API; `persist()` on the single default bucket | "Keep this tab open while downloading" progress toast |
| Payment Request | Firefox (off by default) | Firefox disabled it after shipping | Stripe / Razorpay hosted checkout | none needed; the fallback is complete |
| FedCM | Safari; Firefox partial | WebKit prototyping only | classic OAuth redirect | none needed |
| WebGPU | Firefox on Linux (flag), older Chrome on Linux | Driver allow-lists still rolling out | WASM / WebGL code paths (Transformers.js WASM, canvas 2D wallpapers) | Notice names the flag `dom.webgpu.enabled` for Firefox on Linux |
| WebCodecs | none now (Firefox 130+, Safari 16.4+) | — | ffmpeg.wasm single-thread core for older builds | none |
| Presentation API / Google Cast SDK | Firefox, Safari | Cast is Chromium-only; Safari has AirPlay through Remote Playback instead | offer Remote Playback (AirPlay) on Safari; nothing on Firefox | Cast button shows whichever the browser supports; Firefox gets a tooltip |
| Gamepad haptics | Firefox | Not implemented | silent degrade | none (cosmetic) |
| Web NFC, Contact Picker, Web OTP, Digital Credentials | all desktop browsers; Firefox everywhere | Mobile-only APIs | none on desktop | Hide on desktop; one line in the Compatibility pane |
| Notifications, Badging, standalone window on iOS | Safari on iOS before Add to Home Screen | Apple gates these behind installation | none until installed | Prompt with the Add to Home Screen steps |
| Isolated Web App APIs (Direct Sockets, Web Smart Card, Web Printing, borderless, Bluetooth scanning) | every public browser | Only for enterprise-managed installs | none | Out of scope; never shown to visitors |

---

## 6. Verification notes

> Stance wording corrected 2026-09-17 after checking the labels with `gh`: Mozilla labels positions *negative*, not "harmful" or "opposed"; WebKit has recorded *concerns*, not *oppose*, for Keyboard Lock (#182), Document PiP (#41) and WebHID (#510), and has no positions issue for Idle Detection, Battery or Network Information (source: webkit.org/tracking-prevention). The live source of truth is `src/capabilities/positions.js`.

Rows marked † were cross-checked against 2025–2026 sources by a research pass on 2026-09-17; the table below records what it found.
Everything else is from training knowledge current to mid-2026. Before building any single row, spend two minutes on caniuse.com /
chromestatus.com; support moves quarterly.

Stable browsers on 2026-09-17: Chrome 152 (25 Aug 2026), Firefox 155, Safari 27 (14 Sep 2026). "—" = no support and no positive signal.

| Item | Status | Chrome / Edge | Firefox | Safari | Source |
|---|---|---|---|---|---|
| Translator, Language Detector, Summarizer | Stable (web + extensions) | Chrome 138+; Edge 148 ships Translator/Language Detector | — | — | [built-in-apis](https://developer.chrome.com/docs/ai/built-in-apis) |
| Prompt API (`LanguageModel`) | **Stable for websites** | Chrome 148 (May 2026; text/image/audio, JSON output). Extensions since 138. Edge: own Phi-4-mini API, Canary/Dev flags only | negative | oppose | [prompt-api](https://developer.chrome.com/docs/ai/prompt-api), [release 148](https://developer.chrome.com/release-notes/148) |
| Writer / Rewriter | Behind flag (origin trial ended) | flag `#writer-api-for-gemini-nano` | negative | no signal | [writer-api](https://developer.chrome.com/docs/ai/writer-api) |
| Proofreader | Behind flag (origin trial ended) | flag `#proofreader-api` | — | — | [proofreader-api](https://developer.chrome.com/docs/ai/proofreader-api) |
| Gemini Nano hardware | — | 22 GB free disk; GPU >4 GB VRAM *or* CPU with 16 GB RAM + 4 cores; Win 10/11, macOS 13+, Linux, Chromebook Plus; no Android/iOS | | | [get-started](https://developer.chrome.com/docs/ai/get-started) |
| Web Install API `navigator.install()` | Origin trial ended (143–148); target ship Chrome 156 | Chrome + Edge desktop; `<install>` element OT 148–153 | no signal | **oppose** | [chromestatus](https://chromestatus.com/feature/5183481574850560), [install element](https://developer.chrome.com/blog/install-element-ot) |
| Document Picture-in-Picture | Stable, two engines | 116+ | **151** (May 2026) | — | [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Document_Picture-in-Picture_API) |
| Window Controls Overlay | Stable (desktop PWAs) | 105+ | — | — | [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window_Controls_Overlay_API) |
| `display_override: tabbed` | ChromeOS only; flag elsewhere | ChromeOS shipped; Win/mac/Linux flag | — | — | [tabbed mode](https://developer.chrome.com/docs/capabilities/tabbed-application-mode) |
| Safari macOS installed web apps | Stable since Safari 17 | n/a | n/a | honours display mode, name, theme_color, start_url; no WCO/tabbed | [webkit.org](https://webkit.org/blog/14205/news-from-wwdc23-webkit-features-in-safari-17-beta/) |
| WebGPU | Stable in all engines (Linux lagging) | Linux: Intel Gen12+ (144), NVIDIA/Wayland (147), else flag | Windows 141, macOS ARM 145, all macOS 147; **Linux flag-only** in 152 | **Safari 26 shipped** (macOS/iOS/iPadOS/visionOS); 27 adds `clip_distances` | [gpuweb status](https://github.com/gpuweb/gpuweb/wiki/Implementation-Status) |
| `showOpenFilePicker` / `showDirectoryPicker` | Chromium only | 86+ | — | — | [MDN](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API) |
| OPFS `storage.getDirectory()` | Stable in all engines | 86+ | 111+ | 15.2+ | [MDN OPFS](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system) |
| Isolated Web Apps + Direct Sockets | Enterprise only (managed ChromeOS + partners); dev-mode flag 120+ | Direct Sockets IWA-only; 151 split into `local-network` / `loopback-network`; 152 adds IWA sub-apps | — | — | [IWA intro](https://developer.chrome.com/docs/iwa/introduction) |
| Compute Pressure | Stable, normal sites | 125+ (`cpu` only; window, workers, third-party iframes) | — | oppose | [compute-pressure](https://developer.chrome.com/docs/web-platform/compute-pressure) |
| Local Font Access `queryLocalFonts` | Chromium desktop | 103+ | — | — | [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Local_Font_Access_API) |
| Window Management `getScreenDetails` | Chromium desktop | 100+ | — | — | [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window_Management_API) |
| WebUSB / Web Serial / WebHID / Web Bluetooth | Serial: two engines; rest Chromium | Serial on **Android in 148**; others unchanged | **Web Serial 151** (desktop only); USB/HID/BT negative, none | none (Bluetooth/USB oppose; WebHID concerns #510) | [Firefox 151 notes](https://www.firefox.com/en-US/firefox/151.0/releasenotes/), [BCD Serial](https://github.com/mdn/browser-compat-data/blob/main/api/Serial.json) |
| WebNN | Origin trial ended (147–149); not shipped; next OT listed 156–160 | flag `#web-machine-learning-neural-network` | positive position, no implementation | no signal | [intent thread](https://groups.google.com/a/chromium.org/g/blink-dev/c/5CWKSChYo98), [webnn.io](https://webnn.io/en/learn/get-started/ot_registration) |
| Digital Credentials API | Stable, two engines | 141+ (OpenID4VP + ISO 18013-7 Annex C) | not shipped (code landing since 149; position negative) | 26+ (mdoc only; 27 renames to `DigitalCredentialGetRequest`) | [Chrome blog](https://developer.chrome.com/blog/digital-credentials-api-shipped), [BCD](https://github.com/mdn/browser-compat-data/blob/main/api/DigitalCredential.json) |
| Keyboard Lock / Idle Detection | Chromium only | Lock 68+ (desktop); Idle 94+ (Edge 114+) | — (negative: Lock #196, Idle #453; fullscreen keyboard lock #1385 positive) | — (Lock: concerns #182; Idle: not implementing, no issue) | [MDN Keyboard](https://developer.mozilla.org/en-US/docs/Web/API/Keyboard_API), [MDN Idle](https://developer.mozilla.org/en-US/docs/Web/API/Idle_Detection_API) |
| WebContainers licensing / browsers | Licence required for production for-profit use; prototypes free; "nominal charge beyond 10,000 API requests/month"; no written OSS/non-commercial exemption | full | supported, still labelled beta/alpha | 16.4+ supported, labelled beta | [enterprise](https://webcontainers.io/enterprise), [browser support](https://webcontainers.io/guides/browser-support) |
| WebLLM | v0.2.85 (8 Sep 2026); WebGPU is the only backend | WebGPU | WebGPU (see above) | WebGPU 26+ | [releases](https://github.com/mlc-ai/web-llm/releases) |
| Transformers.js | v4.0.0 GA 30 Mar 2026 (new C++ WebGPU runtime); latest v4.3.0, 16 Sep 2026 (structured output, WebGPU on Safari 26+). **WASM still default**; pass `device: 'webgpu'` | | | | [releases](https://github.com/huggingface/transformers.js/releases) |
| Web Speech on-device (`available()`, `install()`, `processLocally`) | Chromium only | **139+** stable; 150 OT for on-device `quality`; Edge Canary/Dev | — | `webkitSpeechRecognition` 14.1+ only; no on-device controls | [BCD](https://github.com/mdn/browser-compat-data/blob/main/api/SpeechRecognition.json) |
| Region Capture / Element Capture / Capture Handle | Chromium desktop | CropTarget 104, RestrictionTarget 132, Capture Handle 102; 152 adds an audio preference to `getDisplayMedia` | — | — | [MDN Screen Capture](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Capture_API) |
| Notification Triggers / Periodic Background Sync / Background Fetch | Triggers dead (never shipped); the other two still ship | PBS 80+ (installed PWA), Background Fetch 74+ | — (PBS negative) | — (negative) | [triggers](https://developer.chrome.com/docs/web-platform/notification-triggers), [MDN PBS](https://developer.mozilla.org/en-US/docs/Web/API/Web_Periodic_Background_Synchronization_API) |
| Storage Buckets / `storage.persist()` | Buckets Chromium only; persist universal | Buckets 122+ (Android 145); persist 55+ | persist 55+ | persist 15.2+ | [storage-buckets](https://developer.chrome.com/docs/web-platform/storage-buckets), [MDN Storage](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API) |
| Web Share with files | Desktop uneven | Windows/ChromeOS 89+, macOS 128+ (files); Linux unverified | desktop off by default (`dom.webshare.enabled`); no files | 14+/15+ incl. files | [caniuse](https://caniuse.com/web-share) |
| Manifest `widgets` (Windows 11 Widgets Board) | Still shipping, "experimental", Edge 108+; docs updated 2 Sep 2026 | Edge / Windows 11 only | — | — | [MS Learn](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/widgets) |

New or moved in 2026 (Chrome unless noted):

| API | Status | Source |
|---|---|---|
| Web Serial on Android | Stable, Chrome 148 | [release 148](https://developer.chrome.com/release-notes/148) |
| Local Network Access permission prompt (replaces Private Network Access) | Stable, Chrome 142 / Edge 143 | [blog](https://developer.chrome.com/blog/local-network-access) |
| Web Smart Card API (PC/SC) | Stable Chrome 143, ChromeOS IWA only | [intent](https://groups.google.com/a/chromium.org/g/blink-dev/c/dtUIO4sOxwA) |
| `<usermedia>` capability element MVP; `DeviceOrientationEvent.requestPermission()` | Stable, Chrome 151 | [release 151](https://developer.chrome.com/release-notes/151) |
| CPU Performance API (device tier) | Stable, Chrome 152 | [release 152](https://developer.chrome.com/release-notes/152) |
| Gamepad event-driven API | Origin trial, Chrome 149 | [release 149](https://developer.chrome.com/release-notes/149) |
| WebMCP `navigator.modelContext` | Origin trial, Chrome 149 | [I/O 2026](https://developer.chrome.com/blog/chrome-at-io26) |
| Handwriting Recognition | on by default since 99 but functional on ChromeOS only | [chromestatus](https://chromestatus.com/feature/5263213807534080) |

Not moving: Web NFC on desktop (Android only), Screen Brightness (explainer only), Ambient Light Sensor and Web Bluetooth Scanning (flag only), Bluetooth inside IWAs (unverified).

Nuances from the pass:
- Docs and chromestatus disagree on when the Writer/Rewriter and Proofreader trials ended; either way both ended before Chrome 152, so today they are flag-only. Edge does not ship the Gemini Nano APIs.
- Treat `navigator.install()` as feature-detect-only until Chrome 156 ships it.
- Firefox WebGPU on Linux is release-channel but flagged as of 152; default-on not confirmed for 153–155.
- Chrome still says Isolated Web Apps will "expand to unmanaged and cross-platform devices in the future", with no date. Nothing there is usable by a public site today.
- WebContainers: the 10k-requests/month clause is in StackBlitz's FAQ, not the enterprise page; "open-source project" is not an enumerated exemption. Ask them in writing before shipping it on this site.
- Transformers.js v4 did *not* flip the default device to WebGPU; a third-party blog claiming so contradicts the README.
- Web Share files on Linux Chrome: no ship notice found; treat as unsupported until tested.
- Chrome release notes 148–152 contain no new Bluetooth/USB/HID/NFC/sensor origin trials beyond those listed.
