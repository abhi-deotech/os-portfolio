# SDL Design Review — Lumina OS Desktop Shell

## 1. The hypothesis

My hypothesis is that this desktop has no quiet register, and therefore no loud one either. Every layer is pitched at ceiling simultaneously: a 100%-saturated wallpaper repaints the plane, four near-neon accents serve as chrome *and* data at the same volume, surfaces are built out of 3–10% white so 39 borders are doing the demarcation the fills never did, labels shout at 8px/900/0.1em, and eleven animations breathe with no user cause. The result does not read as vivid — it reads as **dull**, because when the whole field sits at the ceiling nothing can be **pronounced**: the focused window, the selected dock tile, and the live number all pull on the eye exactly as hard as the chrome around them.

I do not think this shell needs a restructure. It needs to be **relit** — drop the floor, and the accents you already like will finally read as accents. Correct me if you think the neon *is* the product's identity rather than an artifact of never having had a quiet voice to contrast it against; that changes Set 2 and nothing else.

---

## 2. The axis — which grammar this shell locks to

Everything numeric downstream (tempo, radius, wash, title face) hangs on one unratified choice. Both poles are defensible from the evidence, which is why six motion findings were refuted as "pending theme ratification."

**Pole A — Steel Night: snap and depth.**
Flat plane, black two-layer lift, 150/80/210ms · `cubic-bezier(0.2,0,0,1)`, system-stack titles, radius 12. Evidence for: the shell is cool and navy (`#060e20`), its existing ramp (`#091328 / #141f38 / #192540`) is already Steel-shaped and near-identical to Carbon Vivid's `#131d2f`, and it lifts with black shadows in most places already.

**Pole B — Jewel Night: silk and wash.**
Tonal double-radial plane, 320/140/420ms, jewel accents, radius 14–22. Evidence for: `--desktop-gradient` (index.css:34) *is* a wash, the accents *are* jewel-register, and the 2.5rem radius family across five surfaces is Jewel-scale. Under Jewel, the shipped 300ms hovers and 500ms dock slide are already ~on tempo and a dozen "fix the number" findings evaporate.

**My recommendation: Steel Night, with the existing wash retained as a documented deviation.**

Reasoning: a desktop shell is not a destination, it is a substrate the user acts *through*. Jewel's 420ms pane from a dock button reads as lag on chrome the user opens forty times a session; Steel's 210ms reads as obedient. Jewel's silk is right for a page you look at, wrong for a control surface you operate. The shell's neutral ramp is already Carbon-shaped, so Pole A is mostly a *naming* exercise on tokens that exist, whereas Pole B requires re-deriving the whole ramp warm-ward.

**What it costs, honestly:**
- Steel Night locks **system-stack titles**, which puts Manrope on the table (open question 2). I would keep Manrope and document the deviation rather than spend a brand decision on a conformance point.
- Steel Night locks **radius 12**; this shell's family radius is 40 across ControlCenter, ClockWidget, SystemDashboard, QuantumWidget and the launcher. Radius is not one of the ten laws. Keep the 40 (open question 4).
- Steel Night has a **flat plane, no wash**. I would still keep `--desktop-gradient` — measured, its violet stop `#1a103c` differs from the base by roughly 8–11%, i.e. it is already in the whisper register and already conforms to Law 1. It is a vignette, not a violation.

Everything below assumes Pole A. Where a value flips under Pole B, I say so in the row.

---

## Set 1 — Uncover the plane

**Thesis: four of the ten laws are unenforceable until the shell stops painting a fully saturated wallpaper over its own plane. Nothing else in this review is visible until this lands.**

| what | file:line | now | proposed | why (law) |
|---|---|---|---|---|
| **[edit]** Shipped default wallpaper | `src/store/slices/systemSlice.js:3` | `wallpaper: 'linux-default'` → resolves to `LiveWallpaper.jsx:23` `bg-gradient-to-br from-[#4e1a3d] via-[#772953] to-[#e95420]` | Default to a wash. Must be added to **both** library copies in LiveWallpaper.jsx, to `Settings.jsx:103-112` (or the picker shows no selection), and to `systemSlice.js:75` (`resetSettingsToDefault` still hardcodes `'linux-default'`) | Law 1 (undertoned plane) + Law 7 (warm/earthy packs live LIGHT — this is aubergine-to-orange inside a cool dark shell) |
| **[edit]** One wash layer over *whatever* is active | `src/components/LiveWallpaper.jsx:48` | `bg-black/10 backdrop-blur-none backdrop-brightness-[0.85]` is the only dimmer in the file | Add a single wash/scrim beside this overlay, applied uniformly to gradients **and** the four Unsplash photos at lines 19-22 | Law 8 (atmosphere whispers, 10–22% alpha). Note the gradient library is declared **twice** — lines 14-23 are dead for rendering, only 37-43 reach the className at line 46 — and `Settings.jsx:104-108` holds a third copy. Edit one and you desync the thumbnails |
| **[swap]** Atmosphere ignores the accent switch | `src/index.css:26` | `--os-primary-dim: #9c48ea;` / `--os-secondary-dim: #00c3eb;` | `rgb(var(--os-accent-soft-rgb))` (or, before Set 2 lands, derive from `--os-primary-rgb`) | `App.jsx:177-179` overrides only primary/secondary/tertiary-rgb, so the glow blobs at `App.jsx:223-224` and the window bloom at `Window.jsx:279` bleed violet and cyan while the user is on green or magenta — chrome and wash in two colorways at once |
| **[swap]** Login plane breathes | `src/components/LoginScreen.jsx:64` | `bg-purple-500/10 rounded-full blur-[120px] animate-pulse` (+ blue-500 twin at `:65` with a 1s offset) | Delete `animate-pulse` and the `animationDelay`; retint the two orbs to the accent tokens | Motion — movement without user cause. **Do not** replace the opaque base at `:63`; near-black tinted bases conform under Law 1 and the 10% alphas are already legal |

---

## Set 2 — Two voices: quiet the chrome, sharpen the data

**Thesis: there is exactly one voice in this shell, and it is pitched louder than the loudest data bar SDL has ever locked. Until the chrome drops, no compliant data channel can out-sharpen it.**

| what | file:line | now | proposed | why (law) |
|---|---|---|---|---|
| **[build]** The accent map | `src/App.jsx:43` | `purple: { primary: '204, 151, 255', secondary: '0, 210, 253', tertiary: '0, 245, 160' }` and three siblings — all four presets measure HSL-sat **100%** at relLum **0.375–0.678** | Re-point the four **existing** keys to role sets (`accent` / `soft` / `aInk` / `barA` / `barB`) per the token block below | Law 2 + Law 6 + the cobalt precedent. SDL's locked dark accents run sat 46–82% at relLum 0.245–0.317; even `barA` — the sharpest channel SDL has locked — tops out at `#8d8df1`, relLum 0.311. The *quietest* preset here (`#ff68f0`, 0.375) is 21% brighter than that; `#00f5a0` at 0.678 is 2.2×. Cobalt `#5387ee` was rejected **as chrome** at 0.253 and demoted to a bar. All four sit above it |
| ⚠️ *rollout* | — | — | Keep the keys `purple/cyan/magenta/green` — `App.jsx:146` falls back to purple, so renaming silently flips persisted users. Migrate every `secondary`/`tertiary` consumer (`Taskbar.jsx:55/67/78`, `SystemDashboard.jsx:24-48`, ControlCenter, Settings) **in the same commit**, and update the swatch hexes at `Settings.jsx:116-120` | — | This is the one genuinely structural edit in the review. It cannot be half-landed |
| **[build]** A data channel that isn't the chrome | `src/components/SystemDashboard.jsx:33` | `<motion.div className="h-full bg-os-secondary" animate={{ width: \`${metrics.cpu}%\` }} />` — byte-identical to the About dock button at `Taskbar.jsx:69` | `var(--os-bar-a)`. RAM bar at `:48` is `bg-os-tertiary` → `var(--os-bar-b)`; `SystemMetricsWidget.jsx:186` → barA | Law 2. Data and chrome currently speak at exactly the same volume, so nothing tells the eye which surface carries information. Must land **with** the row above or the new bars end up *quieter* than the chrome and the hierarchy stays inverted |
| **[swap]** Categorical palette is the dock palette | `src/components/SystemMetricsWidget.jsx:265/271/283/291` | `#cc97ff` / `#00d2fd` / `#ff6b6b` / `#ffd93d` | Derive four categories per preset from the shell's own ramp | `#cc97ff` and `#00d2fd` are `--os-primary-rgb` / `--os-secondary-rgb` retyped as hex — the chart is painted in dock colors, and all four are accent-blind. (Not a Law 10 issue: viz-palettes explicitly relaxes semantics *inside charts*) |
| **[build]** Bars with no well | `src/components/ClockWidget.jsx:62` | twelve `bg-white/10` bars floating directly on the card, no container | Wrap in `--os-chart-well` (`#111419`), bars take `barA` | Law 4 — charts live **inside** cards in a flat desaturated well. The shell ships no sunken/chart token at all, which is precisely why it keeps inventing `bg-black/20`, `bg-black/40` and `bg-white/[0.03]` ad hoc |
| **[swap]** Track alpha is half spec | `src/components/SystemDashboard.jsx:32` | `bg-white/5` | `bg-white/10` — same at `:47`, `SystemMetricsWidget.jsx:182` and `:320` | dataviz: dark-theme inline-bar track = white 10%. At 5% over glass the track vanishes, so a 30% bar reads as a stub with no scale |
| **[swap]** KPI numerals emit light | `src/components/SystemMetricsWidget.jsx:85` | `textShadow: \`0 0 20px ${color}40\`` (and `:315` hardcodes `rgba(0, 210, 253, 0.4)`, accent-blind) | Drop the glow; `letterSpacing: '-0.02em'` and weight 700 (currently `font-black`) | Data is sharp because of its colour, not because it is glowing. The `:315` hardcode also ignores the active preset entirely |
| **[edit]** A gradient used as data | `src/components/SystemMetricsWidget.jsx:325` | `bg-gradient-to-r from-os-primary via-os-secondary to-os-primary` + a `via-white/30` shimmer sweeping on `repeat: Infinity` at `328-332` | Flat `barA` fill; delete the shimmer. Same gradient-as-data pattern at `:232` and on the icon tiles at `:57` | Law 9 — gradients only on special buttons. A primary→secondary→primary ramp encodes a scale that means nothing |
| **[swap]** Three dock buttons, three hues | `src/components/Taskbar.jsx:78` | Launcher `os-primary` (`:55`), About `os-secondary` (`:67`), Control Center `os-tertiary` (`:78`) | All three take `os-accent`; state via accent-soft fill + top hairline. Also `Taskbar.jsx:58` `shadow-[0_0_8px_#cc97ff]` is hardcoded purple on every preset | Law 2 — one quiet chrome voice. Three hues for one job reads as three semantic categories that do not exist |
| **[swap]** Battery: green vs red | `src/components/ControlCenter.jsx:59` | `color={metrics.ram > 80 ? "text-red-400" : "text-[#00f5a0]"} glow={...}` | Alert hue for the exceptional state, neutral `sec` ink for normal, `glow={false}` | Law 10 — the literal forbidden shape: one indicator whose only two states are green and red. Healthy is not an achievement. **Separately**: this is a RAM threshold wearing a battery icon beside a CPU-derived percentage at `:60` — a semantics bug worth fixing in the same pass |
| **[swap]** "Connected" chip | `src/components/Settings.jsx:648` | `bg-green-500/20 text-green-400 border border-green-500/30 text-[9px] font-black` | `bg-os-accentSoft text-os-aInk text-[9px] font-bold` — same at `662-670` | Law 10 (completed/steady = neutral or accent-soft) + Law 5 (dark chip = accent-soft fill + aInk text, no border) |
| **[swap]** Online/Offline chip | `src/components/Settings.jsx:458` | `network.isOnline ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'` | Accent-soft chip for online; the colorway's own alert pair for offline (**not** Cocoa's `#57202c`/`#ef6f8e` — do not import a warm Jewel colorway into a navy shell) | Law 10 + Law 5 |

*Also fold in:* the static `bg-green-500` dot at `SystemMetricsWidget.jsx:345` — off-token hue, same sweep.

---

## Set 3 — Demarcate in the dark

**Thesis: 52 `bg-white/*` fills against 15 `bg-os-surfaceContainer*` — a 3.5:1 ratio in favour of the light-mode idiom — propped up by 39 `border-white/*` outlines doing the demarcation the fills failed at. The correctly-Steel-shaped ramp this project already ships is simply unused.**

| what | file:line | now | proposed | why (law) |
|---|---|---|---|---|
| **[swap]** Surface *is* the plane | `src/index.css:9` | `--os-surface: #060e20;` — identical to `--os-background` | `#0e1830` — a step **within** the navy family | Colorway role set: plane and surface are distinct roles. Every locked dark colorway steps (`#090d16→#131d2f`, `#0d0d0d→#1d1d24`). Do **not** use Graphite's `#1d1d24` here — an achromatic grey card on a navy plane mixes two colorways |
| **[swap]** The window body is 5% white | `src/components/WindowGlass.jsx:5` | `bg-white/5 backdrop-blur-2xl -z-10 ... border border-white/10` | `bg-os-surfaceContainerHigh/15` (keep the blur) + `border-white/[0.06]` | Law 4 — white-lift is the **light** grammar. Keep it translucent: the `transparencyEffects` toggle is a real product feature and opacifying makes it inert |
| **[swap]** Dock lift | `src/components/Taskbar.jsx:47` | `bg-white/5 ... shadow-2xl` | `bg-os-surfaceContainerHigh/12` + `shadow-[0_1px_2px_rgba(0,0,0,0.5),0_10px_26px_rgba(0,0,0,0.35)]`; leave `backdrop-blur-3xl` alone | Tailwind's `shadow-2xl` is a single ambient layer (`0 25px 50px -12px rgb(0 0 0/.25)`) with no contact shadow. SDL lift is always the contact+ambient pair — that pair is what makes a dark surface float rather than sit painted on |
| **[swap]** Top-most modal wears the lowest token | `src/components/Spotlight.jsx:121` | `bg-os-surfaceContainerLow/90 ... shadow-2xl` at `z-[1001]` | `bg-os-surfaceContainerHighest/95` + the two-layer black lift. Also `:151` `bg-white/5` → `surfaceContainerLow`, `:199` `bg-black/20` → `surfaceContainerLow/80` so both wells step **down** | Law 4 — elevation must read monotonically. One card currently demarcates in both directions at once |
| **[swap]** Clock widget: no fill, no pronounced hover | `src/components/ClockWidget.jsx:32` | `bg-white/[0.03] ... hover:bg-white/[0.05] ... shadow-2xl` | `bg-os-surfaceContainerHigh/90` → `Highest/90` on hover, plus `--lift` → `--lift-hover` | 3% white over a user-chosen photo is not a surface — the border is the only thing making the widget exist. A 3%→5% hover is a delta the eye cannot detect; dark hover moves **light and elevation together** |
| **[edit]** Dashboard steps three directions | `src/components/SystemDashboard.jsx:20` | card `bg-[#0a0a0a]/90`; header `bg-black/20` (`:22`), tabs/footer `bg-black/40` (`:55`, `:165`) step **down**; resource tiles `bg-white/[0.03]` (`:112`, `:116`, `:153`) step **up** | Card → surface; every well → `surfaceContainerLow`; data tracks (`:32`, `:47`) → `--os-chart-well` | Law 4. One card, three well directions — the eye reads no consistent depth |
| **[swap]** Accent-tinted window shadow | `src/components/Window.jsx:200` | `isActive ? \`0 32px 64px rgba(0,0,0,0.5), 0 0 20px ${accentHex}33\`` | `0 2px 4px rgba(0,0,0,.55), 0 32px 64px rgba(0,0,0,.5)` | **SHADOWS ARE BLACK** — same-colored shadows is a named failure mode, on the single most-visible surface in the shell. Focus is already carried by `borderColor: accentHex` at `:199` and the title-bar tint at `:223`. ⚠️ Do **not** paste the card-lift `0 10px 26px` here: the inactive window at `:204-205` carries `0 16px 32px rgba(0,0,0,0.3)` and would out-lift the focused one |
| **[swap]** Accent-tinted tile shadows | `src/components/SystemMetricsWidget.jsx:58` | `boxShadow: \`0 4px 24px ${color}25, inset 0 1px 0 ${color}20\`` | `0 1px 2px rgba(0,0,0,.5), 0 4px 12px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.12)` — scaled down for a 44px tile, not card-scale. Same tint at `:102-103` | Same failure mode; black shadow + white top hairline is the locked dark lift |
| **[swap]** A token that compiles to nothing | `src/components/Settings.jsx:150` | `bg-os-surfaceContainerLowest/20` — there is no `Lowest` key in `tailwind.config.js` | Define `--os-sunken` and use it; same at `:396` | Law 4 — silently-dropped token. (The section isn't *entirely* unfilled — `:151` lays a 5% gradient behind it — but the well never lands) |
| **[swap]** Off-ramp neutrals | `src/components/ControlCenter.jsx:50` | `bg-[#0e0e0e]/80`, plus `#131313` at `:103/:120/:140/:142/:159` | Route through `surface` / `sunken` | Role integrity, not Law 1 (a panel is a surface, not a plane). 14 hardcoded neutral fills across the shell bypass the ramp entirely — `#0e0e0e`, `#131313`×4, `#1a1a1a`×3, `#0a0a0a`×2, `#080808` |
| **[swap]** Invisible nesting | `src/components/ControlCenter.jsx:220` | `rounded-[2rem]` with `bg-[#131313]/60` — identical radius **and** fill to the sliders container it sits inside (`:159`) | `rounded-[1.625rem]` (32 − 6) + `bg-os-surfaceContainerLow/70`; ladder becomes 40 → 32 → 26 | Inner tiles = theme radius − 6. Mobile-only; the desktop media card at `:251` already demarcates |

---

## Set 4 — Relight the type ladder

**Thesis: one `@import` line collapses six SDL weights into one face. 125 of the shell's 126 bold declarations render at 600 — that is why it reads as shouting without reading as crisp.**

| what | file:line | now | proposed | why (law) |
|---|---|---|---|---|
| **[edit]** The import | `src/index.css:1` | `Inter:wght@400;500;600&family=Manrope:wght@400;500;700;800` | `Inter:wght@400..750` — **keep Manrope in the import** until open question 2 is settled, or the 8 `font-display` sites (`Settings.jsx:138,345,356,402,410,447,570,632`) fall through to the browser default | 73 `font-bold` + 52 `font-black` + 1 `font-extrabold` across the shell; exactly **one** (`Settings.jsx:570`) has a real face. The rest all font-match to the 600 cut — semibold, bold and black render *identically*. The ladder isn't smeared, it's collapsed, and 550/620/650/750 are physically unreachable. The variable axis is smaller over the wire than today's seven cuts |
| **[swap]** The dock clock | `src/components/Taskbar.jsx:137` | `font-bold text-os-onSurface leading-none` — no tabular | add `tabular-nums`; same on the date at `:141` | Numbers: tabular wherever data lives, timestamps included. This is the most-watched number in the product. It sits in a `min-w-[70px]` centred column, so it re-centres against the date line rather than shunting the dock — a smaller wobble than it looks, still a one-token fix. `ClockWidget.jsx:36` already gets this right |
| **[swap]** Control Center readouts | `src/components/ControlCenter.jsx:60` | `text-xs font-bold text-white tracking-wide` | `text-xs font-[600] tabular-nums text-white` — also `:165` brightness, `:194` volume | The two slider readouts update continuously under a drag with a stable digit count — that is where the payoff is. `tracking-wide` on numerals also fights the tabular grid |
| **[swap]** Compact metric value | `src/components/SystemMetricsWidget.jsx:111` | `text-xs font-black text-white` | `text-xs font-[700] tabular-nums text-white` | One span feeds all four rows (CPU/RAM/Temp/Power at `:170-173`), so a single missing token de-aligns the whole stack. The large `AnimatedCounter` at `:84` already has it. Also `SystemDashboard.jsx:30/45` |
| **[swap]** Settings KPIs | `src/components/Settings.jsx:402` | `text-4xl md:text-5xl font-display font-black tracking-tighter text-os-secondary` | `text-4xl md:text-5xl font-[700] tracking-[-0.02em] tabular-nums` on the **body** face — also `:410`, and `:412` for consistency (fixed value, no tabular needed) | Display faces never set numerals. `tracking-tighter` is −0.05em against a −0.02em floor, and `font-display font-black` asks Manrope for a 900 it does not ship |
| **[swap]** Micro-labels | `src/components/SystemDashboard.jsx:28` | `text-[8px] font-black uppercase tracking-widest text-white/30` | `text-[11px] font-[600] uppercase tracking-wider` | Three violations stacked: 8px is under the 11px label floor, `tracking-widest` is 0.1em against a 0.07em cap, 900 has no face. 20 such sites (SystemDashboard 6, SystemMetricsWidget 6, Spotlight 5, QuantumWidget 1, Taskbar 1, Settings 1). Worst: `SystemDashboard.jsx:43,165`; `SystemMetricsWidget.jsx:112,179,348`; `Spotlight.jsx:202,206,210`; `Taskbar.jsx:257`. **Note** 700 *is* sanctioned at badge size — argue the floor, the tracking and the 900, not a blanket 600 cap |
| **[swap]** Uppercase with *negative* tracking | `src/components/SystemMetricsWidget.jsx:165` | `text-xs font-black text-white italic tracking-tight uppercase` | `text-xs font-[650] tracking-wider uppercase` — same at `:245` | Caps have no ascender/descender rhythm; they need letterspacing **opened**, and `tracking-tight` closes them. The `italic` is a product-voice call, not a spec fix — see open question 3 |
| **[swap]** Widget clock tracking | `src/components/ClockWidget.jsx:36` | `text-5xl font-black text-white tracking-tighter tabular-nums` | `text-5xl font-[750] tracking-[-0.02em] tabular-nums` | 750 display ceiling, −0.02em floor. `LoginScreen.jsx:79` (`text-8xl font-black tracking-tighter`) is the same pairing on a **live** clock with no tabular-nums — the stronger instance |
| **[swap]** Button label at 900 | `src/components/ControlCenter.jsx:66` | `text-[10px] font-black text-os-primary uppercase tracking-widest` | `text-[11px] font-[600] ... tracking-wider` | Buttons 600, primary 620. Same over-weighting at `Settings.jsx:753` (900 on the gradient primary); `:709/:716` are already close |

---

## Set 5 — One tempo, and stop the machine breathing

**Thesis: thirteen tempos in one theme, zero reduced-motion support, and eleven infinite loops running with no user cause.**

| what | file:line | now | proposed | why (law) |
|---|---|---|---|---|
| **[build]** The binding | `tailwind.config.js:8` | no `transitionTimingFunction`, no named durations anywhere in the config | `transitionTimingFunction: { DEFAULT: 'cubic-bezier(0.2, 0, 0, 1)' }` + `transitionDuration: { hover: '150ms', press: '80ms', pane: '210ms' }` | ONE TEMPO PER THEME. ⚠️ `transitionDuration.DEFAULT` is **already** 150ms in Tailwind 3.4's own stub — the **ease** is the load-bearing half (Tailwind's default is `cubic-bezier(0.4,0,0.2,1)`). Setting it lands ~30 bare `transition-*` on tempo at once and turns the rest into token swaps |
| **[edit]** Reduced motion, at all | `src/index.css:233` | `grep -rn "prefers-reduced-motion" src/` → **0 matches** | The standard media block: `animation-duration: 1ms`, `animation-iteration-count: 1`, `transition-duration: 1ms`, `.scanline { display: none }` | Required by SDL, and not hypothetical: seven always-on `animate-pulse` loops, an `animate-ping`, and `.scanline` at `4s linear infinite` (`index.css:171`) |
| **[edit]** …and for the springs | `src/App.jsx:174` | framer writes inline transforms; CSS cannot reach them | `<MotionConfig reducedMotion="user">` at the **outermost** return — `App.jsx:168-170` returns `<LoginScreen />` early, so wrapping the authed tree only leaves login and boot outside. Wrap in `main.jsx` if simpler | Every window open, pane, spotlight and toast is spring-driven |
| **[swap]** Dock indicator: two clocks, one node | `src/components/Taskbar.jsx:121` | `transition-all duration-500 ${isActive ? 'w-2 h-1 animate-pulse' : 'w-1 h-1'}` | Drop `animate-pulse`. Hold the 500→150 number until the axis is ratified (under Jewel, 500 is near the 420ms pane slot) | Selection is a **static** state in SDL — accent-soft + inset + hairline, never a loop. The dock currently breathes forever |
| **[swap]** Strobing selection | `src/components/Spotlight.jsx:171` | `<ArrowRight size={18} className="text-os-primary animate-pulse" />` | Drop `animate-pulse`; carry state on the row (`:147`) with `shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]` | The arrow only renders on the selected row, so every arrow-key press restarts the pulse — keyboard nav leaves a strobing trail |
| **[edit]** Three infinite loops in one 340px card | `src/components/SystemMetricsWidget.jsx:64` | `animate-ping opacity-20` ×4 rows, floating particles at `352-377` (`repeat: Infinity`), pulse dot at `:307`, plus `animate-pulse` at `:163` | Remove all four | Parallel competing motion layered over live numbers, none of it user-caused |
| **[swap]** Icon stagger, uncapped | `src/components/Desktop.jsx:29` | `transition={{ delay: index * 0.05 }}` over 18 apps → last icon starts at **850ms**, then plays a default spring (~1.3s to settled) | `delay: Math.min(index, 5) * 0.025` + explicit duration/ease | Stagger 20–30ms, **CAP 6 ITEMS**. Capped, the grid is settled at 275ms. (The duration value flips to 0.32s under Jewel; the cap and the 25ms step are theme-independent) |
| **[swap]** CSS fighting a spring | `src/components/Desktop.jsx:88` | `cursor-grab transition-all w-28 ...` on an element framer drives with a 300/30 spring (`63-70`) | `transition-colors` + the ratified tempo | `transition-all` includes `transform`, so the browser re-interpolates every spring frame — the icon lags the cursor and rubber-bands on release. Never two drivers on one property |
| **[edit]** The wiggle | `src/components/common/CustomIcon.jsx:33` | `whileHover: { scale: 1.1, rotate: [0, -5, 5, 0] }`, `whileTap: { scale: 0.95 }`, `spring 400/17` | `whileHover: { scale: 1.04 }`, `whileTap: { scale: 0.97 }`, ratified tempo | A four-keyframe rotate is decoration, not a state, and it is a **fourth** spring config firing simultaneously with the parent button's own hover. Blast radius ~27 animated chrome icons (5 of 32 sites pass `animate={false}`, including all three traffic lights) |
| **[swap]** Two panes, two tempos | `src/components/ControlCenter.jsx:49` | `spring damping: 25, stiffness: 300` — while the launcher at `Taskbar.jsx:155` has **no** `transition` prop at all (framer default) | One shared pane tempo | Both open from adjacent dock buttons at the same anchor and must move identically. 300/25 differs from the 300/30 used elsewhere — almost-but-not-quite is exactly the mixing SDL forbids. *(Neither has an overlay to fade — both backdrops are transparent click-catchers)* |
| **[swap]** Modal gesture too big | `src/components/Spotlight.jsx:118` | `initial={{ opacity: 0, scale: 0.9, y: -20 }}`, no transition prop | `initial={{ opacity: 0, y: -8 }}` + fade + explicit tempo — keep the **downward-from-above** direction; the modal is anchored at `top:15%` | Modal choreography is translateY(8) + fade. The backdrop at `:109-111` is already animated and needs only the transition prop |

**Keep the springs at `Window.jsx:108/125` and `Desktop.jsx:68`.** See §5.

---

## Set 6 — Make the states pronounced

**Thesis: not one selected element in this shell carries the top hairline, not one press honors hover/2, and the most-clicked control in the OS has no transition declaration at all.**

| what | file:line | now | proposed | why (law) |
|---|---|---|---|---|
| **[swap]** The selected grammar | `src/components/Taskbar.jsx:114` | `bg-white/10 shadow-[inset_0_0_12px_rgba(255,255,255,0.05)]` | `bg-os-accentSoft` + `shadow-[inset_0_1px_0_rgba(255,255,255,0.12),inset_0_0_0_1px_rgba(var(--os-accent-rgb),0.35)]`; rest hover → `surfaceContainerHighest/60` | selected = accent-soft + accent inset + **brighter top hairline**. A 12px omnidirectional inner glow at 5% reads as a smudge; the hairline reads as a light source above. Same fix at `:55`, `:67`, `:78`, `ControlCenter.jsx:103/120/140`. *(The shell has no `accent-soft` token today — this is a token gap, filled by Set 2)* |
| **[swap]** Press = hover/2, honored nowhere | `src/components/Taskbar.jsx:116` | `transition-transform duration-300 ... group-active:scale-95` — press shares the hover declaration, so press = hover × 1.0 | `group-active:scale-[0.97] group-active:duration-press` | 0 of 7 press-capable elements honor the ratio (`Taskbar.jsx:116/181/206`, `Desktop.jsx:31/33/90`, `index.css:151`). Scale is 0.95 against SDL's 0.97, and the shadow never collapses — dark themes owe the sink |
| **[edit]** Desktop has no press at all | `src/index.css:151` | `@apply active:scale-95 transition-transform;` — nested inside `@media (max-width: 768px)` at `:141` | `active:scale-[0.97]` + tempo, and scope a **desktop** rule to an opt-in class | The selector is `button, .cursor-pointer` — too broad to promote wholesale; it would re-create the CSS-vs-spring conflict on every framer-driven node |
| **[swap]** Traffic lights snap in 0ms | `src/components/Window.jsx:232` | `bg-[#ff5f56] hover:brightness-110` — **no** `transition-*` class on any of the three | Add `transition-[filter] duration-hover ease-DEFAULT` to all three (`:232`, `:243`, `:252`) | The load-bearing edit. Skip the 4px halo (10px dot spacing leaves ~2px clearance) and the `scale(0.97)` press (0.4px on a 14px dot — imperceptible); those are primary-button grammar, not this control |
| **[swap]** Toggles go dead when ON | `src/components/ControlCenter.jsx:103` | hover exists only in the OFF branch: `${toggles.wifi ? 'bg-[#00d2fd]/20 border-[#00d2fd]' : '... hover:bg-[#1a1a1a]'}` | Add a hover to the ON branch + a desktop press; same at `:120`, `:140` | The control stops responding to the pointer at exactly the moment it is most likely to be clicked again |
| **[swap]** Focus rings | `src/components/ControlCenter.jsx:174` | `focus-visible:ring-2 focus-visible:ring-white/50` — all **23** sites identical, zero conform | Take `ring-[3px]` unconditionally. **Hold the alpha at ~45–50%** until 3:1 is verified | Components: 3px ring. SDL's 30% assumes a tinted plane; these rings are the shell's only keyboard affordance and sit over user-chosen photos, where 30% may fall under WCAG 1.4.11. Also keep `ring-white` on the traffic lights — white is the only hue guaranteed to separate from red/amber/green dots |

---

## Set 7 — The geometry the wallpaper is hiding

**Thesis: the shell ships five appearance knobs and none of them is density, while three widgets are parked on top of the icon grid and the dock.**

| what | file:line | now | proposed | why (law) |
|---|---|---|---|---|
| **[build]** Density | `src/App.jsx:183` | `grep data-density src/` → **0 hits**, while `App.jsx:176-182` injects the colorway switch on this very element | `data-density={density}` beside the accent vars; comfortable/compact token pairs in `index.css`; store field + partialize; a segmented control in the Appearance card | SDL names density first-class, switched **beside** the colorway switch. ⚠️ Scope the first consumer pass to the surfaces that actually have rows/KPIs (SystemDashboard, SystemMetricsWidget, Settings rows) or the switch is dead UI. Name the spacing key `d-gap`, not `gap`. And do **not** "correct" SDL's 14/16, 8/14 values onto the 4/8/12/16 ladder — they are deliberately off it |
| **[edit]** Widget lane collides with the icon grid | `src/components/Widgets.jsx:42` | `clock: { x: Math.floor(window.innerWidth / 2) - 170, y: 40 }`, width 340; icon grid spans x 40..512 (`Desktop.jsx:49`); widget layer is `z-[5]` over the grid's `z-0` | Make the lane responsive — stack or drop the clock below ~1300px | The clock only clears the grid at W ≥ 1364; at 1024 it covers icon column 3 entirely. ⚠️ **Do not** clamp with `Math.max(560, …)` — the dashboard sits at `W−460` (`:43`), so the clamped clock lands on *it* instead. The three lanes need 512 + 340 + 420 + gutters ≈ 1300px; no clamp fixes 1024 |
| **[edit]** Icon grid needs 748px of height | `src/components/Desktop.jsx:47` | `const col = Math.floor(index / 5); const row = index % 5;` — 5 rows at a 128px step from origin 40 | Reduce the row step or origin, or let the icon plane scroll | The dock owns H−88..H−24 and the container is `overflow-hidden` (`:17`), so the fifth label is buried and unreachable below 748px — and the desktop breakpoint starts at 769px *wide*, so ~700px-tall laptops sit squarely in the band. ⚠️ Do **not** derive rows from `window.innerHeight` at render: no resize subscription, fewer rows means *more* columns (worsening the collision above), and it ignores persisted `iconPositions` |
| **[swap]** Quantum widget inside the dock band | `src/components/Widgets.jsx:44` | `{ x: 40, y: window.innerHeight - 240 }` — widget is `h-48` (192px), so its bottom lands 40px inside H−88..H−24 | `{ x: 32, y: window.innerHeight - 312 }` | Clears the dock by 32px and puts the left margin on the token ladder. (Shell geometry, not a law — layout-density's anatomy lists no dock. At short viewports it still meets the icon grid; that's the row above) |
| **[edit]** One value, two slider specs | `src/components/Settings.jsx:292` | `h-4 md:h-1` — a **4px** desktop click strip — while `ControlCenter.jsx:174` gives `h-10 md:h-6` for the same brightness value | Keep the visible track thin, give it a 36px hit area (`py-4 -my-4`, or a real `<input type=range>`); also `Settings.jsx:304` | Controls are 36px comfortable. ⚠️ Do **not** blanket `h-9`: it shrinks ControlCenter's 40px mobile track, and a 36px-tall `rounded-full` fill bar is a visual regression on a thin-slider design. A range input also gets Settings the aria/keyboard support ControlCenter already has |
| **[swap]** Primary button is not a pill | `src/components/Settings.jsx:753` | `px-6 py-2.5 rounded-xl bg-gradient-to-r ... font-black text-xs` | `px-5 py-2.5 rounded-full ... font-[620]` | Primary = pill, weight 620, pad 9×18–20. `rounded-xl` is a card radius; `px-6` overshoots, `px-5` hits 20 exactly. No primary/secondary **text** button in the shell is a pill, so the distinction SDL encodes in shape is absent |
| **[swap]** Pane width | `src/components/ControlCenter.jsx:50` | `w-[380px]` — beside the launcher's `w-[400px]` (`Taskbar.jsx:156`) at the same dock anchor | `w-[400px]` | Not a law hit (400–440 is the *right-edge slide-over* spec and this is a bottom-left popover) — the defensible ground is the same-anchor inconsistency between two adjacent dock panes |
| **[swap]** Section gap | `src/components/Settings.jsx:135` | `space-y-10` (40px) while sibling panes use `space-y-8` at `:343` and `:445` | `space-y-8`; same at `:565` `md:mb-10` | Section gap 24–32. Personalization is the only tab breathing differently |

---

## 4. The token block

Steel Night grammar, re-homed onto this shell's existing navy and its existing variable names. Paste over `:root` in `src/index.css`. Roles the project is missing (`sunken`, `chart-well`, `accent-soft`, `accent-ink`, `bar-a/b`, `alert`) are the additions; the neutrals are largely already correct and stay.

```css
:root {
  /* ---- planes & surfaces (navy kept; only --os-surface is wrong today) ---- */
  --os-background:              #060e20;  /* plane — unchanged, already undertoned */
  --os-surface:                 #0e1830;  /* WAS #060e20, identical to the plane */
  --os-surfaceContainerLow:     #091328;  /* unchanged */
  --os-surfaceContainerHigh:    #141f38;  /* unchanged */
  --os-surfaceContainerHighest: #192540;  /* unchanged */
  --os-sunken:                  #091328;  /* NEW — names the role Settings.jsx:150/396 already asks for */
  --os-chart-well:              #111419;  /* NEW — flat, desaturated, NEVER tinted (law 4) */
  --os-chart-well-rgb:          17, 20, 25;

  /* ---- ink (unchanged; already conforming) ---- */
  --os-onSurface:        #dee5ff;
  --os-onSurfaceVariant: #a3aac4;
  --os-outline:          rgb(109, 117, 140);

  /* ---- accent ROLES — injected per preset by App.jsx:177-179 ---- */
  /* defaults below = 'cyan' preset re-pointed to Carbon Vivid */
  --os-accent-rgb:      98, 135, 208;   /* QUIET chrome voice */
  --os-accent-soft-rgb: 49, 68, 107;    /* chips + selected fill */
  --os-aink-rgb:        122, 155, 220;  /* colored text — lightened + desaturated (law 3) */
  --os-bar-a-rgb:       83, 135, 238;   /* SHARP data channel, series 1 */
  --os-bar-b-rgb:       52, 87, 171;    /* SHARP data channel, series 2 */
  --os-alert-rgb:       239, 111, 142;  /* the ONLY semantic hue (law 10) */

  --os-accent:      rgb(var(--os-accent-rgb));
  --os-accent-soft: rgb(var(--os-accent-soft-rgb));
  --os-aink:        rgb(var(--os-aink-rgb));
  --os-bar-a:       rgb(var(--os-bar-a-rgb));
  --os-bar-b:       rgb(var(--os-bar-b-rgb));

  /* dims now track the switch instead of staying purple/cyan forever */
  --os-primary-dim:   rgb(var(--os-accent-soft-rgb));
  --os-secondary-dim: rgb(var(--os-accent-soft-rgb));

  /* ---- atmosphere: double-radial wash, whisper register (law 8) ---- */
  --desktop-gradient:
    radial-gradient(circle at 82% 0%,  rgba(var(--os-accent-rgb), 0.13),      transparent 60%),
    radial-gradient(circle at 8% 100%, rgba(var(--os-accent-soft-rgb), 0.20), transparent 60%),
    linear-gradient(#060e20, #030712);

  /* ---- tempo: Steel Night. ONE TEMPO. press = hover/2, pane = 1.4x hover ---- */
  --t-hover: 150ms;
  --t-press: 80ms;
  --t-pane:  210ms;
  --t-toast: 150ms;
  --t-ease:  cubic-bezier(0.2, 0, 0, 1);

  /* ---- elevation: SHADOWS ARE BLACK ---- */
  --lift:        0 1px 2px rgba(0,0,0,.50), 0 10px 26px rgba(0,0,0,.35);
  --lift-hover:  0 2px 4px rgba(0,0,0,.55), 0 16px 36px rgba(0,0,0,.45);
  --lift-window: 0 2px 4px rgba(0,0,0,.55), 0 32px 64px rgba(0,0,0,.50);
  --hairline:    inset 0 1px 0 rgba(255,255,255,.12);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
  }
  .scanline { display: none; }
}
```

And the four presets in `src/App.jsx:42-47` — **keys unchanged**, values re-pointed:

```js
const ACCENT_COLORS_MAP = {
  // key kept for persistence; values re-pointed to locked SDL dark colorways
  cyan:    { accent: '98, 135, 208',  soft: '49, 68, 107',  aInk: '122, 155, 220', barA: '83, 135, 238',  barB: '52, 87, 171'  }, // Carbon Vivid
  purple:  { accent: '132, 132, 210', soft: '50, 50, 92',   aInk: '149, 149, 221', barA: '141, 141, 241', barB: '77, 77, 166'  }, // Graphite Bold
  magenta: { accent: '238, 83, 217',  soft: '77, 22, 70',   aInk: '240, 161, 224', barA: '227, 88, 205',  barB: '147, 64, 140' }, // Fuchsia Bold
  // DERIVED, not locked — see open question 1
  green:   { accent: '58, 160, 130',  soft: '26, 59, 50',   aInk: '111, 192, 166', barA: '35, 163, 127',  barB: '21, 107, 83'  },
};
```

The derived green measures relLum 0.273 / sat 46.8% as chrome and 0.281 / 64.7% as `barA` — inside SDL's locked band on both axes, and sharper as a bar than as chrome. It is arithmetic, not taste; I would not ship it without you looking at it. Swatch hexes at `Settings.jsx:116-120` must be updated in the same edit.

---

## 5. What I would not change

These already conform, or are load-bearing product decisions that a conformance pass would damage. Several were proposed as findings and refuted.

- **`--desktop-gradient` (`index.css:34`).** Measured, the violet stop `#1a103c` lifts off the `#060e20` base by roughly 8–11% — already in the whisper register, already an undertoned plane under Law 1. It is invisible today only because the wallpaper paints over it. Uncover it; don't rewrite it.
- **The navy neutral ramp (`index.css:10/12/14`).** `#091328 / #141f38 / #192540` is correctly Steel-shaped and `#141f38` is within a few points of Carbon Vivid's locked `#131d2f`. This is a tinted grey ramp, which is what "neutrals need intent" asks for. Only `--os-surface` is wrong.
- **The 300/30 spring at `Window.jsx:108`, `Window.jsx:125`, `Desktop.jsx:68`.** This is the shell's *most consistent* motion — one config, three sites, mixing nothing. It also drives maximize and snap, which animate `top/left/width/height/borderRadius`; a fixed cubic-bezier on a full-screen layout change reads mechanical where the spring reads physical. SDL never forbids springs. Leave it.
- **State-gated accent halos.** `CustomIcon`'s `glow` prop defaults to `false` and is opt-in; `Taskbar.jsx:57/69/81` and `ControlCenter.jsx:107/124/147` fire only while the launcher / About / Control Center / toggle is *open*. That is INTERACTION.md's sanctioned state halo and it is what makes those states **pronounced**. The only ones worth killing are the six unconditional resting glows (`Settings.jsx:175/224/241/567`, `ControlCenter.jsx:82`, `Taskbar.jsx:81`).
- **Control Center's ON state (`ControlCenter.jsx:103/120`).** `bg-[accent]/20 border-[accent]` *is* accent-soft fill plus accent border — the dark selected grammar, already implemented, and one of the most pronounced states in the shell.
- **QuantumWidget's 30% fill (`:65`).** It hosts an r3f canvas that is meant to read against the desktop. Opacifying it deletes the widget's entire point.
- **The `transparencyEffects` toggle.** A real user-facing product decision. Do not opacify surfaces to the point where the toggle is visually inert — every fill proposal above stays translucent for this reason.
- **`ring-white` on the traffic lights (`Window.jsx:232/243/252`).** White is the only hue guaranteed to separate from red, amber *and* green dots. Swapping it to the accent is a legibility regression dressed as conformance.
- **The 2.5rem radius family** across ControlCenter, ClockWidget, SystemDashboard, QuantumWidget and the launcher. It is this product's signature and it is coherent across five surfaces. Radius is not one of the ten laws.
- **`.light-mode` (`index.css:37-48`).** Unreachable dead code — nothing applies the class, no store flag, and STYLING.md says so. It renders for zero users. Leave it, or delete it as hygiene; do not build a Carbon Day role set nothing can activate.
- **Manrope as the display face.** typography/SKILL.md explicitly leaves non-Steel title faces open per project, and the Manrope/Inter split is a written contract in STYLING.md. Retiring it is a brand call, not a fix — see below.

---

## 6. Open questions for you

**1. The green preset — retire it, or derive it?**
SDL locks no green dark accent. Two options: (a) re-point the `green` key to **Rose Dusk** (`#e868a8` / `#46162e` / `#eb5ca3` / bars `#f2479d`,`#93365f`) and relabel the swatch — locked values, but the shell loses its only cool-green option and the key name lies; or (b) ship the derived moss in the block above — honest label, correct register, but a value that has never passed your eye. I lean (b), and I want you to look at `#3aa082` before it ships.

**2. Steel Night mandates system-stack titles. Does Manrope stay?**
Retiring it costs a written project contract and the product's one non-system voice, for a rule that Jewel-family themes explicitly leave open. Keeping it costs a documented deviation from the grammar you're otherwise adopting wholesale. I lean keep — but it is your face, not mine.

**3. The italic all-caps in the metrics widget** (`SystemMetricsWidget.jsx:165`, `:245`). The tracking and weight fixes are unconditional. De-italicising is a *voice* change: right now upright, italic and all-caps run as three competing display voices in one 200px card, but the italic caps also read as a deliberate telemetry affect. Kill it, or keep it as this widget's signature?

**4. Focus-ring alpha over photo wallpapers.** SDL says 30%; these 23 rings are the shell's only keyboard affordance and they sit on glass over user-chosen photos, where 30% may drop under WCAG 1.4.11's 3:1 floor. Do we take 30% and constrain the wallpaper library, or hold ~45–50% and log the deviation? I would hold the alpha and take the 2px→3px half now.