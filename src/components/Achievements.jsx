import React from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import useOSStore from '../store/osStore';
import { ACHIEVEMENTS } from '../config/achievements';
import { useColorway } from '../theme/useColorway';
import { iconStyle } from '../theme/icons';

const Achievements = () => {
  const { achievements } = useOSStore();
  // Each badge used to carry a private `from-blue-400 to-blue-600` gradient — a second palette
  // that ignored the colorway. Identity is the hue; the colorway sets chroma and lightness.
  const cw = useColorway();
  const faceOf = (hue) => iconStyle('harmonized', cw, { hue });

  // Was a private 16-entry array that disagreed with AchievementToast's private 13-entry one,
  // and omitted all five ids the games actually fire. See src/config/achievements.js.
  const allAchievements = ACHIEVEMENTS;

  return (
    <div className="h-full w-full bg-sdl-plane/40 backdrop-blur-xl p-6 overflow-y-auto scrollbar-hide">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-xl bg-os-primary/20 text-os-primary border border-os-primary/30">
          <Trophy className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-sdl-ink tracking-tight">Achievements</h2>
          <p className="text-sdl-sec text-sm">You have unlocked {achievements.length} of {allAchievements.length} honors.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {allAchievements.map((ach) => {
          const isUnlocked = achievements.includes(ach.id);
          const face = faceOf(ach.hue);
          const Glyph = ach.icon;
          return (
            /* The hover wash moved from a `whileHover` backgroundColor to a CSS variant, same 5% it
               always was. Motion only substitutes a CSS variable when it is the WHOLE value, so a
               veil-based `rgb(var(--sdl-veil-rgb) / .05)` would reach its colour parser unresolved. */
            <motion.div
              key={ach.id}
              whileHover={{ scale: 1.02 }}
              className={`p-4 rounded-2xl border transition-all duration-300 flex items-center gap-4 hover:bg-veil/[0.05] ${
                isUnlocked ? 'border-hairline/10 bg-veil/5 opacity-100' : 'border-hairline/5 bg-veil/[0.02] opacity-40 grayscale'
              }`}
            >
              <div
                className="p-3 rounded-lg border shadow-[var(--sdl-lift)]"
                style={{ backgroundColor: face.tile, borderColor: face.tileBorder }}
              >
                <Glyph className="w-5 h-5" style={{ color: face.glyph }} />
              </div>
              <div className="flex-grow">
                <h3 className={`font-bold ${isUnlocked ? 'text-sdl-ink' : 'text-sdl-sec'}`}>{ach.title}</h3>
                <p className="text-xs text-sdl-sec/70 leading-relaxed mt-0.5">{ach.desc}</p>
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
