import React from 'react';
import useTerminal from '../hooks/useTerminal';

/**
 * Terminal component providing a simulated command-line interface.
 * UI focused, with logic handled by the useTerminal hook.
 *
 * @component
 */
const Terminal = () => {
  const {
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
  } = useTerminal();

  if (isVimMode) {
    return (
      <div className={`h-full w-full ${theme.bg} backdrop-blur-md rounded-xl p-0 font-mono text-sm overflow-hidden border ${theme.border} flex flex-col`}>
        <div className="bg-white/10 px-4 py-1 text-xs flex justify-between select-none">
          <span>VIM - {vimFile?.name}</span>
          <span className="opacity-50 tracking-widest uppercase text-[10px] font-bold">[Read-Only Trap]</span>
        </div>
        <div className="flex-grow p-4 text-white/80 overflow-y-auto whitespace-pre-wrap select-text">
          {vimFile?.content || Array(20).fill('~').join('\n')}
        </div>
        <div className="bg-white/5 px-4 py-1 flex gap-2 items-center">
          <span className={`${theme.primary} font-bold`}>:</span>
          <input
            autoFocus
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
            className="flex-grow bg-transparent border-none outline-none text-white p-0 text-sm font-mono"
            spellCheck="false"
          />
        </div>
      </div>
    );
  }

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
