# Terminal Commands Reference

The Lumina OS terminal is a simulated shell over the same virtual filesystem the File Explorer,
Notepad and Spotlight use. Files created here are real state: they persist to IndexedDB and appear
in the other apps immediately.

Implemented in `src/hooks/useTerminal.js` (command set, history, completion) and rendered by
`src/components/Terminal.jsx`.

## Basic commands

### help
Lists the available commands.

```
$ help
Available commands:
  help, clear, ls, cd, cat, mkdir, touch, rm, ps, top, vim
  neofetch, whoami, date, matrix, ssh, lumina-get, theme, man, lumina-ai
  node, npm
```

One command is deliberately missing from that list. It is findable.

### clear
Clears the screen and the stored scrollback.

### whoami
```
$ whoami
guest@lumina-os
```

### date
Prints the real system date.

## File system commands

These operate on the live virtual filesystem. Names are matched **case-insensitively**, so
`cat readme.md` finds `README.md`.

### ls [-a] [-l] [directory]
Lists the current or a named directory. Directories are suffixed with `/`.

```
$ ls
Documents/  Private/  Projects/  Downloads/  Desktop/  Pictures/
Music/  Videos/  Program Files/  System/  Temp/
```

**Flags:**

| Flag | Effect |
|------|--------|
| `-a` | include dotfiles (hidden by default) |
| `-l` | long format — permission string, owner, size, date |

```
$ ls -l Projects
-rwxr-xr-x  1 guest  staff     42 Mar 29, 12:30 Lumina-OS.md
drwxr-xr-x  1 guest  staff   4096 Mar 29, 12:30 assets/
```

The permission column is cosmetic — there is no permission model behind it. Sizes are derived
(`content.length` for files, `children.length * 4096` for directories).

### cd <directory>
Changes directory. Accepts a directory name, `..`, or `~` / `/` for home.

### cat <filename>
Prints file contents. Non-text nodes report `[Binary file or non-text content]`.

### mkdir <name> · touch <filename>
Create a directory or an empty file in the current path. Both unlock the `architect` achievement.

### rm <name>
Removes a file or directory.

```
$ rm kernel.log
rm: cannot remove 'kernel.log': Permission denied (System Protected)
```

Nodes whose id begins with `root-` or `sys-` are protected — the seeded top-level folders and
system files cannot be deleted, so the filesystem can't be emptied into an unrecoverable state.

## The Vim trap

### vim <filename>

Not a modal editor. There is no Normal mode, no Insert mode, and `i` does nothing. The window
labels itself `[Read-Only Trap]` in its own title bar, and it is a joke about the single most
googled question in software.

File content is displayed as **read-only** text (an empty file shows the classic column of `~`).
The only input is the `:` command line at the bottom.

| Input | Effect |
|-------|--------|
| `:q` or `:q!` | exit |
| `:wq` | exit, writing the file back unchanged |

All three unlock `devops_escape` — *"Successfully escaped the simulated Vim trap."* Because the
buffer is read-only, `:wq` cannot change content; it is a no-op write that preserves the fiction.

## System commands

### ps
Lists the actually-open windows as processes. PIDs are randomised per call.

```
$ ps
USER       PID  %CPU %MEM COMMAND
guest      4821  0.0  0.1  terminal
guest      7193  0.0  0.1  music
```

### top
Opens the Task Manager window (it does not print a table).

### neofetch
```
$ neofetch
OS: Lumina Desktop v1.0.0
Kernel: 6.8.0-lumina-os
Uptime: 3 years, 2 months
Packages: 1337 (npm)
Shell: zsh 5.9
Resolution: 2560x1440
DE: Lumina
WM: Framer-Motion
Terminal: Lumina-Term
CPU: M3 Max (8) @ 4.06GHz
Memory: 64GB
```

### ssh <host>
Pure flavour text — no connection is attempted. Unlocks `hacker`.

## Node.js — real, via WebContainer

### node · npm

These boot a genuine [WebContainer](https://webcontainer.io) — an actual Node.js runtime compiled
to WebAssembly, running in the tab. The boot is real; **command piping is not yet wired**, so
after boot these report readiness rather than executing your input.

```
$ node
Booting WebContainer...
Mounting filesystem...
Initializing Node.js runtime...
```

## Package manager

### lumina-get install <package>

APT-style installer. The output is theatre, but completion genuinely unlocks the app in the
launcher.

| Package | Unlocks |
|---------|---------|
| `matrix-mode` | the Matrix rain window |
| `task-monitor` | Task Manager |
| `cloud-sync` | Settings sync pane |
| `quantum-bench` | Quantum Benchmark |

## Terminal themes

### theme [name]

Eight palettes, persisted across sessions. Run `theme` with no argument to list them.

| Theme | Background | Accents |
|-------|------------|---------|
| `default` | dark gray | purple / cyan |
| `dracula` | `#282a36` | purple / green |
| `solarized` | `#002b36` | blue / green |
| `monokai` | `#272822` | pink / green |
| `retro` | black | green monochrome |
| `cyberpunk` | `#050505` | yellow / magenta |
| `matrix-glow` | `#000d00` | green glow |
| `ocean` | `#001b2b` | cyan / teal |

## Manual pages

### man <command>
Documented commands: `lumina-get`, `ssh`, `theme`, `cat`, `cd`. Anything else returns
`No manual entry for <cmd>`.

## AI

### lumina-ai [question]

Runs the **local** model — `Xenova/all-MiniLM-L6-v2` via transformers.js in a Web Worker, not a
cloud API. First invocation loads the model (~20 MB). Called bare, it reports the backend the
worker actually resolved to:

```
$ lumina-ai
Lumina AI v2.0 (Local). Ask me anything!
Runtime: WebGPU (hardware accelerated)
```

or, where WebGPU is unavailable:

```
Runtime: WASM · 6 threads of 8 cores
```

That line is measured per machine, never asserted. The question-answering itself is keyword
matching over a small set of topics (author, stack, hiring, greeting) — the loaded model provides
embeddings, not these replies. For real conversational AI, use the **AI Chat** app, which is
Gemini-backed.

## Easter eggs

### matrix
With `matrix-mode` installed, opens the Matrix rain window. Without it, prints a teaser.

There is also one undocumented command. Finding it unlocks `easter_egg`.

## Achievements reachable from the terminal

| Trigger | Achievement |
|---------|-------------|
| 5 commands executed | `terminal_wiz` |
| `ssh <host>` | `hacker` |
| the undocumented command | `easter_egg` |
| `mkdir` or `touch` | `architect` |
| exiting the Vim trap | `devops_escape` |

## Input handling

- **Tab completion** completes **filenames and directories** in the current path — a single match
  autofills, multiple matches list. It does *not* complete command names.
- **↑ / ↓** walk the command history, which persists across sessions (capped at 500 entries).
- Commands are lowercased before dispatch.

## Technical notes

- The filesystem is Zustand state persisted to **IndexedDB** via `idb-keyval` — not localStorage.
  `applyTheme` keeps a small localStorage mirror for theme only, to avoid a pre-paint flash.
- The current working directory is session state and resets on reload; history and created files
  do not.
- Commands return a string, `null` (for commands that only mutate state), or a
  `{ type: 'progressive', steps, onComplete }` object that streams output line by line.
