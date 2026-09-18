import { useState, useRef, useEffect, useMemo } from 'react';
import useOSStore from '../store/osStore';
import { identity } from '../config/profile';
import { describeBrowser } from '../capabilities/browser.js';
import { FACT_IDS, fmt, probeAll, readNetwork, unavailableText } from '../system/facts.js';
import { renderNeofetch } from '../system/neofetch.js';

/**
 * Custom hook to manage Terminal logic, including command processing,
 * tab completion, and input history.
 *
 * @returns {Object} Terminal state and handlers
 */
// Static: was rebuilt as a fresh object literal on every keystroke.
const THEMES = {
  default: { bg: 'bg-[#0c0c0c]/80', border: 'border-white/5', text: 'text-white', primary: 'text-os-primary', secondary: 'text-os-secondary' },
  dracula: { bg: 'bg-[#282a36]/90', border: 'border-[#6272a4]/30', text: 'text-[#f8f8f2]', primary: 'text-[#bd93f9]', secondary: 'text-[#50fa7b]' },
  solarized: { bg: 'bg-[#002b36]/95', border: 'border-[#586e75]/30', text: 'text-[#839496]', primary: 'text-[#268bd2]', secondary: 'text-[#859900]' },
  monokai: { bg: 'bg-[#272822]/95', border: 'border-[#49483e]/30', text: 'text-[#f8f8f2]', primary: 'text-[#f92672]', secondary: 'text-[#a6e22e]' },
  retro: { bg: 'bg-[#001100]/95', border: 'border-[#00ff00]/20', text: 'text-[#00ff00]', primary: 'text-[#00ff00]', secondary: 'text-[#00ff00]' },
  cyberpunk: { bg: 'bg-[#050505]/95', border: 'border-[#f3f315]/20', text: 'text-[#f3f315]', primary: 'text-[#ff00ff]', secondary: 'text-[#00ffff]' },
  'matrix-glow': { bg: 'bg-[#000d00]/95', border: 'border-[#00ff00]/30', text: 'text-[#00ff41]', primary: 'text-[#00ff41]', secondary: 'text-[#003b00]' },
  ocean: { bg: 'bg-[#001b2b]/95', border: 'border-[#00bfff]/20', text: 'text-[#e0ffff]', primary: 'text-[#00bfff]', secondary: 'text-[#20b2aa]' }
};

/** A fact as one terminal value: the reported text, or "not exposed by Firefox" and friends. */
const factText = (fact, browserName) => {
  if (fact?.source === 'reported') return fact.text;
  const t = unavailableText(fact, browserName);
  return /^[A-Z]{2}/.test(t) ? t : `${t.charAt(0).toLowerCase()}${t.slice(1)}`;
};

const SNAP_LABEL = { left: 'snapped left', right: 'snapped right' };

const useTerminal = () => {
  // Field-by-field rather than `useOSStore()`. A whole-store subscription re-ran this hook — and
  // re-rendered the terminal — on every state change anywhere in the OS, including the metrics
  // widget's 3-second tick, which has nothing to do with any of these fifteen fields.
  const terminalHistory = useOSStore((s) => s.terminalHistory);
  const addTerminalEntry = useOSStore((s) => s.addTerminalEntry);
  const clearTerminalHistory = useOSStore((s) => s.clearTerminalHistory);
  const fileSystem = useOSStore((s) => s.fileSystem);
  const terminalTheme = useOSStore((s) => s.terminalTheme);
  const setTerminalTheme = useOSStore((s) => s.setTerminalTheme);
  const installApp = useOSStore((s) => s.installApp);
  const openWindow = useOSStore((s) => s.openWindow);
  const installedApps = useOSStore((s) => s.installedApps);
  const unlockAchievement = useOSStore((s) => s.unlockAchievement);
  const terminalCommandCount = useOSStore((s) => s.terminalCommandCount);
  const incrementCommandCount = useOSStore((s) => s.incrementCommandCount);
  const bootContainer = useOSStore((s) => s.bootContainer);
  const containerStatus = useOSStore((s) => s.containerStatus);
  const initAi = useOSStore((s) => s.initAi);
  const isAiReady = useOSStore((s) => s.isAiReady);
  const isAiLoading = useOSStore((s) => s.isAiLoading);
  const aiBackend = useOSStore((s) => s.aiBackend);

  const [input, setInput] = useState('');
  const [currentPath, setCurrentPath] = useState(['~']);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isVimMode, setIsVimMode] = useState(false);
  const [vimFile, setVimFile] = useState(null);
  const scrollRef = useRef(null);

  // Filter history to only include user inputs for easier navigation. Memoised: this hook
  // re-runs on every keystroke, and the history is capped at 500 entries.
  const inputHistory = useMemo(
    () => terminalHistory.filter(entry => entry.type === 'input').map(entry => entry.text),
    [terminalHistory],
  );

  const theme = THEMES[terminalTheme] || THEMES.default;

  // The progressive-output interval (`lumina-get install`) outlives the keystroke that started
  // it. Held here so closing the Terminal mid-animation clears it instead of leaving it writing
  // to the store for another five seconds against an unmounted component.
  const progressiveRef = useRef(null);
  useEffect(() => () => clearInterval(progressiveRef.current), []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [terminalHistory]);

  /**
   * `node` and `npm` are one command with two labels — they boot the WebContainer and report its
   * status, and neither has ever run anything (containerSlice's `runCommand` has no call sites).
   *
   * WebContainer requires cross-origin isolation, which this app no longer serves: COOP + COEP
   * made every external iframe fail on Firefox and Safari, taking Flow-Net, the music player and
   * the visualizer with them (see vite.config.js). So `WebContainer.boot()` now rejects — and the
   * previous `onComplete: () => bootContainer()` had no `.catch()`, which meant the visitor
   * watched three progress steps, then got silence and an unhandled rejection in the console.
   *
   * Checking `crossOriginIsolated` up front turns that into a straight answer, and the `.catch()`
   * covers a boot that fails for any other reason by putting it in the terminal where it was
   * asked for, rather than in a console nobody has open.
   */
  const webContainerCommand = (label) => () => {
    if (!window.crossOriginIsolated) {
      return `${label} is unavailable: the WebContainer runtime needs cross-origin isolation `
        + `(COOP + COEP), which this site does not set.\n`
        + `Those headers blocked every external embed on non-Chromium browsers — Flow-Net could `
        + `not open a single URL. The runtime lost that trade. See vite.config.js.`;
    }
    if (containerStatus === 'idle') {
      return {
        type: 'progressive',
        steps: ['Booting WebContainer...', 'Mounting filesystem...', 'Initializing Node.js runtime...'],
        onComplete: () => bootContainer().catch((err) => {
          addTerminalEntry({ type: 'output', text: `${label}: WebContainer failed to boot — ${err?.message || err}` });
        }),
      };
    }
    return `${label} ${containerStatus === 'ready' ? 'ready' : 'booting...'}. (Implementation pending pipe logic)`;
  };

  const commands = {
    // Lists every implemented command except `magic`, which is a discoverable easter egg —
    // printing it here would hand over the find. `node`/`npm` were missing from this string for
    // as long as they have existed, so the shell under-reported its own WebContainer support.
    help: () => 'Available commands:\n  help, clear, ls, cd, cat, mkdir, touch, rm, ps, top, vim\n  neofetch, uname, lscpu, free, df, battery, uptime\n  whoami, date, matrix, ssh, lumina-get, theme, man, lumina-ai\n  node, npm',
    clear: () => {
      clearTerminalHistory();
      return null;
    },
    vim: (args) => {
      const fileName = args[0] || 'new_file.txt';
      const getDir = (nodes, path) => {
        if (path.length === 0 || path[0] === '~') {
          if (path.length <= 1) return nodes;
          const nextDir = nodes.find(n => n.name.toLowerCase() === path[1].toLowerCase());
          if (nextDir && nextDir.children) return getDir(nextDir.children, path.slice(1));
        }
        return null;
      };
      const currentNodes = getDir(fileSystem, currentPath);
      const file = currentNodes?.find(n => n.name.toLowerCase() === fileName.toLowerCase() && !n.children);
      
      setVimFile(file || { name: fileName, content: '' });
      setIsVimMode(true);
      return null;
    },
    whoami: () => 'guest@lumina-os',
    date: () => new Date().toString(),
    ls: (args) => {
      const showAll = args.includes('-a');
      const longFormat = args.includes('-l');
      const pathArg = args.find(a => !a.startsWith('-'));

      const getDirContent = (nodes, path) => {
        if (path.length === 0 || path[0] === '~') {
          if (path.length <= 1) return nodes;
          const nextDir = nodes.find(n => n.name.toLowerCase() === path[1].toLowerCase());
          if (nextDir && nextDir.children) return getDirContent(nextDir.children, path.slice(1));
        }
        return null;
      };
      
      let targetPath = currentPath;
      if (pathArg) {
        if (pathArg === '..') targetPath = currentPath.length > 1 ? currentPath.slice(0, -1) : ['~'];
        else if (pathArg === '~' || pathArg === '/') targetPath = ['~'];
        else targetPath = [...currentPath, pathArg];
      }

      const content = getDirContent(fileSystem, targetPath);
      if (!content) return `ls: cannot access '${pathArg || '.'}': No such file or directory`;

      const filteredContent = showAll ? content : content.filter(f => !f.name.startsWith('.'));
      
      if (longFormat) {
        return filteredContent.map(f => {
          const type = f.children ? 'd' : '-';
          const size = f.children ? (f.children.length * 4096) : (f.content?.length || 0);
          const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
          return `${type}rwxr-xr-x  1 guest  staff  ${size.toString().padStart(5)} ${date} ${f.name}${f.children ? '/' : ''}`;
        }).join('\n');
      }

      return filteredContent.map(f => {
        const isDir = !!f.children;
        return { text: f.name + (isDir ? '/' : ''), isDir };
      });
    },
    cd: (args) => {
      const dirName = args[0];
      if (!dirName || dirName === '~' || dirName === '/') {
        setCurrentPath(['~']);
        return '';
      }
      if (dirName === '..') {
        if (currentPath.length > 1) setCurrentPath(prev => prev.slice(0, -1));
        return '';
      }
      
      const getDir = (nodes, path) => {
        if (path.length === 0 || path[0] === '~') {
          if (path.length <= 1) return nodes;
          const nextDir = nodes.find(n => n.name.toLowerCase() === path[1].toLowerCase());
          if (nextDir && nextDir.children) return getDir(nextDir.children, path.slice(1));
        }
        return null;
      };

      const currentNodes = getDir(fileSystem, currentPath);
      const targetDir = currentNodes?.find(n => n.name.toLowerCase() === dirName.toLowerCase() && n.children);
      
      if (targetDir) {
        setCurrentPath(prev => [...prev, targetDir.name]);
        return '';
      }
      return `cd: no such directory: ${dirName}`;
    },
    cat: (args) => {
      const fileName = args[0];
      if (!fileName) return 'cat: specify a file name';
      
      const getDir = (nodes, path) => {
        if (path.length === 0 || path[0] === '~') {
          if (path.length <= 1) return nodes;
          const nextDir = nodes.find(n => n.name.toLowerCase() === path[1].toLowerCase());
          if (nextDir && nextDir.children) return getDir(nextDir.children, path.slice(1));
        }
        return null;
      };

      const currentNodes = getDir(fileSystem, currentPath);
      const file = currentNodes?.find(n => n.name.toLowerCase() === fileName.toLowerCase() && !n.children);
      
      if (file) return file.content || '[Binary file or non-text content]';
      return `cat: ${fileName}: No such file or directory`;
    },
    mkdir: (args) => {
      const folderName = args[0];
      if (!folderName) return 'mkdir: missing operand';
      
      const getDirId = (nodes, path) => {
        if (path.length <= 1) return null; // Root
        let currentNodes = nodes;
        let lastId = null;
        for (let i = 1; i < path.length; i++) {
          const dir = currentNodes.find(n => n.name.toLowerCase() === path[i].toLowerCase());
          if (dir) {
            lastId = dir.id;
            currentNodes = dir.children || [];
          }
        }
        return lastId;
      };

      const parentId = getDirId(fileSystem, currentPath);
      useOSStore.getState().createFolder(folderName, parentId);
      unlockAchievement('architect');
      return `Directory '${folderName}' created.`;
    },
    touch: (args) => {
      const fileName = args[0];
      if (!fileName) return 'touch: missing file operand';
      
      const getDirId = (nodes, path) => {
        if (path.length <= 1) return null;
        let currentNodes = nodes;
        let lastId = null;
        for (let i = 1; i < path.length; i++) {
          const dir = currentNodes.find(n => n.name.toLowerCase() === path[i].toLowerCase());
          if (dir) {
            lastId = dir.id;
            currentNodes = dir.children || [];
          }
        }
        return lastId;
      };

      const parentId = getDirId(fileSystem, currentPath);
      useOSStore.getState().createFile(fileName, '', parentId);
      unlockAchievement('architect');
      return `File '${fileName}' created.`;
    },
    rm: (args) => {
      const name = args[0];
      if (!name) return 'rm: missing operand';
      
      const getDirContent = (nodes, path) => {
        if (path.length === 0 || path[0] === '~') {
          if (path.length <= 1) return nodes;
          const nextDir = nodes.find(n => n.name.toLowerCase() === path[1].toLowerCase());
          if (nextDir && nextDir.children) return getDirContent(nextDir.children, path.slice(1));
        }
        return null;
      };

      const content = getDirContent(fileSystem, currentPath);
      const target = content?.find(n => n.name.toLowerCase() === name.toLowerCase());
      
      if (!target) return `rm: cannot remove '${name}': No such file or directory`;
      if (target.id.startsWith('root-') || target.id.startsWith('sys-')) return `rm: cannot remove '${name}': Permission denied (System Protected)`;
      
      useOSStore.getState().deleteNode(target.id);
      return `Removed '${name}'.`;
    },
    // Windows, not processes: a page cannot see PIDs or CPU time, so neither is printed.
    ps: () => {
      const { openWindows, activeWindow, minimizedWindows, maximizedWindows, snappedWindows, poppedOut, windowOpenedAt } = useOSStore.getState();
      const now = Date.now();
      const rows = openWindows.map((id) => {
        const state = [
          activeWindow === id ? 'active' : minimizedWindows.includes(id) ? 'minimized' : 'background',
          maximizedWindows.includes(id) ? 'maximized' : null,
          snappedWindows?.[id] ? (SNAP_LABEL[snappedWindows[id]] ?? 'snapped') : null,
          poppedOut?.[id] ? 'popped out' : null,
        ].filter(Boolean).join(' · ');
        const at = windowOpenedAt?.[id];
        const elapsed = at ? fmt.duration(Math.max(0, now - at)) : 'restored';
        return `${state.padEnd(24)} ${elapsed.padEnd(16)} ${id}`;
      });
      return `${'STATE'.padEnd(24)} ${'ELAPSED'.padEnd(16)} WINDOW\n${rows.join('\n') || 'No open windows'}`;
    },
    uptime: () => {
      const n = useOSStore.getState().openWindows.length;
      // performance.now() is read here, in the command handler, never during render.
      return `up ${fmt.duration(performance.now())} (this session, since page load) · ${n} ${n === 1 ? 'window' : 'windows'}`;
    },
    uname: (args) => {
      if (!args.includes('-a')) return 'Lumina';
      return probeAll({ ids: ['os', 'arch'] }).then((snap) => {
        const b = describeBrowser();
        return `Lumina 1.0.0 · ${`${b.name} ${b.version}`.trim()} (${b.engine}) · ${factText(snap.os, b.name)} · ${factText(snap.arch, b.name)}`;
      });
    },
    lscpu: () => probeAll({ ids: ['cores', 'pressure', 'arch'] }).then((snap) => {
      const b = describeBrowser().name;
      return `Architecture:   ${factText(snap.arch, b)}\nCPU(s):         ${factText(snap.cores, b)}\nCPU pressure:   ${factText(snap.pressure, b)}`;
    }),
    free: () => probeAll({ ids: ['jsHeap', 'deviceMemory'] }).then((snap) => {
      const b = describeBrowser().name;
      return `JS heap:        ${factText(snap.jsHeap, b)}\nDevice memory:  ${factText(snap.deviceMemory, b)}\n(The browser does not expose system RAM usage.)`;
    }),
    df: () => probeAll({ ids: ['storage'] }).then((snap) => {
      const b = describeBrowser().name;
      const st = snap.storage;
      if (st?.source !== 'reported') return `df: site storage ${factText(st, b)}`;
      const { usage, quota } = st.value;
      const pct = `${Math.round(st.detail.percent)}%`;
      return `${'Filesystem'.padEnd(14)} ${'Size'.padStart(9)} ${'Used'.padStart(9)} ${'Avail'.padStart(9)} ${'Use%'.padStart(5)}  Mounted on\n`
        + `${'site-storage'.padEnd(14)} ${fmt.bytes(quota).padStart(9)} ${fmt.bytes(usage).padStart(9)} ${fmt.bytes(Math.max(0, quota - usage)).padStart(9)} ${pct.padStart(5)}  /\n`
        + `(This site's storage quota in ${b}, not your disk.)`;
    }),
    battery: () => probeAll({ ids: ['battery'] }).then((snap) => `Battery: ${factText(snap.battery, describeBrowser().name)}`),
    top: () => {
      openWindow('taskmanager');
      return 'Launching Task Manager...';
    },
    ssh: (args) => {
      const host = args[0] || 'localhost';
      return `Connecting to ${host}...\nEstablishing encrypted tunnel... [OK]\nNeural handshake successful.\n\nWelcome to ${host} (Lumina-OS v2.4.1)\nLast login: ${new Date().toLocaleDateString()} from 127.0.0.1\n\n[NOTICE] Remote system restricted. Use 'exit' to return.`;
    },
    'lumina-get': (args) => {
      const action = args[0];
      const pkg = args[1];
      if (action !== 'install') return 'Usage: lumina-get install <package>';
      if (!pkg) return 'lumina-get: specify a package name';

      const packages = {
        'matrix-mode': 'easteregg',
        'task-monitor': 'taskmanager',
        'cloud-sync': 'settings',
        'quantum-bench': 'benchmark'
      };

      if (packages[pkg]) {
        if (installedApps.includes(packages[pkg])) return `${pkg} is already installed.`;
        
        return {
          type: 'progressive',
          steps: [
            `Reading package lists... Done`,
            `Building dependency tree... Done`,
            `Reading state information... Done`,
            `The following NEW packages will be installed:\n  ${pkg}`,
            `0 upgraded, 1 newly installed, 0 to remove and 0 not upgraded.`,
            `Need to get 0 B/12.4 kB of archives.`,
            `After this operation, 48.2 kB of additional disk space will be used.`,
            `Get:1 http://archive.lumina-os.org/ lumina/main ${pkg} [12.4 kB]`,
            `Selecting previously unselected package ${pkg}.`,
            `(Reading database ... 18423 files and directories currently installed.)`,
            `Preparing to unpack .../${pkg}_1.0.0_all.deb ...`,
            `Unpacking ${pkg} (1.0.0) ...`,
            `Setting up ${pkg} (1.0.0) ...`,
            `Processing triggers for lumina-desktop (1.4.2) ...`,
            `Application "${pkg}" is now available in your launcher.`
          ],
          onComplete: () => installApp(packages[pkg])
        };
      }
      return `E: Unable to locate package ${pkg}`;
    },
    theme: (args) => {
      const newTheme = args[0];
      const themeList = Object.keys(THEMES).join(', ');
      if (!newTheme || !THEMES[newTheme]) return `Available themes: ${themeList}`;
      setTerminalTheme(newTheme);
      return `Theme changed to ${newTheme}.`;
    },
    man: (args) => {
      const cmd = args[0];
      if (!cmd) return 'What manual page do you want?';
      const manuals = {
        'lumina-get': 'LUMINA-GET(8) - Package Manager\n\nNAME\n  lumina-get - APT-like tool for Lumina OS\n\nAPPS\n  matrix-mode, task-monitor, cloud-sync, quantum-bench',
        'ssh': 'SSH(1) - Remote Access Tool\n\nSYNOPSIS\n  ssh <host>\n\nDESCRIPTION\n  Simulates a peer-to-peer connection for data relay.',
        'theme': 'THEME(1) - Terminal Styling\n\nMODES\n  default, dracula, solarized, monokai, retro',
        'cat': 'CAT(1) - Concatenate and print files\n\nDESCRIPTION\n  Reads file content from the virtual filesystem.',
        'cd': 'CD(1) - Change Directory\n\nDESCRIPTION\n  Navigate the OS file structure.',
        'neofetch': 'NEOFETCH(1) - What this browser reports\n\nDESCRIPTION\n  Prints the facts the browser exposes about this device. Anything it\n  withholds is printed as "not exposed", never estimated.',
        'ps': 'PS(1) - Open windows\n\nCOLUMNS\n  STATE, ELAPSED (since the window opened; "restored" after a reload), WINDOW',
        'uname': 'UNAME(1) - System name\n\nSYNOPSIS\n  uname [-a]\n\nDESCRIPTION\n  -a adds the browser, OS and architecture as the browser reports them.',
        'lscpu': 'LSCPU(1) - CPU facts\n\nDESCRIPTION\n  Logical cores, CPU pressure and architecture, where the browser exposes them.',
        'free': 'FREE(1) - Memory facts\n\nDESCRIPTION\n  JavaScript heap size and the bucketed device memory class, where exposed.',
        'df': "DF(1) - Site storage\n\nDESCRIPTION\n  This site's storage usage and quota. Not the disk.",
        'battery': 'BATTERY(1) - Battery status\n\nDESCRIPTION\n  Level and charging state, where the browser exposes them.',
        'uptime': 'UPTIME(1) - Session uptime\n\nDESCRIPTION\n  Time since this page loaded, and the number of open windows.'
      };
      return manuals[cmd] || `No manual entry for ${cmd}`;
    },
    // Read live from the browser each time; the persisted history must never carry invented hardware.
    neofetch: () => {
      // performance.now() is read here, in the command handler, never during render.
      const uptimeMs = performance.now();
      return probeAll({ ids: FACT_IDS }).then((snap) => renderNeofetch(snap, {
        browser: describeBrowser(),
        openWindows: useOSStore.getState().openWindows,
        uptimeMs,
        network: readNetwork(navigator),
      }));
    },
    matrix: () => {
      if (installedApps.includes('easteregg')) {
        openWindow('easteregg');
        return 'Wake up, Neo...';
      }
      return 'System trace initiated... [OK]\nIntercepting data packets... [OK]\nDecoding neural link... [OK]\nWelcome to the construct.\n(Tip: Install matrix-mode via lumina-get to unlock the full Construct)';
    },
    'lumina-ai': (args) => {
      if (!isAiReady && !isAiLoading) {
        return {
          type: 'progressive',
          steps: ['Initializing Neural Engine...', 'Loading tiny model (~20MB)...', 'Neural handshake successful.'],
          onComplete: () => initAi()
        };
      }
      if (isAiLoading) return 'Neural Engine is booting...';
      
      if (!args.length) {
        // Print the backend the worker actually resolved to. Whether inference landed on the GPU
        // or on N WASM threads is a per-machine outcome, so it is reported, never claimed.
        const b = aiBackend;
        const runtime = !b
          ? ''
          : b.device === 'webgpu'
            ? `\nRuntime: WebGPU (hardware accelerated)`
            : `\nRuntime: WASM · ${b.threads} thread${b.threads === 1 ? '' : 's'}${b.cores ? ` of ${b.cores} cores` : ''}`;
        return `Lumina AI v2.0 (Local). Ask me anything!${runtime}\nUsage: lumina-ai <your question>`;
      }
      const q = args.join(' ').toLowerCase();
      if (q.includes('who') || q.includes('author') || q.includes('built')) return `I was built by ${identity.name}, a ${identity.headline.toLowerCase()} who loves building OS-style web experiences.`;
      if (q.includes('stack') || q.includes('tech') || q.includes('built with')) return "Lumina OS is built with React, Tailwind CSS, Framer Motion, and Zustand for state management.";
      if (q.includes('hire') || q.includes('contact')) return "You can reach out via the 'Mail' icon on the desktop or find me on LinkedIn.";
      if (q.includes('hello') || q.includes('hi')) return "Greetings, user. How can I assist your terminal session today?";
      return "I'm still learning. Try asking about my 'stack' or 'author'. My neural net is currently in demo mode.";
    },
    magic: () => {
      unlockAchievement('easter_egg');
      return "The rabbit hole goes deep... You have discovered the magic within the command line.";
    },
    node: webContainerCommand('Node.js'),
    npm: webContainerCommand('npm'),
  };

  const handleCommand = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (inputHistory.length > 0) {
        const newIndex = historyIndex < inputHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setInput(inputHistory[inputHistory.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(inputHistory[inputHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleTabCompletion();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const currentInput = input;
    const trimmedInput = currentInput.trim().toLowerCase();
    
    if (isVimMode) {
      if (trimmedInput === ':q!' || trimmedInput === ':q') {
        setIsVimMode(false);
        setVimFile(null);
        setInput('');
        unlockAchievement('devops_escape');
        addTerminalEntry({ type: 'output', text: 'Exited Vim.' });
      } else if (trimmedInput === ':wq') {
        // Write back the buffer, NOT `input`. `input` is the text sitting in the `:` line — which
        // at this point is the literal string ":wq" — so this used to overwrite the file with its
        // own save command. `vim README.md` followed by `:wq` silently replaced the whole file
        // with four characters. The buffer is read-only, so a save can only ever be a no-op write;
        // that is exactly what this now is.
        const buffer = vimFile.content ?? '';
        if (vimFile.id) {
          useOSStore.getState().updateFileContent(vimFile.id, buffer);
        } else {
          const getDirId = (nodes, path) => {
            if (path.length <= 1) return null;
            let currentNodes = nodes;
            let lastId = null;
            for (let i = 1; i < path.length; i++) {
              const dir = currentNodes.find(n => n.name.toLowerCase() === path[i].toLowerCase());
              if (dir) {
                lastId = dir.id;
                currentNodes = dir.children || [];
              }
            }
            return lastId;
          };
          const parentId = getDirId(fileSystem, currentPath);
          useOSStore.getState().createFile(vimFile.name, buffer, parentId);
        }
        setIsVimMode(false);
        setVimFile(null);
        setInput('');
        unlockAchievement('devops_escape');
        addTerminalEntry({ type: 'output', text: `Saved and exited Vim. File: ${vimFile.name}` });
      } else {
        setInput('');
      }
      return;
    }

    addTerminalEntry({ type: 'input', text: currentInput });
    setHistoryIndex(-1);
    setInput('');

    if (trimmedInput) {
      const [cmd, ...args] = trimmedInput.split(' ');
      // Own properties only: `commands['__proto__']` is an object, and calling it threw.
      if (Object.hasOwn(commands, cmd)) {
        const output = commands[cmd](args);
        
        if (output && typeof output === 'object' && output.type === 'progressive') {
          let step = 0;
          clearInterval(progressiveRef.current);
          progressiveRef.current = setInterval(() => {
            if (step < output.steps.length) {
              addTerminalEntry({ type: 'output', text: output.steps[step] });
              step++;
            } else {
              clearInterval(progressiveRef.current);
              progressiveRef.current = null;
              if (output.onComplete) output.onComplete();
            }
          }, 400);
        } else if (typeof output?.then === 'function') {
          // Async commands (the facts). Without this arm the Promise itself was stored in the
          // persisted history, and Terminal.jsx cannot render an object.
          output.then(
            (text) => addTerminalEntry({ type: 'output', text }),
            (e) => addTerminalEntry({ type: 'output', text: `${cmd}: ${e?.message ?? e}` }),
          );
        } else if (output !== null) {
          addTerminalEntry({ type: 'output', text: output });
        }
        
        if (cmd === 'ssh') unlockAchievement('hacker');
        if (cmd === 'magic') unlockAchievement('easter_egg');
        
        incrementCommandCount();
        if (terminalCommandCount + 1 >= 5) unlockAchievement('terminal_wiz');
      } else {
        addTerminalEntry({ type: 'output', text: `Command not found: ${cmd}. Type 'help' for options.` });
      }
    }
  };

  const handleTabCompletion = () => {
    const parts = input.split(' ');
    const lastPart = parts[parts.length - 1].toLowerCase();
    
    const getDirContent = (nodes, path) => {
      if (path.length === 0 || path[0] === '~') {
        if (path.length <= 1) return nodes;
        const nextDir = nodes.find(n => n.name.toLowerCase() === path[1].toLowerCase());
        if (nextDir && nextDir.children) return getDirContent(nextDir.children, path.slice(1));
      }
      return null;
    };

    const content = getDirContent(fileSystem, currentPath);
    if (!content) return;

    const matches = content
      .filter(node => node.name.toLowerCase().startsWith(lastPart))
      .map(node => ({
        name: node.name + (node.children ? '/' : ''),
        isDir: !!node.children
      }));

    if (matches.length === 1) {
      parts[parts.length - 1] = matches[0].name;
      setInput(parts.join(' '));
    } else if (matches.length > 1) {
      addTerminalEntry({ type: 'input', text: input });
      addTerminalEntry({ type: 'output', text: matches.map(m => ({ text: m.name, isDir: m.isDir })) });
    }
  };

  return {
    input,
    setInput,
    currentPath,
    terminalHistory,
    isVimMode,
    vimFile,
    theme,
    scrollRef,
    handleCommand,
    handleSubmit
  };
};

export default useTerminal;
