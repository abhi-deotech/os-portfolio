import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Send, Trash2, Archive, Star, PenSquare, ChevronLeft, Search, User, Clock, CheckCircle } from 'lucide-react';

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

  const openEmail = (id) => {
    setSelectedId(id);
    setEmails(prev => prev.map(e => e.id === id ? { ...e, read: true } : e));
  };

  const toggleStar = (id, e) => {
    e.stopPropagation();
    setEmails(prev => prev.map(email => 
      email.id === id ? { ...email, starred: !email.starred } : email
    ));
  };

  return (
    <div className="flex h-full w-full bg-sdl-plane text-sdl-ink font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-16 md:w-64 border-r border-hairline/5 flex flex-col p-4 space-y-6">
        <button
          onClick={() => setIsComposeOpen(true)}
          className="w-full bg-os-primary text-sdl-onAccent rounded-2xl p-3 md:px-4 flex items-center justify-center gap-3 font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
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
              className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${item.active ? 'bg-os-primary/10 text-os-primary' : 'hover:bg-veil/5 text-sdl-sec'}`}
            >
              <div className="flex items-center gap-3">
                <item.icon size={18} />
                <span className="hidden md:inline font-bold text-sm">{item.label}</span>
              </div>
              {item.count > 0 && <span className="hidden md:inline text-[10px] font-black bg-os-primary text-sdl-onAccent px-1.5 py-0.5 rounded">{item.count}</span>}
            </div>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative">
        <header className="h-16 border-b border-hairline/5 flex items-center px-6 gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-sdl-sec" size={16} />
            <input 
              type="text" 
              placeholder="Search neural mail..." 
              className="w-full bg-veil/5 border border-hairline/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:border-os-primary/50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
            />
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* List */}
          <div role="list" aria-label="Inbox" className={`w-full ${selectedId ? 'hidden md:block md:w-80' : ''} border-r border-hairline/5 overflow-y-auto`}>
            {emails.map((email) => (
              // `listitem` + a nested control, NOT role="button": the star below is a real
              // <button> inside this row, and an interactive element inside role="button" is
              // invalid ARIA — worse, the row's Enter/Space handler fired while focus was on the
              // star, cancelling its activation so it could only ever be clicked. The row keeps its
              // own tab stop and guards on the event actually targeting the row.
              <div
                key={email.id}
                role="listitem"
                tabIndex={0}
                onClick={() => openEmail(email.id)}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openEmail(email.id);
                  }
                }}
                className={`p-4 border-b border-hairline/[0.03] cursor-pointer hover:bg-veil/[0.02] transition-all relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50 ${!email.read ? 'bg-os-primary/[0.03]' : ''} ${selectedId === email.id ? 'bg-os-primary/10' : ''}`}
              >
                {!email.read && <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-os-primary rounded-r-full" />}
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-sm ${!email.read ? 'font-black text-sdl-ink' : 'font-bold text-sdl-sec'}`}>{email.sender}</span>
                  <span className="text-[10px] font-bold text-sdl-sec">{email.time}</span>
                </div>
                <h4 className={`text-xs truncate ${!email.read ? 'font-bold text-sdl-ink/90' : 'text-sdl-sec'}`}>{email.subject}</h4>
                <p className="text-xs text-sdl-sec truncate mt-1">{email.content}</p>
                {/* Starred is emphasis, not a warning, so it takes the accent rather than `warn`.
                    The old yellow-400 was a fixed hue that ignored the colorway and sank to ~1.9:1
                    against the light packs' near-white plane. */}
                <button
                  onClick={(e) => toggleStar(email.id, e)}
                  aria-label={email.starred ? `Unstar ${email.subject}` : `Star ${email.subject}`}
                  aria-pressed={email.starred}
                  className={`absolute right-4 bottom-4 rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50 ${email.starred ? 'text-sdl-accent' : 'text-sdl-sec hover:text-sdl-ink'}`}
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
                <div className="p-6 border-b border-hairline/5 flex justify-between items-center bg-veil/[0.01]">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedId(null)} aria-label="Back to inbox" className="md:hidden p-2 hover:bg-veil/5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50">
                      <ChevronLeft size={20} />
                    </button>
                    <div>
                      <h2 className="text-xl font-black">{selectedEmail.subject}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-bold text-os-primary px-2 py-0.5 bg-os-primary/10 rounded">Inbox</span>
                        <span className="text-[10px] font-black text-sdl-sec uppercase tracking-widest">Neural Encryption: Active</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button aria-label="Archive message" className="p-2.5 hover:bg-veil/5 rounded-xl text-sdl-sec hover:text-sdl-ink transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"><Archive size={18} /></button>
                    <button aria-label="Delete message" className="p-2.5 hover:bg-sdl-alert/10 rounded-xl text-sdl-sec hover:text-sdl-alert transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"><Trash2 size={18} /></button>
                  </div>
                </div>
                <div className="p-8 overflow-y-auto space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-os-primary to-os-secondary p-0.5">
                      <div className="w-full h-full rounded-[0.9rem] bg-sdl-plane flex items-center justify-center font-black text-os-primary">
                        {selectedEmail.sender[0]}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sdl-ink">{selectedEmail.sender}</span>
                        <span className="text-xs text-sdl-sec">&lt;{selectedEmail.email}&gt;</span>
                      </div>
                      <p className="text-[10px] font-black text-sdl-sec uppercase tracking-widest">to me • {selectedEmail.time}</p>
                    </div>
                  </div>
                  <div className="text-sm text-sdl-ink/70 leading-relaxed max-w-2xl whitespace-pre-wrap font-medium">
                    {selectedEmail.content}
                  </div>
                  <div className="pt-12 border-t border-hairline/5">
                    <div className="p-4 rounded-2xl bg-veil/5 border border-hairline/5 flex items-center justify-between group cursor-pointer hover:bg-veil/[0.08] transition-all">
                       <span className="text-xs font-bold text-sdl-sec group-hover:text-os-primary transition-colors">Click here to Reply or Forward...</span>
                       <Send size={16} className="text-sdl-sec group-hover:text-os-primary transition-all" />
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
            <div className="absolute inset-0 bg-scrim backdrop-blur-sm" onClick={() => setIsComposeOpen(false)} />
            <div className="relative w-full max-w-xl bg-sdl-surface border border-hairline/10 rounded-[2rem] shadow-2xl overflow-hidden shadow-[var(--sdl-lift)]">
              <div className="p-6 border-b border-hairline/5 flex justify-between items-center bg-veil/[0.02]">
                <h3 className="font-black uppercase italic tracking-tight text-os-primary">New Neural Message</h3>
                <button onClick={() => setIsComposeOpen(false)} aria-label="Discard draft" className="text-sdl-sec hover:text-sdl-ink rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"><Trash2 size={18} /></button>
              </div>
              <form onSubmit={handleSend} className="p-6 space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 border-b border-hairline/5 pb-2">
                    <span className="text-xs font-black text-sdl-sec uppercase w-12">To</span>
                    <input 
                      required
                      type="email" 
                      placeholder="abhimanyu@saxena.dev"
                      className="bg-transparent border-none rounded-sm text-sm w-full text-os-primary font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
                      value={composeData.to}
                      onChange={e => setComposeData({...composeData, to: e.target.value})}
                    />
                  </div>
                  <div className="flex items-center gap-4 border-b border-hairline/5 pb-2">
                    <span className="text-xs font-black text-sdl-sec uppercase w-12">Subject</span>
                    <input 
                      required
                      type="text" 
                      placeholder="Inquiry regarding..."
                      className="bg-transparent border-none rounded-sm text-sm w-full font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
                      value={composeData.subject}
                      onChange={e => setComposeData({...composeData, subject: e.target.value})}
                    />
                  </div>
                </div>
                <textarea 
                  required
                  placeholder="Write your message here..."
                  className="w-full h-64 bg-transparent border-none rounded-sm text-sm resize-none py-4 leading-relaxed font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
                  value={composeData.message}
                  onChange={e => setComposeData({...composeData, message: e.target.value})}
                />
                <div className="flex items-center justify-between pt-4 border-t border-hairline/5">
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-lg bg-veil/5 flex items-center justify-center text-sdl-sec"><Archive size={16} /></div>
                    <div className="w-8 h-8 rounded-lg bg-veil/5 flex items-center justify-center text-sdl-sec"><Clock size={16} /></div>
                  </div>
                  <button 
                    type="submit"
                    disabled={isSending}
                    className="bg-os-primary text-sdl-onAccent px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all shadow-[0_0_20px_var(--sdl-glow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
                  >
                    {/* Spinner sits ON the accent fill, so it has to be onAccent — a black ring
                        disappeared entirely on the darker accents. */}
                    {isSending ? <div className="w-4 h-4 border-2 border-sdl-onAccent/20 border-t-sdl-onAccent rounded-full animate-spin" /> : <Send size={16} />}
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
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-os-primary text-sdl-onAccent px-6 py-3 rounded-2xl shadow-2xl shadow-os-primary/20"
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
