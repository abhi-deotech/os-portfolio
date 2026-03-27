import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Terminal as TermIcon, Edit3, Search, Activity, Zap } from 'lucide-react';
import useOSStore from '../store/osStore';

const Achievements = () => {
  const { achievements } = useOSStore();

  const allAchievements = [
    { id: 'first_login', title: 'Hello World', desc: 'Successfully logged into Lumina OS.', icon: <Star className="w-5 h-5" />, color: 'from-blue-400 to-blue-600' },
    { id: 'search_pro', title: 'Spotlight Master', desc: 'Used the global search for the first time.', icon: <Search className="w-5 h-5" />, color: 'from-purple-400 to-purple-600' },
    { id: 'terminal_wiz', title: 'Command Line Guru', desc: 'Executed 5 terminal commands.', icon: <TermIcon className="w-5 h-5" />, color: 'from-green-400 to-green-600' },
    { id: 'hacker', title: 'Mainframe Access', desc: 'Tried to SSH into a remote host.', icon: <Zap className="w-5 h-5" />, color: 'from-red-400 to-neon-red' },
    { id: 'writer', title: 'Poet in Exile', desc: 'Saved your first note in Notepad.', icon: <Edit3 className="w-5 h-5" />, color: 'from-cyan-400 to-cyan-600' },
    { id: 'monitor', title: 'System Admin', desc: 'Opened the Task Manager to monitor resources.', icon: <Activity className="w-5 h-5" />, color: 'from-os-primary to-blue-500' },
    { id: 'easter_egg', title: 'Rabbit Hole', desc: 'Found the secret matrix mode.', icon: <Trophy className="w-5 h-5" />, color: 'from-yellow-400 to-orange-500' },
  ];

  return (
    <div className="h-full w-full bg-[#0c0c0c]/40 backdrop-blur-xl p-6 overflow-y-auto scrollbar-hide">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-xl bg-os-primary/20 text-os-primary border border-os-primary/30">
          <Trophy className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Achievements</h2>
          <p className="text-white/50 text-sm">You have unlocked {achievements.length} of {allAchievements.length} honors.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {allAchievements.map((ach) => {
          const isUnlocked = achievements.includes(ach.id);
          return (
            <motion.div
              key={ach.id}
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.05)' }}
              className={`p-4 rounded-2xl border transition-all duration-300 flex items-center gap-4 ${
                isUnlocked ? 'border-white/10 bg-white/5 opacity-100' : 'border-white/5 bg-white/[0.02] opacity-40 grayscale'
              }`}
            >
              <div className={`p-3 rounded-lg bg-gradient-to-br ${ach.color} shadow-lg shadow-black/20`}>
                {ach.icon}
              </div>
              <div className="flex-grow">
                <h3 className={`font-bold ${isUnlocked ? 'text-white' : 'text-white/60'}`}>{ach.title}</h3>
                <p className="text-xs text-white/40 leading-relaxed mt-0.5">{ach.desc}</p>
              </div>
              {isUnlocked && (
                <div className="text-os-primary">
                  <Trophy className="w-4 h-4" />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Achievements;
