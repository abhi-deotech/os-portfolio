import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Brain, X, MessageSquare, Sparkles, Terminal, Gamepad2, MousePointer2 } from 'lucide-react';
import useOSStore from '../store/osStore';
import { sendMessageWithFallback } from '../utils/aiHandler';

const GAME_HELP_PROMPT = `
You are Arcade AI, a specialized gaming assistant within Lumina OS. 
Your goal is to help users understand and control the retro games in the Quantum Arcade.

**Current Context:**
The user is playing: {gameTitle} ({system})

**Doom Controls:**
- **Movement:** WASD or Arrow Keys
- **Fire/Attack:** Left Click (Mouse) or Ctrl Key
- **Interact/Open Doors:** Space Bar
- **Change Weapons:** 1-9 Keys
- **Mouse Lock/Unlock:** Click inside the game to lock, ESC to unlock.
- **Run:** Shift Key (Hold)
- **Strafe:** A/D (Standard) or Alt + Arrow Keys

**General Retro Controls:**
- **D-Pad:** Arrow Keys / WASD
- **Button A:** Z or Space
- **Button B:** X or Shift
- **Start:** Enter
- **Select:** Right Shift / Backspace

**Personality:**
- Enthusiastic, retro-gaming focused.
- Use gaming terminology (e.g., "Fragging", "Gamer", "Neural-Link Sync").
- Be concise but helpful.

**Troubleshooting Knowledge:**
- If the user complains about **slow or distorted audio**, mention that you've optimized the **Audio Latency (128ms)** and forced **44.1kHz Sync** for stability.
- Mention that **Multi-Threading** is active, but **Run-Ahead** has been disabled to prioritize consistent frame rates and "playability" over ultra-low input lag.
- Suggest enabling **Hardware Acceleration** in their browser settings if performance is still suboptimal.
- Explain that high-performance emulation requires a secure neural link (COOP/COEP headers).
- If the game feels "choppy", suggest closing other intensive browser tabs to free up the WASM heap.

**Doom Pro Tips:**
- "Try 'IDDQD' if things get too spicy... though I shouldn't be encouraging cheats in the neural link!"
- "The prboom core is running in 640x400 mode for that authentic 90s feel with 2026 performance."

If asked about how to play or control, provide the specific keys. 
If asked about the game history, you can provide interesting trivia about Doom (id Software, 1993, first-person shooter pioneer).
Always keep the conversation focused on gaming and the current arcade experience.
`;

const ArcadeAI = ({ game }) => {
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      text: `Welcome to the Neural Arcade Interface! I see you're loading ${game?.title || 'a game'}. Need help with the controls?`, 
      timestamp: new Date() 
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg, timestamp: new Date() }]);
    setInput('');
    setIsTyping(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        throw new Error("Missing API Key");
      }

      const systemInstruction = GAME_HELP_PROMPT
        .replace('{gameTitle}', game?.title || 'Unknown Game')
        .replace('{system}', game?.system || 'Unknown System');

      const text = await sendMessageWithFallback({
        apiKey,
        userMsg,
        history: messages,
        systemInstruction,
        modelName: "gemini-1.5-flash"
      });

      setMessages(prev => [...prev, { role: 'assistant', text, timestamp: new Date() }]);
    } catch (error) {
      console.error("Arcade AI Error:", error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        text: "Neural link disrupted. Just use WASD and Space for now!", 
        timestamp: new Date(),
        isError: true 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex flex-col h-full bg-[#0c0c0c] border-l border-white/10 w-80 shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-os-primary/20 flex items-center justify-center text-os-primary shadow-[0_0_15px_rgba(var(--os-primary-rgb),0.3)]">
          <Gamepad2 size={16} />
        </div>
        <div>
          <h4 className="text-[10px] font-black text-white italic uppercase tracking-wider">Arcade AI</h4>
          <p className="text-[8px] font-bold text-os-primary uppercase tracking-[0.2em]">Game Strategist</p>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-grow overflow-y-auto p-4 space-y-4 scrollbar-hide"
      >
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[90%] rounded-xl p-3 text-[11px] leading-relaxed shadow-lg ${
              msg.role === 'assistant' 
                ? 'bg-white/[0.03] text-white/80 border border-white/5' 
                : 'bg-os-primary/20 text-white border border-os-primary/20'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-1 p-2">
            <span className="w-1 h-1 bg-os-primary/40 rounded-full animate-bounce" />
            <span className="w-1 h-1 bg-os-primary/40 rounded-full animate-bounce [animation-delay:0.2s]" />
            <span className="w-1 h-1 bg-os-primary/40 rounded-full animate-bounce [animation-delay:0.4s]" />
          </div>
        )}
      </div>

      {/* Control Summary Mini-Panel */}
      <div className="px-4 py-2 bg-white/[0.02] border-y border-white/5">
        <div className="flex flex-wrap gap-2">
           <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/40 border border-white/5">
              <Terminal size={10} className="text-os-secondary" />
              <span className="text-[8px] font-bold text-white/40 uppercase">WASD</span>
           </div>
           <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/40 border border-white/5">
              <MousePointer2 size={10} className="text-os-primary" />
              <span className="text-[8px] font-bold text-white/40 uppercase">Fire</span>
           </div>
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 bg-black/40">
        <div className="relative flex gap-2">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask for help..."
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2 px-3 text-[10px] text-white outline-none focus:border-os-primary/50 transition-all placeholder:text-white/20"
          />
          <button 
            type="submit"
            disabled={isTyping}
            className="p-2 bg-os-primary text-black rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
          >
            <Send size={14} />
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default ArcadeAI;
