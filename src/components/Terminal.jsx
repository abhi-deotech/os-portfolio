import React, { useState, useEffect, useRef } from 'react';
import useOSStore from '../store/osStore';

const Terminal = () => {
  const { terminalHistory, addTerminalEntry, clearTerminalHistory } = useOSStore();
  const [input, setInput] = useState('');
  const terminalRef = useRef(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalHistory]);

  const handleCommand = (e) => {
    if (e.key === 'Enter') {
      const cmd = input.trim().toLowerCase();
      if (!cmd) return;
      
      const args = cmd.split(' ');
      const baseCmd = args[0];
      
      addTerminalEntry({ type: 'input', text: cmd });

      let output = '';
      switch (baseCmd) {
        case 'help':
          output = 'Available commands: help, about, skills, clear, contact, whoami, ls, cat, date, neofetch';
          break;
        case 'about':
          output = 'Abhimanyu Saxena. Software Engineer | Team Lead. Building high-end web experiences.';
          break;
        case 'skills':
          output = '> React, Node.js, Python, Docker, WebGL, UI/UX Architecture\n> System Design, Cloud Deployments, Full-Stack Mastery';
          break;
        case 'clear':
          clearTerminalHistory();
          setInput('');
          return;
        case 'ls':
          output = 'Desktop/  Documents/  Projects/  Media/  System.md  Resume.pdf';
          break;
        case 'cat':
          if (args[1] === 'system.md') {
            output = '# Lumina OS v2.0\nStatus: Online\nKernel: Stable\nUptime: 100%';
          } else {
            output = args[1] ? `File not found: ${args[1]}` : 'Usage: cat <filename>';
          }
          break;
        case 'date':
          output = new Date().toString();
          break;
        case 'neofetch':
          output = 'OS: Lumina Desktop v1.0.0\nKernel: 6.8.0-lumina-os\nUptime: 3 years, 2 months\nPackages: 1337 (npm)\nShell: zsh 5.9\nResolution: 2560x1440\nDE: Lumina\nWM: Framer-Motion\nTerminal: Lumina-Term\nCPU: M3 Max (8) @ 4.06GHz\nMemory: 64GB';
          break;
        case 'contact':
          output = 'Email: saxena.abhimanyu.as@gmail.com\nLocation: Jaipur/Kota, Rajasthan\nGitHub: github.com/abhimanyu';
          break;
        case 'whoami':
          output = 'guest_user@lumina-os-core';
          break;
        default:
          output = `Command not found: ${cmd}. Type "help" for a list of commands.`;
      }

      if (output) {
        addTerminalEntry({ type: 'output', text: output });
      }
      
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full font-mono text-sm overflow-hidden bg-[#000000]/70 backdrop-blur-3xl rounded-b-[1.5rem] relative">
      {/* Terminal Ambient Glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[300px] h-[300px] bg-[#00d2fd]/10 blur-[100px] rounded-full pointer-events-none z-0" />
      
      <div 
        ref={terminalRef}
        className="flex-grow overflow-y-auto p-6 space-y-4 scrollbar-hide relative z-10"
      >
        <div className="text-[#cc97ff] mb-6 font-bold tracking-wide drop-shadow-[0_0_8px_rgba(204,151,255,0.4)]">
          Lumina Terminal Interface v2.0.1<br />
          Kernel 5.15.0-generic (Web-Native)<br />
          Type <span className="text-[#00d2fd]">"help"</span> to list available commands.
        </div>
        
        {terminalHistory.map((entry, i) => (
          <div key={i} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {entry.type === 'input' ? (
              <div className="flex items-start space-x-3">
                <span className="text-[#00f5a0] whitespace-nowrap font-bold drop-shadow-[0_0_5px_rgba(0,245,160,0.5)]">abhimanyu@lumina:~$</span>
                <span className="text-white font-medium">{entry.text}</span>
              </div>
            ) : (
              <div className="text-[#00d2fd] whitespace-pre-wrap leading-relaxed mt-1 mb-3 pl-4 border-l-2 border-[#00d2fd]/30 drop-shadow-[0_0_8px_rgba(0,210,253,0.2)]">
                {entry.text}
              </div>
            )}
          </div>
        ))}

        <div className="flex items-center space-x-3 pt-2">
          <span className="text-[#00f5a0] whitespace-nowrap font-bold drop-shadow-[0_0_5px_rgba(0,245,160,0.5)]">abhimanyu@lumina:~$</span>
          <input 
            autoFocus
            type="text"
            className="bg-transparent border-none outline-none text-white w-full caret-[#cc97ff] placeholder:text-white/20 selection:bg-[#cc97ff]/40 font-medium"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleCommand}
            spellCheck="false"
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
};

export default Terminal;
