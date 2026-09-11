# System Dialogs — replace browser-default `alert` / `confirm` / `prompt`

Owner request: *"the application still uses the default alert modal in many places, but this is
unacceptable, we need to ensure that is not the case and there are proper os appropriate popups."*

## What the audit actually found

A repo-wide scan (`src/`, `public/`, `scripts/`, excluding `node_modules`/`dist`) turns up
**three** native-dialog call sites, all in `FileExplorer.jsx` — and they are the three most visible
ones, because they sit on the New File / New Folder / Mount buttons:

| Site | Call |
|---|---|
| `FileExplorer.jsx:190` | `prompt('Enter file name (e.g., notes.txt):', 'newfile.txt')` |
| `FileExplorer.jsx:198` | `prompt('Enter folder name:', 'New Folder')` |
| `FileExplorer.jsx:208` | `alert('File System Access API not supported in this browser.')` |

The second half of the problem is the mirror image: **destructive actions that should raise a
dialog and raise nothing at all.** Deleting a file, resetting the whole filesystem, removing a
sideloaded game, resetting personalization and clearing browser history are all one unguarded
click. A browser `confirm()` would have been ugly; *no* confirm is worse.

## Plan

### 1. The mechanism
- [x] `src/store/slices/dialogSlice.js` — a queue in the store + a promise resolver map held at
      module scope (a resolver is a live continuation; it cannot round-trip through `persist`)
- [x] `src/utils/dialog.js` — `osAlert` / `osConfirm` / `osPrompt`, promise-returning, with the
      same return contract as the natives (`true` / `boolean` / `string | null`), callable from
      non-React code (store slices, terminal) as well as components
- [x] Register the slice in `osStore.js`; keep `dialogs` out of `partialize`

### 2. The surface — `src/components/SystemDialog.jsx`
- [x] SDL roles only: `bg-sdl-surface`, `border-hairline/10`, `bg-scrim` backdrop,
      `shadow-[var(--sdl-lift-window)]`, `rounded-sdl-panel`
- [x] Tone badge — info = `soft`/`aInk` (law 3), warn = `warn`, danger = `alert`
- [x] Destructive confirm is a **tint**, not a solid `alert` fill: `--sdl-on-accent` is computed
      against the ACCENT and is not guaranteed to read on `alert` (same reasoning already recorded
      in `TaskManager.jsx:170`)
- [x] Modal choreography per SDL motion: translateY(8) + fade; reduced motion via the root
      `MotionGate`
- [x] Focus: capture → focus default action (or the input) → **trap Tab** → restore on close
- [x] Keyboard: Escape cancels, Enter confirms (prompt is a real `<form>`), backdrop click cancels
- [x] `role="alertdialog"` for alert/confirm, `role="dialog"` for prompt, `aria-modal`,
      `aria-labelledby` / `aria-describedby`
- [x] One dialog visible at a time; the rest queue behind it, the way an OS serialises modals
- [x] Mounted at the root in `main.jsx` (inside `MotionGate`) so login/boot can raise one too

### 3. Replace the three natives
- [x] `handleCreateFile` → `osPrompt` (required, `.txt` placeholder)
- [x] `handleCreateFolder` → `osPrompt` (required)
- [x] `handleMountFolder` → `osAlert` (unsupported-browser notice)

### 4. Give the unguarded destructive actions a dialog
- [x] `FileExplorer` — delete file/folder (names the item), Reset All
- [x] `Games` — remove a sideloaded game
- [x] `Appearance` + desktop context menu — Reset Personalization
- [x] `Browser` StartPage — Clear browsing history

### 5. Make the regression impossible, not just absent
- [x] `no-restricted-globals` in `eslint.config.js` for `alert` / `confirm` / `prompt`, with a
      message pointing at `src/utils/dialog.js`

### 6. Verify
- [x] `npm run lint` clean
- [x] `npm run build` clean
- [x] Drive the real thing in a browser: open Files, exercise every dialog kind, confirm the
      keyboard model and that focus returns

## Review

**Shipped.** Four new files, seven touched, no native dialog left in `src/`.

| File | What it is |
|---|---|
| `src/store/slices/dialogSlice.js` | queue + module-scope resolver map |
| `src/utils/dialog.js` | `osAlert` / `osConfirm` / `osPrompt` — the public API |
| `src/components/SystemDialog.jsx` | the surface; mounted once in `main.jsx` |
| `src/config/dialogs.js` | the one spec two surfaces share |

### Verification — 34 assertions, all passing

Driven through real CDP `Input.*` events in headless Chrome (`scratchpad/verify-dialogs.mjs`,
`verify-wireups.mjs`), because the in-app Browser pane does not composite — see the standing
lesson in `lessons.md`. Trusted events matter here specifically: a synthetic
`dispatchEvent(new KeyboardEvent('keydown'))` never runs a default action, so it cannot prove that
Enter submits the prompt form.

Pass 1 (24/24) — `role`/`aria-modal`/`aria-labelledby` resolve to real nodes · input autofocused
and pre-selected · Tab ×8 never escapes the panel · empty required prompt disables Create · Enter
creates the folder and focus returns to the button that raised the dialog · Escape creates nothing
· destructive confirm is an `alertdialog` naming the item · Escape and backdrop click both keep the
file · confirming deletes it · warn alert has exactly one action · two queued dialogs show one
panel and settle with their own separate answers · legible on both a dark (`carbon-vivid`) and a
light (`honey-vivid`) colorway.

Pass 2 (10/10) — Appearance reset, sideloaded-game removal and Clear history each raise a dialog,
each leave state untouched on cancel, each apply on confirm.

`npm run lint` adds zero errors (63 pre-existing, all in vendored `public/games/`). `npm run build`
clean.

### Two things worth remembering

- **The audit number was 3, not "many".** The perception of "many" came from the *second* class of
  problem — five destructive actions with no dialog at all. Both are fixed; only counting the
  `alert`/`prompt` calls would have fixed half the complaint.
- **A solid `--sdl-alert` button would have been wrong.** `--sdl-on-accent` is computed against the
  ACCENT and carries no guarantee against `alert`, so destructive confirms are a tint with a
  strong border — the constraint already recorded at `TaskManager.jsx:170`, now reused.
