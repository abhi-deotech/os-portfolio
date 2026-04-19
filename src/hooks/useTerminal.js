import { useState, useRef, useEffect } from 'react';
import useOSStore from '../store/osStore';

/**
 * Custom hook to manage Terminal logic, including command processing,
 * tab completion, and input history.
 *
 * @returns {Object} Terminal state and handlers
 */
const useTerminal = () => {
  const { 
    terminalHistory, addTerminalEntry, clearTerminalHistory, 
    fileSystem, terminalTheme, setTerminalTheme, installApp,
    openWindow, installedApps, unlockAchievement,
    terminalCommandCount, incrementCommandCount,
    bootContainer, runCommand, containerStatus,
    initAi, isAiReady, isAiLoading
  } = useOSStore();

  const [input, setInput] = useState('');
  const [currentPath, setCurrentPath] = useState(['~']);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isVimMode, setIsVimMode] = useState(false);
  const [vimFile, setVimFile] = useState(null);
  const scrollRef = useRef(null);

  // Filter history to only include user inputs for easier navigation
  const inputHistory = terminalHistory
    .filter(entry => entry.type === 'input')
    .map(entry => entry.text);

  const themes = {
    default: { bg: 'bg-[#0c0c0c]/80', border: 'border-white/5', text: 'text-white', primary: 'text-os-primary', secondary: 'text-os-secondary' },
    dracula: { bg: 'bg-[#282a36]/90', border: 'border-[#6272a4]/30', text: 'text-[#f8f8f2]', primary: 'text-[#bd93f9]', secondary: 'text-[#50fa7b]' },
    solarized: { bg: 'bg-[#002b36]/95', border: 'border-[#586e75]/30', text: 'text-[#839496]', primary: 'text-[#268bd2]', secondary: 'text-[#859900]' },
    monokai: { bg: 'bg-[#272822]/95', border: 'border-[#49483e]/30', text: 'text-[#f8f8f2]', primary: 'text-[#f92672]', secondary: 'text-[#a6e22e]' },
    retro: { bg: 'bg-[#001100]/95', border: 'border-[#00ff00]/20', text: 'text-[#00ff00]', primary: 'text-[#00ff00]', secondary: 'text-[#00ff00]' },
    cyberpunk: { bg: 'bg-[#050505]/95', border: 'border-[#f3f315]/20', text: 'text-[#f3f315]', primary: 'text-[#ff00ff]', secondary: 'text-[#00ffff]' },
    'matrix-glow': { bg: 'bg-[#000d00]/95', border: 'border-[#00ff00]/30', text: 'text-[#00ff41]', primary: 'text-[#00ff41]', secondary: 'text-[#003b00]' },
    ocean: { bg: 'bg-[#001b2b]/95', border: 'border-[#00bfff]/20', text: 'text-[#e0ffff]', primary: 'text-[#00bfff]', secondary: 'text-[#20b2aa]' }
  };

  const theme = themes[terminalTheme] || themes.default;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [terminalHistory]);

  const commands = {
    help: () => 'Available commands:\n  help, clear, ls, cd, cat, mkdir, touch, rm, ps, top, vim\n  neofetch, whoami, date, matrix, ssh, lumina-get, theme, man, lumina-ai',
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
    ps: () => {
      const apps = useOSStore.getState().openWindows.map(id => {
        return `guest      ${(Math.floor(Math.random() * 9000) + 1000)}  0.0  0.1  ${id}`;
      }).join('\n');
      return `USER       PID  %CPU %MEM COMMAND\n${apps || 'No active processes'}`;
    },
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
      const themeList = Object.keys(themes).join(', ');
      if (!newTheme || !themes[newTheme]) return `Available themes: ${themeList}`;
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
        'cd': 'CD(1) - Change Directory\n\nDESCRIPTION\n  Navigate the OS file structure.'
      };
      return manuals[cmd] || `No manual entry for ${cmd}`;
    },
    neofetch: () => 'OS: Lumina Desktop v1.0.0\nKernel: 6.8.0-lumina-os\nUptime: 3 years, 2 months\nPackages: 1337 (npm)\nShell: zsh 5.9\nResolution: 2560x1440\nDE: Lumina\nWM: Framer-Motion\nTerminal: Lumina-Term\nCPU: M3 Max (8) @ 4.06GHz\nMemory: 64GB',
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
      
      if (!args.length) return "Lumina AI v2.0 (Local). Ask me anything!\nUsage: lumina-ai <your question>";
      const q = args.join(' ').toLowerCase();
      if (q.includes('who') || q.includes('author') || q.includes('built')) return "I was built by Abhimanyu Saxena, a senior full-stack developer who loves building OS-style web experiences.";
      if (q.includes('stack') || q.includes('tech') || q.includes('built with')) return "Lumina OS is built with React, Tailwind CSS, Framer Motion, and Zustand for state management.";
      if (q.includes('hire') || q.includes('contact')) return "You can reach out via the 'Mail' icon on the desktop or find me on LinkedIn.";
      if (q.includes('hello') || q.includes('hi')) return "Greetings, user. How can I assist your terminal session today?";
      return "I'm still learning. Try asking about my 'stack' or 'author'. My neural net is currently in demo mode.";
    },
    magic: () => {
      unlockAchievement('easter_egg');
      return "The rabbit hole goes deep... You have discovered the magic within the command line.";
    },
    node: (args) => {
      if (containerStatus === 'idle') {
        return {
          type: 'progressive',
          steps: ['Booting WebContainer...', 'Mounting filesystem...', 'Initializing Node.js runtime...'],
          onComplete: () => bootContainer()
        };
      }
      return `Node.js ${containerStatus === 'ready' ? 'ready' : 'booting...'}. (Implementation pending pipe logic)`;
    },
    npm: (args) => {
      if (containerStatus === 'idle') {
        return {
          type: 'progressive',
          steps: ['Booting WebContainer...', 'Mounting filesystem...', 'Initializing Node.js runtime...'],
          onComplete: () => bootContainer()
        };
      }
      return `npm ${containerStatus === 'ready' ? 'ready' : 'booting...'}. (Implementation pending pipe logic)`;
    }
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
        if (vimFile.id) {
          useOSStore.getState().updateFileContent(vimFile.id, input);
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
          useOSStore.getState().createFile(vimFile.name, input, parentId);
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
      if (commands[cmd]) {
        const output = commands[cmd](args);
        
        if (output && typeof output === 'object' && output.type === 'progressive') {
          let step = 0;
          const interval = setInterval(() => {
            if (step < output.steps.length) {
              addTerminalEntry({ type: 'output', text: output.steps[step] });
              step++;
            } else {
              clearInterval(interval);
              if (output.onComplete) output.onComplete();
            }
          }, 400);
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
