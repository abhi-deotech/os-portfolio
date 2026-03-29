import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';
import useOSStore from '../store/osStore';

const AchievementToast = ({ achievementId, onComplete }) => {
  const { transparencyEffects } = useOSStore();
  const achievementsList = {
    first_login: { title: 'Hello World', desc: 'Successfully logged into Lumina OS.' },
    search_pro: { title: 'Spotlight Master', desc: 'Used the global search for the first time.' },
    terminal_wiz: { title: 'Command Line Guru', desc: 'Executed 5 terminal commands.' },
    hacker: { title: 'Mainframe Access', desc: 'Tried to SSH into a remote host.' },
    writer: { title: 'Poet in Exile', desc: 'Saved your first note in Notepad.' },
    monitor: { title: 'System Admin', desc: 'Opened the Task Manager to monitor resources.' },
    easter_egg: { title: 'Rabbit Hole', desc: 'Found the secret matrix mode.' },
  };

  const achievement = achievementsList[achievementId];

  useEffect(() => {
    const timer = setTimeout(onComplete, 5000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!achievement) return null;

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      className={`fixed bottom-24 right-6 z-[2000] w-80 bg-black/80 ${transparencyEffects ? 'backdrop-blur-xl' : ''} border border-os-primary/30 rounded-2xl p-4 flex items-center gap-4 shadow-2xl overflow-hidden shadow-os-primary/10`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-os-primary/5 to-transparent pointer-events-none" />
      <div className="p-3 rounded-xl bg-os-primary/20 text-os-primary">
        <Trophy className="w-6 h-6" />
      </div>
      <div>
        <h4 className="text-xs font-bold text-os-primary uppercase tracking-widest mb-1">Achievement Unlocked</h4>
        <h3 className="text-sm font-bold text-white mb-0.5">{achievement.title}</h3>
        <p className="text-[10px] text-white/50 leading-tight">{achievement.desc}</p>
      </div>
      <motion.div 
        initial={{ width: '100%' }}
        animate={{ width: 0 }}
        transition={{ duration: 5, ease: 'linear' }}
        className="absolute bottom-0 left-0 h-0.5 bg-os-primary"
      />
    </motion.div>
  );
};

export default AchievementToast;
