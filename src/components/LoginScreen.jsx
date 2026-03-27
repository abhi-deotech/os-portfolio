import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, ArrowRight, Power, RefreshCw, Wifi, BatteryFull, ShieldCheck } from 'lucide-react';
import useOSStore from '../store/osStore';
import BootSequence from './BootSequence';
import { useIsMobile } from '../hooks/useMediaQuery';

const LoginScreen = () => {
  const { login, unlockAchievement } = useOSStore();
  const isMobile = useIsMobile();
  const [isBooting, setIsBooting] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [time, setTime] = useState(new Date());
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'guest') {
      login();
      unlockAchievement('first_login');
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="h-screen w-screen bg-[#050505] overflow-hidden relative font-sans select-none">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#050505] to-[#1a0a2e]" />
      <div className="absolute top-1/4 left-1/4 w-[50vw] h-[50vw] bg-purple-500/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[40vw] h-[40vw] bg-blue-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />

      <AnimatePresence mode="wait">
        {!showLogin && !isBooting ? (
          <motion.div 
            key="pre-boot"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full w-full flex flex-col items-center justify-center relative z-10"
          >
            {/* Clock and Big Boot Button */}
            <div className="flex flex-col items-center gap-8">
               <motion.div className="flex flex-col items-center">
                  <div className="text-8xl font-black text-white tracking-tighter mb-2">
                    {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-sm font-bold text-white/40 uppercase tracking-[0.4em]">
                    {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                  </div>
               </motion.div>

               <motion.button
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
                 onClick={() => setIsBooting(true)}
                 className="mt-8 px-12 py-4 rounded-full bg-os-primary text-black font-black text-xs tracking-[0.3em] uppercase hover:shadow-[0_0_40px_rgba(var(--os-primary-rgb),0.4)] transition-all duration-500"
               >
                 Boot System
               </motion.button>
            </div>
          </motion.div>
        ) : isBooting ? (
          <BootSequence key="boot" onComplete={() => {
            setIsBooting(false);
            setShowLogin(true);
          }} />
        ) : (
          <motion.div 
            key="login-form"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-full w-full flex items-center justify-center relative z-20"
          >
             <div className="w-full max-w-md p-8 bg-[#0c0c0c]/80 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-os-primary/10 to-transparent pointer-events-none" />
                
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-12">
                    <div>
                      <h2 className="text-3xl font-black text-white italic tracking-tight">Abhimanyu Saxena</h2>
                      <p className="text-[10px] font-bold text-os-primary uppercase tracking-[0.3em]">System Authority</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-os-primary">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] ml-2">Access Key</label>
                      <div className="relative">
                        <input
                          autoFocus
                          type="password"
                          placeholder="Type 'guest'"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={`w-full bg-white/5 border ${error ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'border-white/10 focus:border-os-primary'} rounded-2xl py-5 px-6 text-white text-sm outline-none transition-all focus:bg-white/[0.08]`}
                        />
                      </div>
                      {error && (
                        <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-[10px] text-red-500 font-bold uppercase tracking-widest ml-2">Invalid Credentials</motion.p>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-white text-black font-black py-5 rounded-2xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-3 uppercase text-xs tracking-[0.3em]"
                    >
                      Authenticate
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-4 py-2">
                       <div className="h-[1px] flex-grow bg-white/5" />
                       <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">or</span>
                       <div className="h-[1px] flex-grow bg-white/5" />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        login('guest');
                        unlockAchievement('first_login');
                      }}
                      className="w-full bg-white/5 border border-white/10 text-white/60 font-bold py-4 rounded-2xl hover:bg-white/10 hover:text-white transition-all duration-300 uppercase text-[10px] tracking-[0.2em]"
                    >
                      Enter as Guest
                    </button>
                  </form>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LoginScreen;
