import React from 'react';
import { motion } from 'framer-motion';
import useOSStore from '../store/osStore';
import { useIsMobile } from '../hooks/useMediaQuery';
import useSoundEffects from '../hooks/useSoundEffects';
import { APPS } from '../config/apps';
import AppIcon from './common/AppIcon';

/**
 * Desktop labels sit on the user's wallpaper, so they need a halo to stay legible over an arbitrary
 * photo. The halo was a hardcoded `rgba(0,0,0,0.8)`, which is a dark-mode assumption: under a light
 * colorway the ink is already dark and a black halo just smudged it. `plane` is the inverse of `ink`
 * in both modes by construction, so keying the halo to `plane` is correct in either.
 *
 * Three stacked layers rather than one soft 8px blur, though. A single diffuse halo is enough when
 * the plane shows through, and nowhere near enough over a busy mid-tone photograph — a light
 * colorway puts dark ink behind a pale wash that a photo simply swallows. Stacking a tight opaque
 * layer under two wider ones builds an outline that survives arbitrary imagery without drawing a
 * visible box behind every label. This is the same "the USER owns the plane" gap recorded in
 * sdl-notes.md: SDL's atmosphere grammar assumes the designer controls the background.
 */
const LABEL_SHADOW = [
  '0 0 3px rgb(var(--sdl-plane-rgb) / 0.95)',
  '0 1px 6px rgb(var(--sdl-plane-rgb) / 0.9)',
  '0 0 14px rgb(var(--sdl-plane-rgb) / 0.75)',
].join(', ');

const Desktop = ({ onIconContextMenu }) => {
  const isMobile = useIsMobile();
  const { playSound } = useSoundEffects();
  const openWindow = useOSStore(state => state.openWindow);
  const iconPositions = useOSStore(state => state.iconPositions);
  const setIconPosition = useOSStore(state => state.setIconPosition);
  const setIsDragging = useOSStore(state => state.setIsDragging);

  return (
    <div className={`flex-grow relative z-0 ${isMobile ? 'overflow-y-auto pt-8 pb-32 px-4' : 'overflow-hidden'}`}>
      <div className={isMobile ? "grid grid-cols-3 gap-y-8 gap-x-4" : "relative h-full w-full"}>
        {APPS.map((icon, index) => {
          if (isMobile) {
            return (
              <motion.button
                key={icon.id}
                type="button"
                aria-label={icon.title}
                title={icon.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => { openWindow(icon.id); playSound('click'); }}
                className="flex flex-col items-center justify-start p-2 rounded-2xl active:bg-veil/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50 cursor-pointer transition-colors group"
              >
                <AppIcon app={icon} size={32} tile className="mb-2 shadow-lg" />
                <span
                  className="text-[10px] text-sdl-ink font-bold text-center leading-tight px-2 transition-all"
                  style={{ textShadow: LABEL_SHADOW }}
                >
                  {icon.title}
                </span>
              </motion.button>
            );
          }

          // Desktop draggable logic
          const col = Math.floor(index / 5);
          const row = index % 5;
          const defaultX = 40 + col * 120;
          const defaultY = 40 + row * 128;

          const savedPos = iconPositions[icon.id];
          const startX = savedPos ? savedPos.x : defaultX;
          const startY = savedPos ? savedPos.y : defaultY;

          return (
            <motion.div
              key={icon.id}
              role="button"
              tabIndex={0}
              aria-label={icon.title}
              title={icon.title}
              drag
              dragMomentum={false}
              dragElastic={0}
              style={{ x: startX, y: startY, position: 'absolute', left: 0, top: 0 }}
              animate={{ x: startX, y: startY }}
              transition={{ 
                type: 'spring', stiffness: 300, damping: 30,
              }}
              onDragStart={() => setIsDragging(true)}
              onDragEnd={(e, info) => {
                setIsDragging(false);
                const newX = startX + info.offset.x;
                const newY = startY + info.offset.y;
                setIconPosition(icon.id, { x: newX, y: newY });
              }}
              whileDrag={{ scale: 1.05, zIndex: 100, cursor: 'grabbing' }}
              onDoubleClick={() => { openWindow(icon.id); playSound('click'); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openWindow(icon.id);
                  playSound('click');
                }
              }}
              onContextMenu={(e) => onIconContextMenu(e, icon.id)}
              className="absolute flex flex-col items-center justify-start p-2 rounded-2xl hover:bg-veil/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50 cursor-grab transition-all w-28 text-center group"
            >
              <AppIcon
                app={icon}
                size={28}
                tile
                radius="var(--sdl-radius-panel)"
                className="mb-2 shadow-xl transition-transform group-hover:scale-105 group-active:scale-95"
              />
              <span
                className="text-[11px] md:text-[13px] text-sdl-ink font-semibold tracking-wide leading-tight px-3 py-1 transition-all group-hover:scale-105"
                style={{ textShadow: LABEL_SHADOW }}
              >
                {icon.title}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Desktop;
