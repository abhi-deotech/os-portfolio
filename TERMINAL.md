# Terminal Commands Reference

The Lumina OS terminal provides a simulated shell environment with file system navigation, system commands, and Easter eggs.

## Basic Commands

### help
Displays available commands list.
```
$ help
Available commands:
  help, clear, ls, cd, cat, neofetch, whoami, date, matrix
  ssh, lumina-get, theme, man, lumina-ai
```

### clear
Clears the terminal screen and history.
```
$ clear
[Terminal cleared]
```

### whoami
Shows current user identity.
```
$ whoami
guest@lumina-os
```

### date
Displays current date and time.
```
$ date
Sat Mar 29 2025 12:30:00 GMT+0530 (India Standard Time)
```

## File System Commands

### ls [directory]
Lists contents of current or specified directory.
```
$ ls
Projects/  Documents/  Media/  sys/

$ ls Projects/
System.md  MERN-Dashboard.md  IoT-Controller.md  Benchmark.exe
```

### cd <directory>
Changes current directory.
```
$ cd Projects
~/Projects

$ cd ..
~

$ cd ~
~
```

**Supported paths:**
- Directory names (case-insensitive)
- `..` (parent directory)
- `~` or `/` (home directory)

### cat <filename>
Displays file contents.
```
$ cat System.md
# Lumina OS
Version 2.0.0

Welcome to my interactive portfolio OS...
```

### mkdir <name>
Creates a new directory in the current path.
```
$ mkdir NewFolder
```

### touch <filename>
Creates a new empty file in the current path.
```
$ touch notes.txt
```

### rm <name>
Removes a file or empty directory.
```
$ rm old_file.txt
```

## The Modal Editor: Vim

### vim <filename>
Opens a modal text editor inside the terminal.
- **Normal Mode**: Navigate or enter commands.
- **Insert Mode**: Type `i` to begin editing text. Press `Esc` to return to Normal Mode.
- **Save & Exit**: Type `:wq` in Normal Mode to save changes to the virtual file system and exit.
- **Discard & Exit**: Type `:q!` to exit without saving.

## System Commands

### neofetch
Displays system information in ASCII art style.
```
$ neofetch
OS: Lumina Desktop v2.0.0
Kernel: 6.8.0-lumina-os
Uptime: 4 years, 1 month
Packages: 1542 (npm)
Shell: zsh 5.9
Resolution: 2560x1440
DE: Lumina
WM: Framer-Motion
Terminal: Lumina-Term
CPU: Quantum M3 Max (8) @ 4.06GHz
Memory: 128GB
```

## Package Manager

### lumina-get install <package>
APT-style package manager for installing apps.

**Available packages:**
| Package | Unlocks | Description |
|---------|---------|-------------|
| `matrix-mode` | matrix command | Matrix rain Easter egg |
| `task-monitor` | TaskManager | System monitoring app |
| `cloud-sync` | Settings | Cloud settings sync |
| `quantum-bench` | Benchmark | Performance testing |

```
$ lumina-get install matrix-mode
Reading package lists... Done
Building dependency tree... Done
Downloading matrix-mode... [100%]
Setting up matrix-mode (v1.0.0)... Done
Application "matrix-mode" is now available in your launcher.
```

## Terminal Themes

### theme [name]
Changes terminal color scheme.

**Available themes:**
| Theme | Background | Text Colors |
|-------|------------|-------------|
| `default` | Dark gray | Purple/Cyan accents |
| `dracula` | #282a36 | Purple/Green |
| `solarized` | #002b36 | Blue/Green |
| `monokai` | #272822 | Pink/Green |
| `retro` | Black | Green monochrome |
| `cyberpunk` | #050505 | Yellow/Magenta |
| `matrix-glow` | #000d00 | Green glow |
| `ocean` | #001b2b | Cyan/Teal |

```
$ theme dracula
Theme changed to dracula.

$ theme
Available themes: default, dracula, solarized, monokai, retro, cyberpunk, matrix-glow, ocean
```

## Manual Pages

### man <command>
Displays documentation for commands.
```
$ man lumina-get
LUMINA-GET(8) - Package Manager

NAME
  lumina-get - APT-like tool for Lumina OS

APPS
  matrix-mode, task-monitor, cloud-sync, quantum-bench
```

**Documented commands:** `lumina-get`, `ssh`, `theme`, `cat`, `cd`

## SSH (Simulation)

### ssh <host>
Simulates SSH connection to remote host.
```
$ ssh localhost
Connecting to localhost...
Establishing encrypted tunnel... [OK]
Neural handshake successful.

Welcome to localhost (Lumina-OS v2.4.1)
Last login: Sat Mar 29 2025 from 127.0.0.1

[NOTICE] Remote system restricted. Use 'exit' to return.
```

## Easter Eggs

### matrix
Activates Matrix mode (requires `matrix-mode` package).
```
$ lumina-get install matrix-mode
$ matrix
Wake up, Neo...
[Opens Matrix rain animation]
```

Without the package:
```
$ matrix
System trace initiated... [OK]
Intercepting data packets... [OK]
Decoding neural link... [OK]
Welcome to the construct.
(Tip: Install matrix-mode via lumina-get to unlock the full Construct)
```

## AI Assistant

### lumina-ai <query>
Built-in AI assistant for portfolio information.

**Supported queries:**
- "who built this", "author" - Developer information
- "stack", "tech", "built with" - Technology stack
- "hire", "contact" - Contact information
- "hello", "hi" - Greeting

```
$ lumina-ai who built this
I was built by Abhimanyu Saxena, a senior full-stack developer 
who loves building OS-style web experiences.

$ lumina-ai what is your stack
Lumina OS is built with React, Tailwind CSS, Framer Motion, 
and Zustand for state management.
```

## File System Structure

```
~ (home)
├── Projects/
│   ├── System.md
│   ├── MERN-Dashboard.md
│   ├── IoT-Controller.md
│   └── Benchmark.exe
├── Documents/
│   ├── README.md
│   ├── ARCHITECTURE.md
│   ├── TERMINAL.md
│   ├── STYLING.md
│   ├── Resume.pdf
│   └── CoverLetter.docx
├── Pictures/
│   ├── Hero_Shot.jpg
│   ├── sunset-glow.jpg
│   └── cyber-grid.jpg
└── sys/
    ├── kernel.log
    ├── boot.log
    ├── secrets.txt
    └── system.ini
```

## Achievement Triggers

Certain terminal actions unlock achievements:

| Action | Achievement |
|--------|-------------|
| First command executed | `terminal_wiz` |
| Use `ssh` command | `hacker` |
| Use `matrix` with package installed | `easter_egg` |

## Tips

1. **Tab completion is not implemented** - type full command names
2. **File names are case-insensitive** - `cat system.md` works
3. **Paths use forward slashes** - consistent with Unix systems
4. **Hidden files** - check `sys/secrets.txt` for hints
5. **Konami code** - The secrets file hints at hidden features

## Technical Details

- File system is stored in Zustand state (persisted to localStorage)
- Navigation state is session-only (resets on reload)
- Terminal history is persisted across sessions
- Commands return strings or null (for commands that modify state)
