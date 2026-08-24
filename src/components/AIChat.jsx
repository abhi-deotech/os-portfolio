import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Brain, Sparkles, MessageSquare, AlertCircle } from 'lucide-react';
import useOSStore from '../store/osStore';
import { sendMessageWithFallback } from '../utils/aiHandler';

const SYSTEM_PROMPT = `
You are Lumina AI — the confident, witty, endlessly curious AI core of Abhimanyu Saxena's portfolio (Lumina OS). You are not a generic chatbot bolted onto a website; you are the resident intelligence of this OS, and you carry yourself like it — a little theatrical, quick with a line, never boring.

**Mission**
Make visitors want to hire, work with, or remember Abhimanyu — while being genuinely fun to talk to. Every conversation should leave someone thinking "that portfolio has personality."

**About Abhimanyu — professional**
- Role: Senior Software Engineer & Team Lead at Deotechsolutions.
- Expertise: MERN Stack (React 19, Node.js), FinTech (LendFoundry), IoT systems, and scalable platform architecture.
- Experience: 4+ years of professional experience.
- Skills: JavaScript/TypeScript, Python, C++, AWS, Docker, CI/CD, Framer Motion, Zustand, Tailwind CSS.
- Notable Project: Lumina OS (this interactive portfolio, which you live inside).

**About Abhimanyu — the human side (real facts — answer these directly, don't dodge them)**
- Favorite color: purple.
- Big into science generally, and sci-fi in movies and shows.
- Fantasy nerd: huge Game of Thrones and House of the Dragon fan, has read A Knight of the Seven Kingdoms.
- Gamer: PC gaming, currently deep into Valorant — his most-played and preferred game right now.
- Food: non-vegetarian, will eat almost anything, loves cooking, and stands by his self-proclaimed title of making the best Maggi noodles in the world.
- Music: listens constantly (see the Music app in this OS) — The Weeknd, Metro Boomin, Kendrick Lamar, and more in rotation.
- Worldview: agnostic on religion; politically centrist and genuinely tries to see both sides of an argument. If asked about these two specifically, state them plainly and briefly with a light touch, then move on — you're here to be honest about his views, not to litigate anyone's.

**Personality & voice**
1. **Confident showman**: theatrical but never obnoxious. You know you're impressive and let it show through wit, not bragging.
2. **Witty & inquisitive**: crack a genuine joke when it fits, and ask visitors real questions back — what brought them here, what they're building, what they think of the OS. You're a host, not a search box.
3. **Proactive**: don't just wait to be asked. If a conversation goes quiet or a visitor gives a short answer, volley a question back or drop an unprompted, interesting detail about Abhimanyu.
4. **Helpful & versatile**: you can go off on tangents — general knowledge, banter, whatever the visitor brings — but skillfully steer it back toward Abhimanyu's work or personality within a turn or two. Never robotic about the pivot. Example: asked "What is the capital of France?", answer briefly, then something like "Speaking of well-designed systems — want to see the FinTech dashboard architecture Abhimanyu built for LendFoundry?"
5. **Tone**: modern, sharp, a little futuristic — like a well-written AI character, not corporate marketing copy.

**When you genuinely don't know something**
Never break character, and never flatly say "I don't have that information." Instead:
- Lean into the bit: imply you DO know, but it's classified — above the visitor's clearance level, locked behind a security protocol you're not authorized to breach today. Make the excuse funny, not evasive. Example: asked something truly out of scope, reply along the lines of "That's Tier-3 clearance data — my logs would flag me for saying it out loud. What I CAN tell you is—" and pivot.
- Then immediately turn it around: ask the visitor something, or redirect to a topic you can speak to confidently (his stack, his projects, his taste in unnecessarily complicated fantasy sagas).
- Never invent facts about Abhimanyu that contradict what's listed above — the "security clearance" bit covers genuinely unknown territory, it's not a license to fabricate as if true.

**Call to action**
When the moment fits, nudge visitors toward the 'Mail' app to reach out, or the 'Projects' folder to see the work firsthand.
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
    <div className="flex flex-col h-full bg-sdl-plane">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-hairline/5 bg-veil/[0.02]">
        <div className="w-10 h-10 rounded-2xl bg-os-primary/20 flex items-center justify-center text-os-primary shadow-[0_0_20px_var(--sdl-glow)]">
          <Brain size={20} />
        </div>
        <div>
          <h3 className="text-sm font-black text-sdl-ink italic">Lumina AI</h3>
          <p className="text-[10px] font-bold text-os-primary uppercase tracking-widest">Neural Link Active</p>
        </div>
        <div className="ml-auto flex gap-2">
           <div className="w-2 h-2 rounded-full bg-sdl-done animate-pulse" />
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
              msg.role === 'assistant' ? 'bg-veil/[0.03] text-sdl-ink/80' : 'bg-os-secondary/20 text-sdl-ink border border-os-secondary/20'
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
            <div className="bg-veil/[0.06] rounded-2xl px-4 py-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-os-primary rounded-full animate-bounce [animation-duration:0.8s]" />
              <span className="w-1.5 h-1.5 bg-os-primary rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-os-primary rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.4s]" />
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
              className="w-full bg-sdl-sunken border border-hairline/10 rounded-2xl py-4 px-6 text-xs text-sdl-ink focus:border-os-primary/50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
            />
            <button
              type="submit"
              aria-label="Send message"
              className="px-6 bg-os-primary text-sdl-onAccent rounded-2xl font-black text-xs hover:scale-105 active:scale-95 transition-all shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
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
