import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, User, Globe, MessageSquare, Shield, Clock, Hash, Zap } from 'lucide-react';
import useOSStore from '../store/osStore';

/**
 * LuminaChat: A real-time guestbook simulation.
 * In a production environment, this would connect to Firebase or Supabase.
 * For this demo, it uses a hybrid approach:
 * 1. Syncs with localStorage to simulate real-time across tabs.
 * 2. Pre-populates with mock "Global" messages.
 */

const MOCK_GLOBAL_MESSAGES = [
  { id: 'm1', user: 'System', text: 'Global Neural Link established. Welcome to the construct.', timestamp: Date.now() - 3600000 * 24, role: 'system' },
  { id: 'm2', user: 'TechEnthusiast', text: 'This OS UI is incredible! How did you handle the window management?', timestamp: Date.now() - 3600000 * 2, role: 'user' },
  { id: 'm3', user: 'DesignGuru', text: 'The glassmorphism and animations are so smooth. Great work on the aesthetics.', timestamp: Date.now() - 3600000 * 1, role: 'user' },
];

const LuminaChat = () => {
  const { userRole } = useOSStore();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [username, setUsername] = useState(userRole === 'admin' ? 'Abhimanyu' : 'Guest_' + Math.floor(Math.random() * 1000));
  const [isConnecting, setIsConnecting] = useState(true);
  const scrollRef = useRef(null);

  // Load and sync messages
  useEffect(() => {
    const loadMessages = () => {
      const saved = localStorage.getItem('lumina_guestbook_msgs');
      const localMsgs = saved ? JSON.parse(saved) : [];
      
      // Combine mock global messages with local ones, sorted by time
      const combined = [...MOCK_GLOBAL_MESSAGES, ...localMsgs].sort((a, b) => a.timestamp - b.timestamp);
      setMessages(combined);
    };

    // Simulate connection lag
    const timer = setTimeout(() => {
      setIsConnecting(false);
      loadMessages();
    }, 1500);

    // Sync across tabs
    const handleStorageChange = (e) => {
      if (e.key === 'lumina_guestbook_msgs') loadMessages();
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isConnecting]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessage = {
      id: 'local-' + Date.now(),
      user: username,
      text: input.trim(),
      timestamp: Date.now(),
      role: 'user'
    };

    const saved = localStorage.getItem('lumina_guestbook_msgs');
    const localMsgs = saved ? JSON.parse(saved) : [];
    const updated = [...localMsgs, newMessage];
    
    localStorage.setItem('lumina_guestbook_msgs', JSON.stringify(updated));
    setMessages(prev => [...prev, newMessage]);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-[#080808] text-white font-sans overflow-hidden border border-white/5 shadow-2xl">
      {/* App Header */}
      <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-os-primary/20 rounded-lg text-os-primary animate-pulse">
            <Globe size={18} />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-tight italic">Lumina Guestbook</h2>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${isConnecting ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
              <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">
                {isConnecting ? 'Establishing Link...' : 'Global Node: Connected'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <span className="text-[10px] font-black text-os-primary/60 uppercase tracking-widest">{messages.length} Active Signals</span>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-grow overflow-y-auto p-6 space-y-6 scrollbar-os"
      >
        {isConnecting ? (
          <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-40">
             <Zap className="text-os-primary animate-bounce" size={32} />
             <p className="text-[10px] font-black uppercase tracking-[0.3em]">Synchronizing Neural Packets...</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center justify-center pb-8 border-b border-white/5 space-y-2 opacity-30">
               <Shield size={24} strokeWidth={1} />
               <p className="text-[10px] font-bold uppercase tracking-widest text-center max-w-[200px]">
                 Encrypted global channel. Messages are broadcasted to all active nodes.
               </p>
            </div>

            <AnimatePresence initial={false}>
              {messages.map((msg, i) => {
                const isSystem = msg.role === 'system';
                const isMe = msg.user === username;

                return (
                  <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${isSystem ? 'items-center py-4' : ''}`}
                  >
                    {!isSystem && (
                      <div className="flex items-center gap-2 mb-1.5 px-1">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isMe ? 'text-os-primary' : 'text-os-secondary'}`}>
                          {msg.user}
                        </span>
                        <span className="text-[9px] font-bold text-white/10 italic">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}

                    <div className={`
                      max-w-[85%] px-4 py-2.5 rounded-2xl text-sm font-medium leading-relaxed
                      ${isSystem ? 'bg-white/[0.03] text-os-primary/60 border border-os-primary/10 text-[11px] font-bold italic text-center' : 
                        isMe ? 'bg-os-primary text-black rounded-tr-none shadow-[0_4px_20px_rgba(204,151,255,0.2)]' : 
                        'bg-white/5 border border-white/5 rounded-tl-none text-white/80'}
                    `}>
                      {msg.text}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white/[0.02] border-t border-white/5">
        <form onSubmit={handleSend} className="flex gap-2">
          <div className="flex-grow relative group">
            <div className="absolute inset-0 bg-os-primary/5 rounded-xl blur-sm opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <input 
              disabled={isConnecting}
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={isConnecting ? "Establishing neural link..." : "Type your signal to the world..."}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-os-primary/50 transition-all relative z-10 disabled:opacity-50"
            />
          </div>
          <button 
            disabled={isConnecting || !input.trim()}
            type="submit"
            className="p-3 bg-os-primary text-black rounded-xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all shadow-[0_0_15px_rgba(204,151,255,0.2)]"
          >
            <Send size={20} />
          </button>
        </form>
        <div className="mt-3 flex justify-between items-center px-1">
           <div className="flex items-center gap-2 opacity-20">
              <User size={10} />
              <span className="text-[9px] font-bold uppercase tracking-widest">Active as {username}</span>
           </div>
           <div className="text-[8px] font-black text-white/10 uppercase tracking-[0.2em]">Nexus Protocol v4.2</div>
        </div>
      </div>
    </div>
  );
};

export default LuminaChat;
