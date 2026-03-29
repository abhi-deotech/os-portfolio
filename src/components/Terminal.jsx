import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import useOSStore from '../store/osStore';

/**
 * Terminal component providing a simulated command-line interface.
 * Supports file system navigation, system commands, and Easter eggs.
 *
 * Features:
 * - 8 customizable color themes
 * - Virtual file system with ls, cd, cat commands
 * - Package manager (lumina-get) for installing apps
 * - Built-in AI assistant (lumina-ai)
 * - Achievement triggers for exploration
 * - Persistent command history
 *
 * Terminal Themes:
 * - default: Dark with purple/cyan accents
 * - dracula: Purple/green on dark purple
 * - solarized: Blue/green on dark teal
 * - monokai: Pink/green on dark gray
 * - retro: Monochrome green
 * - cyberpunk: Yellow/magenta on black
 * - matrix-glow: Matrix-style green glow
 * - ocean: Cyan/teal on dark blue
 *
 * @component
 */
const Terminal = () => {
  const { 
    terminalHistory, addTerminalEntry, clearTerminalHistory, 
    fileSystem, terminalTheme, setTerminalTheme, installApp,
    openWindow, installedApps, unlockAchievement,
    terminalCommandCount, incrementCommandCount
  } = useOSStore();
  const [input, setInput] = useState('');
  const [currentPath, setCurrentPath] = useState(['~']);
  const [historyIndex, setHistoryIndex] = useState(-1);
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
    help: () => 'Available commands:\n  help, clear, ls, cd, cat, neofetch, whoami, date, matrix\n  ssh, lumina-get, theme, man, lumina-ai',
    clear: () => {
      clearTerminalHistory();
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
      if (!args.length) return "Lumina AI v1.0.0. Ask me anything!\nUsage: lumina-ai <your question>\nExamples: 'who built this', 'what is your stack', 'contact'";
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
  };

  const handleCommand = (e) => {
    // Keep specialized keys here
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
    
    addTerminalEntry({ type: 'input', text: currentInput });
    setHistoryIndex(-1);
    setInput(''); // Clear input immediately

    if (trimmedInput) {
      const [cmd, ...args] = trimmedInput.split(' ');
      if (commands[cmd]) {
        const output = commands[cmd](args);
        
        if (output && typeof output === 'object' && output.type === 'progressive') {
          // Handle progressive output (like installer)
          let step = 0;
          const interval = setInterval(() => {
            if (step < output.steps.length) {
              addTerminalEntry({ type: 'output', text: output.steps[step] });
              step++;
            } else {
              clearInterval(interval);
              if (output.onComplete) output.onComplete();
            }
          }, 400); // 400ms delay between steps
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
    
    // Find current directory contents
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

    // Find matches
    const matches = content
      .filter(node => node.name.toLowerCase().startsWith(lastPart))
      .map(node => ({
        name: node.name + (node.children ? '/' : ''),
        isDir: !!node.children
      }));

    if (matches.length === 1) {
      // Single match: complete it
      parts[parts.length - 1] = matches[0].name;
      setInput(parts.join(' '));
    } else if (matches.length > 1) {
      // Multiple matches: show them as output
      addTerminalEntry({ type: 'input', text: input }); // Echo current input
      addTerminalEntry({ type: 'output', text: matches.map(m => ({ text: m.name, isDir: m.isDir })) });
    }
  };

  return (
    <div 
      ref={scrollRef}
      className={`h-full w-full ${theme.bg} backdrop-blur-md rounded-xl p-4 font-mono text-sm overflow-y-auto scrollbar-hide border ${theme.border} transition-all duration-300`}
    >
      <div className="flex flex-col gap-2">
        {terminalHistory.map((entry, i) => (
          <div key={i} className="flex flex-col gap-1">
            {entry.type === 'input' ? (
              <div className="flex gap-2">
                <span className={`${theme.primary} font-bold`}>➜</span>
                <span className={`${theme.secondary} font-bold`}>{currentPath.join('/')}</span>
                <span className={theme.text}>{entry.text}</span>
              </div>
            ) : (
              <div className={`${theme.text} opacity-80 whitespace-pre-wrap leading-relaxed`}>
                {Array.isArray(entry.text) ? (
                  <div className="flex flex-wrap gap-x-4">
                    {entry.text.map((item, j) => (
                      <span key={j} className={item.isDir ? theme.secondary : ''}>
                        {item.text}
                      </span>
                    ))}
                  </div>
                ) : (
                  entry.text
                )}
              </div>
            )}
          </div>
        ))}
        
        <form onSubmit={handleSubmit} className="flex gap-2">
          <span className={`${theme.primary} font-bold`}>➜</span>
          <span className={`${theme.secondary} font-bold`}>{currentPath.join('/')}</span>
          <input
            autoFocus
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleCommand}
            className={`flex-grow bg-transparent border-none outline-none ${theme.text} p-0`}
          />
        </form>
      </div>
    </div>
  );
};

export default Terminal;
