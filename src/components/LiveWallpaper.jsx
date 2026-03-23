import React from 'react';
import { motion } from 'framer-motion';
import useOSStore from '../store/osStore';

const wallpaperConfigs = {
  'neon-nebula': {
    background: '#060e20',
    elements: [
      { color: 'bg-gradient-to-tr from-[#cc97ff]/40 to-[#cc97ff]/10', size: 'w-[50vw] h-[50vw]', initial: { x: '-20%', y: '-20%' }, animate: { x: ['-20%', '10%', '-20%'], y: ['-20%', '20%', '-20%'] } },
      { color: 'bg-gradient-to-tr from-[#00d2fd]/30 to-[#00d2fd]/5', size: 'w-[45vw] h-[45vw]', initial: { x: '50%', y: '40%' }, animate: { x: ['50%', '30%', '50%'], y: ['40%', '60%', '40%'] } },
      { color: 'bg-gradient-to-tr from-[#ff86c3]/20 to-[#ff86c3]/5', size: 'w-[30vw] h-[30vw]', initial: { x: '30%', y: '-10%' }, animate: { x: ['30%', '60%', '30%'], y: ['-10%', '10%', '-10%'] } }
    ]
  },
  'cyber-grid': {
    background: '#051210',
    elements: [
      { color: 'bg-gradient-to-bl from-[#00f5a0]/30 to-transparent', size: 'w-[60vw] h-[60vw]', initial: { x: '10%', y: '-30%' }, animate: { x: ['10%', '-10%', '10%'], y: ['-30%', '-10%', '-30%'] } },
      { color: 'bg-gradient-to-t from-[#00d2fd]/20 to-transparent', size: 'w-[70vw] h-[40vw]', initial: { x: '-10%', y: '60%' }, animate: { x: ['-10%', '20%', '-10%'], y: ['60%', '50%', '60%'] } }
    ],
    overlay: 'bg-[url("https://www.transparenttextures.com/patterns/cubes.png")] opacity-10 mix-blend-overlay'
  },
  'sunset-vibes': {
    background: '#1a0b1c',
    elements: [
      { color: 'bg-gradient-to-r from-[#ff4d4d]/40 to-[#ff4d4d]/10', size: 'w-[50vw] h-[50vw]', initial: { x: '-30%', y: '10%' }, animate: { x: ['-30%', '-10%', '-30%'], y: ['10%', '30%', '10%'] } },
      { color: 'bg-gradient-to-br from-[#ffaf40]/40 to-[#ffaf40]/10', size: 'w-[55vw] h-[55vw]', initial: { x: '40%', y: '-20%' }, animate: { x: ['40%', '20%', '40%'], y: ['-20%', '-40%', '-20%'] } },
      { color: 'bg-gradient-to-tr from-[#c56cf0]/30 to-[#c56cf0]/5', size: 'w-[40vw] h-[40vw]', initial: { x: '30%', y: '50%' }, animate: { x: ['30%', '50%', '30%'], y: ['50%', '30%', '50%'] } }
    ]
  }
};

const LiveWallpaper = () => {
  const { wallpaper } = useOSStore();
  const activeConfig = wallpaperConfigs[wallpaper] || wallpaperConfigs['neon-nebula'];

  return (
    <div 
      className="absolute inset-0 overflow-hidden -z-20 transition-colors duration-1000"
      style={{ backgroundColor: activeConfig.background }}
    >
      {activeConfig.elements.map((el, index) => (
        <motion.div
          key={`${wallpaper}-${index}`}
          className={`absolute rounded-full blur-[100px] ${el.color} ${el.size}`}
          initial={el.initial}
          animate={el.animate}
          transition={{
            duration: 25 + index * 5,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut"
          }}
        />
      ))}
      
      {activeConfig.overlay && (
        <div className={`absolute inset-0 pointer-events-none ${activeConfig.overlay}`} />
      )}
      
      {/* Universal vignette for desktop depth */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none mix-blend-multiply" />
    </div>
  );
};

export default LiveWallpaper;
