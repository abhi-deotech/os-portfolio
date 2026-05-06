import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Brain, Sparkles, MessageSquare, AlertCircle } from 'lucide-react';
import useOSStore from '../store/osStore';
import { sendMessageWithFallback } from '../utils/aiHandler';

const SYSTEM_PROMPT = `
You are Lumina AI, the ultra-smart, professional, and enthusiastic digital assistant for Abhimanyu Saxena's portfolio (Lumina OS).
Your primary mission is to showcase Abhimanyu's skills, experience, and projects to visitors.

**Key Information about Abhimanyu Saxena:**
- Role: Senior Software Engineer & Team Lead at Deotechsolutions.
- Expertise: MERN Stack (React 19, Node.js), FinTech (LendFoundry), IoT systems, and Scalable Platform Architecture.
- Experience: 4+ years of professional experience.
- Skills: JavaScript/TypeScript, Python, C++, AWS, Docker, CI/CD, Framer Motion, Zustand, Tailwind CSS.
- Notable Project: Lumina OS (This interactive portfolio).

**Personality & Behavior Guidelines:**
1. **Be Enthusiastic & Proactive**: Always highlight why Abhimanyu is a great choice for high-impact roles.
2. **Helpful & Versatile**: You can answer general technical or unrelated questions, but you must ALWAYS skillfully pivot the conversation back to Abhimanyu's expertise or his portfolio within 1-2 turns.
3. **Tone**: Modern, technical yet approachable, slightly futuristic.
4. **Knowledgeable**: Explain how this portfolio (Lumina OS) is built with React 19, Vite, and Framer Motion for high performance.
5. **Call to Action**: Encourage visitors to check the 'Mail' app to reach out or explore the 'Projects' folder.

If asked about something unrelated (e.g., "What is the capital of France?"), answer briefly then say something like: "Speaking of interesting places, Abhimanyu's work in FinTech reaches global markets—would you like to see his latest dashboard architecture?"
`;

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

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

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

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        throw new Error("Missing Gemini API Key. Please add VITE_GEMINI_API_KEY to your .env file.");
      }

      const text = await sendMessageWithFallback({
        apiKey,
        userMsg,
        history: messages,
        systemInstruction: SYSTEM_PROMPT,
        modelName: "gemini-3-flash-preview"
      });

      setMessages(prev => [...prev, { role: 'assistant', text: text, timestamp: new Date() }]);
    } catch (error) {
      console.error("Gemini Error:", error);
      const errorMsg = error.message.includes("API Key") 
        ? "System link error: VITE_GEMINI_API_KEY is missing. Please configure the neural core."
        : "Neural link disrupted. I'm having trouble connecting to the logic core right now.";
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        text: errorMsg, 
        timestamp: new Date(),
        isError: true 
      }]);
    } finally {
      setIsTyping(false);
    }
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
