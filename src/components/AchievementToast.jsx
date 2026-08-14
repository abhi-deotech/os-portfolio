import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Sparkles } from 'lucide-react';
import useOSStore from '../store/osStore';

/**
 * `achievementId` is either an id from the table below, or a `{ title, desc }` object for a one-off
 * toast. The object form exists because the queue used to hold ids ONLY, and anything without a
 * table entry rendered nothing at all — so a caller with something to say had to first invent a
 * fake achievement.
 */
const AchievementToast = ({ achievementId, onComplete }) => {
  const { transparencyEffects } = useOSStore();
  const achievementsList = {
    first_login: { title: 'Hello World', desc: 'Successfully logged into Lumina OS.' },
    search_pro: { title: 'Spotlight Master', desc: 'Used the global search for the first time.' },
    terminal_wiz: { title: 'Command Line Guru', desc: 'Executed 5 terminal commands.' },
    hacker: { title: 'Mainframe Access', desc: 'Tried to SSH into a remote host.' },
    writer: { title: 'Poet in Exile', desc: 'Saved your first note in Notepad.' },
    monitor: { title: 'System Admin', desc: 'Opened the Task Manager to monitor resources.' },
    gamer: { title: 'NexusX Explorer', desc: 'Launched your first game in the Game Center.' },
    audiophile: { title: 'Music Lover', desc: 'Played a track in the Music app.' },
    decorator: { title: 'Interior Designer', desc: 'Customized your desktop theme in Settings.' },
    speed_demon: { title: 'Speed Demon', desc: 'Personalized your system performance with a benchmark.' },
    architect: { title: 'Deep Diver', desc: 'Explored the system architecture documentation.' },
    socialite: { title: 'Well Connected', desc: 'Visited my LinkedIn or GitHub profile.' },
    easter_egg: { title: 'Rabbit Hole', desc: 'Found the secret matrix mode.' },
  };

  const isCustom = typeof achievementId === 'object' && achievementId !== null;
  const achievement = isCustom ? achievementId : achievementsList[achievementId];

  useEffect(() => {
    const timer = setTimeout(onComplete, 5000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!achievement) return null;

  return (
    // surface, not veil: a toast is a card that floats over the wallpaper with nothing behind it to
    // tint, and its body text is `sdl-ink`. A veil deepens toward ink under a light colorway, which
    // would put dark text on a darkened wallpaper.
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      className={`relative w-80 bg-sdl-surface/90 ${transparencyEffects ? 'backdrop-blur-xl' : ''} border border-os-primary/30 rounded-2xl p-4 flex items-center gap-4 shadow-[var(--sdl-lift)] overflow-hidden shadow-os-primary/10 pointer-events-auto`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-os-primary/5 to-transparent pointer-events-none" />
      <div className="p-3 rounded-xl bg-os-primary/20 text-os-primary">
        {isCustom ? <Sparkles className="w-6 h-6" /> : <Trophy className="w-6 h-6" />}
      </div>
      <div>
        <h4 className="text-xs font-bold text-os-primary uppercase tracking-widest mb-1">
          {isCustom ? (achievement.kicker || 'Applied') : 'Achievement Unlocked'}
        </h4>
        <h3 className="text-sm font-bold text-sdl-ink mb-0.5">{achievement.title}</h3>
        <p className="text-[10px] text-sdl-sec leading-tight">{achievement.desc}</p>
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
