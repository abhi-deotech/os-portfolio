import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Send, Trash2, Archive, Star, PenSquare, ChevronLeft, Search, User, Clock, CheckCircle } from 'lucide-react';
import useOSStore from '../store/osStore';

const MOCK_EMAILS = [
  {
    id: 1,
    sender: "Lumina System",
    email: "system@lumina-os.org",
    subject: "Welcome to your new OS",
    content: "Greetings guest! Welcome to Lumina OS v1.0. This environment is designed to showcase the power of modern web technologies. Feel free to explore the apps and customize your experience.",
    time: "10:30 AM",
    read: true,
    starred: true
  },
  {
    id: 2,
    sender: "Abhimanyu Saxena",
    email: "abhi@saxena.dev",
    subject: "Collaboration Inquiry",
    content: "Hi there! Thanks for checking out my OS portfolio. I'm always open to discussing new projects, technical architecture, or high-performance frontend patterns. Drop me a message using the Compose button!",
    time: "Yesterday",
    read: false,
    starred: false
  },
  {
    id: 3,
    sender: "GitHub Security",
    email: "noreply@github.com",
    subject: "[Security] New login detected",
    content: "A new login was detected for your account from a virtual Lumina OS terminal. If this was you, no further action is required.",
    time: "Mar 28",
    read: true,
    starred: false
  }
];

const MailApp = () => {
  const [emails, setEmails] = useState(MOCK_EMAILS);
  const [selectedId, setSelectedId] = useState(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeData, setComposeData] = useState({ to: '', subject: '', message: '' });
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const selectedEmail = emails.find(e => e.id === selectedId);

  const handleSend = (e) => {
    e.preventDefault();
    setIsSending(true);
    // Mock sending process
    setTimeout(() => {
      setIsSending(false);
      setIsComposeOpen(false);
      setShowSuccess(true);
      setComposeData({ to: '', subject: '', message: '' });
      setTimeout(() => setShowSuccess(false), 3000);
    }, 1500);
  };

  const toggleStar = (id, e) => {
    e.stopPropagation();
    setEmails(prev => prev.map(email => 
      email.id === id ? { ...email, starred: !email.starred } : email
    ));
  };

  return (
    <div className="flex h-full w-full bg-[#0a0a0a] text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-16 md:w-64 border-r border-white/5 flex flex-col p-4 space-y-6">
        <button 
          onClick={() => setIsComposeOpen(true)}
          className="w-full bg-os-primary text-black rounded-2xl p-3 md:px-4 flex items-center justify-center gap-3 font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all"
        >
          <PenSquare size={18} />
          <span className="hidden md:inline">Compose</span>
        </button>

        <nav className="space-y-1">
          {[
            { icon: Mail, label: 'Inbox', count: emails.filter(e => !e.read).length, active: true },
            { icon: Star, label: 'Starred', count: emails.filter(e => e.starred).length },
            { icon: Send, label: 'Sent', count: 0 },
            { icon: Archive, label: 'Archive', count: 0 },
            { icon: Trash2, label: 'Trash', count: 0 },
          ].map((item) => (
            <div 
              key={item.label}
              className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${item.active ? 'bg-os-primary/10 text-os-primary' : 'hover:bg-white/5 text-white/40'}`}
            >
              <div className="flex items-center gap-3">
                <item.icon size={18} />
                <span className="hidden md:inline font-bold text-sm">{item.label}</span>
              </div>
              {item.count > 0 && <span className="hidden md:inline text-[10px] font-black bg-os-primary text-black px-1.5 py-0.5 rounded">{item.count}</span>}
            </div>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative">
        <header className="h-16 border-b border-white/5 flex items-center px-6 gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
            <input 
              type="text" 
              placeholder="Search neural mail..." 
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-os-primary/50 transition-all"
            />
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* List */}
          <div className={`w-full ${selectedId ? 'hidden md:block md:w-80' : ''} border-r border-white/5 overflow-y-auto`}>
            {emails.map((email) => (
              <div 
                key={email.id}
                onClick={() => {
                  setSelectedId(email.id);
                  setEmails(prev => prev.map(e => e.id === email.id ? { ...e, read: true } : e));
                }}
                className={`p-4 border-b border-white/[0.03] cursor-pointer hover:bg-white/[0.02] transition-all relative ${!email.read ? 'bg-os-primary/[0.03]' : ''} ${selectedId === email.id ? 'bg-os-primary/10' : ''}`}
              >
                {!email.read && <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-os-primary rounded-r-full" />}
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-sm ${!email.read ? 'font-black text-white' : 'font-bold text-white/60'}`}>{email.sender}</span>
                  <span className="text-[10px] font-bold text-white/20">{email.time}</span>
                </div>
                <h4 className={`text-xs truncate ${!email.read ? 'font-bold text-white/90' : 'text-white/40'}`}>{email.subject}</h4>
                <p className="text-xs text-white/20 truncate mt-1">{email.content}</p>
                <button 
                  onClick={(e) => toggleStar(email.id, e)}
                  className={`absolute right-4 bottom-4 transition-colors ${email.starred ? 'text-yellow-400' : 'text-white/10 hover:text-white/30'}`}
                >
                  <Star size={14} fill={email.starred ? "currentColor" : "none"} />
                </button>
              </div>
            ))}
          </div>

          {/* Viewer */}
          <div className={`flex-1 flex flex-col ${!selectedId ? 'hidden md:flex items-center justify-center' : ''}`}>
            {selectedId ? (
              <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedId(null)} className="md:hidden p-2 hover:bg-white/5 rounded-lg">
                      <ChevronLeft size={20} />
                    </button>
                    <div>
                      <h2 className="text-xl font-black">{selectedEmail.subject}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-bold text-os-primary px-2 py-0.5 bg-os-primary/10 rounded">Inbox</span>
                        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Neural Encryption: Active</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2.5 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all"><Archive size={18} /></button>
                    <button className="p-2.5 hover:bg-red-500/10 rounded-xl text-white/40 hover:text-red-400 transition-all"><Trash2 size={18} /></button>
                  </div>
                </div>
                <div className="p-8 overflow-y-auto space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-os-primary to-os-secondary p-0.5">
                      <div className="w-full h-full rounded-[0.9rem] bg-black flex items-center justify-center font-black text-os-primary">
                        {selectedEmail.sender[0]}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{selectedEmail.sender}</span>
                        <span className="text-xs text-white/20">&lt;{selectedEmail.email}&gt;</span>
                      </div>
                      <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">to me • {selectedEmail.time}</p>
                    </div>
                  </div>
                  <div className="text-sm text-white/70 leading-relaxed max-w-2xl whitespace-pre-wrap font-medium">
                    {selectedEmail.content}
                  </div>
                  <div className="pt-12 border-t border-white/5">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between group cursor-pointer hover:bg-white/[0.08] transition-all">
                       <span className="text-xs font-bold text-white/40 group-hover:text-os-primary transition-colors">Click here to Reply or Forward...</span>
                       <Send size={16} className="text-white/10 group-hover:text-os-primary transition-all" />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4 opacity-20">
                <Mail size={64} strokeWidth={1} className="mx-auto" />
                <p className="text-sm font-black uppercase tracking-[0.3em]">No Message Selected</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compose Modal */}
      <AnimatePresence>
        {isComposeOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsComposeOpen(false)} />
            <div className="relative w-full max-w-xl bg-[#0f0f0f] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden shadow-black/50">
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <h3 className="font-black uppercase italic tracking-tight text-os-primary">New Neural Message</h3>
                <button onClick={() => setIsComposeOpen(false)} className="text-white/20 hover:text-white"><Trash2 size={18} /></button>
              </div>
              <form onSubmit={handleSend} className="p-6 space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 border-b border-white/5 pb-2">
                    <span className="text-xs font-black text-white/20 uppercase w-12">To</span>
                    <input 
                      required
                      type="email" 
                      placeholder="abhimanyu@saxena.dev"
                      className="bg-transparent border-none outline-none text-sm w-full text-os-primary font-bold"
                      value={composeData.to}
                      onChange={e => setComposeData({...composeData, to: e.target.value})}
                    />
                  </div>
                  <div className="flex items-center gap-4 border-b border-white/5 pb-2">
                    <span className="text-xs font-black text-white/20 uppercase w-12">Subject</span>
                    <input 
                      required
                      type="text" 
                      placeholder="Inquiry regarding..."
                      className="bg-transparent border-none outline-none text-sm w-full font-bold"
                      value={composeData.subject}
                      onChange={e => setComposeData({...composeData, subject: e.target.value})}
                    />
                  </div>
                </div>
                <textarea 
                  required
                  placeholder="Write your message here..."
                  className="w-full h-64 bg-transparent border-none outline-none text-sm resize-none py-4 leading-relaxed font-medium"
                  value={composeData.message}
                  onChange={e => setComposeData({...composeData, message: e.target.value})}
                />
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40"><Archive size={16} /></div>
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40"><Clock size={16} /></div>
                  </div>
                  <button 
                    type="submit"
                    disabled={isSending}
                    className="bg-os-primary text-black px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all shadow-[0_0_20px_rgba(204,151,255,0.2)]"
                  >
                    {isSending ? <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> : <Send size={16} />}
                    {isSending ? 'Transmitting...' : 'Send Message'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Notification */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-os-primary text-black px-6 py-3 rounded-2xl shadow-2xl shadow-os-primary/20"
          >
            <CheckCircle size={20} />
            <span className="font-black uppercase tracking-widest text-xs">Neural Packet Delivered Successfully</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MailApp;
