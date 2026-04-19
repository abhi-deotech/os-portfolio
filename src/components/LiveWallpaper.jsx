import React from 'react';
import useOSStore from '../store/osStore';

const Wallpaper = () => {
  const { wallpaper } = useOSStore();

  const getWallpaperStyles = () => {
    // Custom uploaded image
    if (wallpaper.startsWith('data:image')) {
      return { backgroundImage: `url(${wallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    }

    // Wallpaper Library
    const library = {
      'neon-nebula': 'bg-gradient-to-br from-[#cc97ff] to-[#00d2fd]',
      'cyber-grid': 'bg-gradient-to-br from-[#00f5a0] to-[#00d2fd]',
      'sunset-glow': 'bg-gradient-to-br from-[#ff4d4d] to-[#ffaf40]',
      'quantum-flow': 'bg-gradient-to-br from-[#cc97ff] to-[#60a5fa]',
      'abstract-blue': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=70&w=1200&auto=format&fit=crop',
      'dark-mountain': 'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?q=70&w=1200&auto=format&fit=crop',
      'cyber-vibes': 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=70&w=1200&auto=format&fit=crop',
      'tech-minimal': 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=70&w=1200&auto=format&fit=crop'
    };

    const value = library[wallpaper] || library['sunset-glow'];

    if (value.startsWith('http')) {
      return { backgroundImage: `url(${value})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    }

    // Default to gradient class handled via className
    return null;
  };

  const styles = getWallpaperStyles();
  const library = {
    'neon-nebula': 'bg-gradient-to-br from-[#cc97ff] to-[#00d2fd]',
    'cyber-grid': 'bg-gradient-to-br from-[#00f5a0] to-[#00d2fd]',
    'sunset-glow': 'bg-gradient-to-br from-[#ff4d4d] to-[#ffaf40]',
    'quantum-flow': 'bg-gradient-to-br from-[#cc97ff] to-[#60a5fa]'
  };

  return (
    <div className={`absolute inset-0 -z-20 transition-all duration-1000 ${!styles ? (library[wallpaper] || 'bg-[#060e20]') : ''}`} style={styles}>
      {/* Overlay to ensure readability */}
      <div className="absolute inset-0 bg-black/10 backdrop-brightness-[0.85]" />
    </div>
  );
};

export default Wallpaper;
