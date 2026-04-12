import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sun, Cloud, CloudRain, CloudLightning, Wind } from 'lucide-react';

const ClockWidget = () => {
  const [time, setTime] = useState(new Date());
  
  const weatherIcons = [Sun, Cloud, CloudRain, CloudLightning, Wind];
  const [weather] = useState({
    temp: 24,
    condition: 'Clear',
    icon: Sun
  });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-6 rounded-[2.5rem] bg-white/[0.03] backdrop-blur-3xl border border-white/10 flex flex-col gap-4 select-none group hover:bg-white/[0.05] transition-colors shadow-2xl"
    >
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h2 className="text-5xl font-black text-white tracking-tighter tabular-nums">
            {formatTime(time)}
          </h2>
          <p className="text-xs font-black text-os-primary uppercase tracking-[0.3em]">
            {formatDate(time)}
          </p>
        </div>
        <div className="p-3 bg-os-primary/10 rounded-2xl border border-os-primary/20">
           <weather.icon className="text-os-primary" size={24} />
        </div>
      </div>

      <div className="h-px bg-white/5 w-full my-2" />

      <div className="flex justify-between items-center px-1">
         <div className="flex flex-col">
            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Temperature</span>
            <span className="text-lg font-black text-white">{weather.temp}°C</span>
         </div>
         <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Condition</span>
            <span className="text-sm font-bold text-os-secondary uppercase tracking-wider">{weather.condition}</span>
         </div>
      </div>

      {/* Subtle activity graph at bottom */}
      <div className="flex gap-1 h-4 items-end mt-2 px-1">
         {Array.from({ length: 12 }).map((_, i) => (
           <div 
             key={i} 
             className="flex-1 bg-white/10 rounded-full" 
             style={{ height: `${Math.random() * 60 + 20}%` }} 
           />
         ))}
      </div>
    </motion.div>
  );
};

export default ClockWidget;
