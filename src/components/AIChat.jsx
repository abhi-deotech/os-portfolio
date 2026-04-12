import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Brain, Sparkles, MessageSquare } from 'lucide-react';
import useOSStore from '../store/osStore';

const AIChat = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hello! I'm Lumina AI. How can I help you explore this portfolio today?", timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const responses = {
    stack: "This portfolio is a high-performance MERN-style simulation built with React 19, Vite, Tailwind CSS 3.4, Framer Motion for fluid 60fps animations, and Zustand with persistent storage for the virtual OS state.",
    author: "Abhimanyu Saxena is a Senior Software Engineer and Team Lead with expertise in architecting scalable platforms, FinTech, and IoT. He currently leads development at Deotechsolutions.",
    experience: "Abhimanyu has over 4 years of professional experience, including roles at LendFoundry (FinTech) and currently Deotechsolutions. He has a strong background in both full-stack web and systems/embedded development.",
    contact: "You can find Abhimanyu on LinkedIn or GitHub. For professional inquiries, his email is available in the 'About' section, or you can use the 'Mail' app on this desktop.",
    projects: "Key projects include Lumina OS, an enterprise MERN Dashboard, and various IoT controllers. Check the 'Projects' app on the desktop for interactive demos and technical deep-dives.",
    os: "Lumina OS is a custom-built desktop environment simulation designed to showcase React state management, complex windowing systems, and interactive UI/UX patterns in a portfolio context.",
    hire: "Abhimanyu is currently open to senior engineering roles and high-impact freelance projects. He specializes in React, Node.js, and System Architecture.",
    skills: "His technical arsenal includes JavaScript/TypeScript, React, Node.js, Python, C++, AWS, Docker, and CI/CD. He is also experienced in IoT and Embedded systems.",
    default: "I'm Lumina AI, your guide to Abhimanyu's work. Ask me about his 'experience', 'skills', 'stack', or 'hire' status!"
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input.trim();
    const newMessages = [...messages, { role: 'user', text: userMsg, timestamp: new Date() }];
    setMessages(newMessages);
    setInput('');
    setIsTyping(true);

    // Achievement: Deep Thinker
    const userMessageCount = newMessages.filter(m => m.role === 'user').length;
    if (userMessageCount >= 3) {
      useOSStore.getState().unlockAchievement('deep_thinker');
    }

    // Simulate AI thinking
    setTimeout(() => {
      const q = userMsg.toLowerCase();
      let reply = responses.default;

      if (q.includes('stack') || q.includes('tech') || q.includes('built')) reply = responses.stack;
      else if (q.includes('who') || q.includes('author') || q.includes('abhi')) reply = responses.author;
      else if (q.includes('experience') || q.includes('work') || q.includes('career') || q.includes('history')) reply = responses.experience;
      else if (q.includes('contact') || q.includes('reach') || q.includes('mail') || q.includes('email') || q.includes('link')) reply = responses.contact;
      else if (q.includes('project') || q.includes('work') || q.includes('portfolio')) reply = responses.projects;
      else if (q.includes('os') || q.includes('lumina')) reply = responses.os;
      else if (q.includes('hire') || q.includes('job') || q.includes('opportunity') || q.includes('available')) reply = responses.hire;
      else if (q.includes('skill') || q.includes('language') || q.includes('know') || q.includes('expert')) reply = responses.skills;

      setMessages(prev => [...prev, { role: 'assistant', text: reply, timestamp: new Date() }]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full bg-[#0c0c0c]">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5 bg-white/[0.02]">
        <div className="w-10 h-10 rounded-2xl bg-os-primary/20 flex items-center justify-center text-os-primary shadow-[0_0_20px_rgba(var(--os-primary-rgb),0.2)]">
          <Brain size={20} />
        </div>
        <div>
          <h3 className="text-sm font-black text-white italic">Lumina AI</h3>
          <p className="text-[10px] font-bold text-os-primary uppercase tracking-widest">Neural Link Active</p>
        </div>
        <div className="ml-auto flex gap-2">
           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-grow overflow-y-auto p-6 space-y-6 scrollbar-hide"
      >
        {messages.map((msg, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={i} 
            className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center ${
              msg.role === 'assistant' ? 'bg-os-primary/10 text-os-primary' : 'bg-os-secondary/10 text-os-secondary'
            }`}>
              {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
            </div>
            <div className={`max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed ${
              msg.role === 'assistant' ? 'bg-white/[0.03] text-white/80' : 'bg-os-secondary/20 text-white border border-os-secondary/20'
            }`}>
              {msg.text}
            </div>
          </motion.div>
        ))}
        {isTyping && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-xl bg-os-primary/10 text-os-primary flex items-center justify-center">
              <Bot size={16} />
            </div>
            <div className="bg-white/[0.03] rounded-2xl p-4 flex gap-1">
              <span className="w-1.5 h-1.5 bg-os-primary/40 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-os-primary/40 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-os-primary/40 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-6 pt-0">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-os-primary/20 to-os-secondary/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-all duration-500" />
          <div className="relative flex gap-2">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about Abhimanyu, his stack, or projects..."
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-2xl py-4 px-6 text-xs text-white outline-none focus:border-os-primary/50 transition-all"
            />
            <button 
              type="submit"
              className="px-6 bg-os-primary text-black rounded-2xl font-black text-xs hover:scale-105 active:scale-95 transition-all shadow-lg"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AIChat;
