import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import SocialWidget from './SocialWidget';
import SystemMetricsWidget from './SystemMetricsWidget';
import ClockWidget from './ClockWidget';
import SystemDashboard from './SystemDashboard';
import { useIsMobile } from '../hooks/useMediaQuery';

const DraggableWidget = ({ children, initialPos, setPos, width, className = "" }) => (
  <motion.div 
    drag
    dragMomentum={false}
    dragElastic={0.05}
    initial={initialPos}
    animate={initialPos}
    onDragEnd={(e, info) => {
      setPos({
        x: initialPos.x + info.offset.x,
        y: initialPos.y + info.offset.y
      });
    }}
    className={`absolute ${className} pointer-events-auto cursor-grab active:cursor-grabbing z-[10]`}
    style={{ width }}
    whileDrag={{ scale: 1.02, zIndex: 50 }}
  >
    <div className="h-full">
      {children}
    </div>
  </motion.div>
);

const Widgets = () => {
  const isMobile = useIsMobile();
  
  // Initial positions based on device
  const getInitialPos = (type) => {
    if (isMobile) {
      return { x: 0, y: 0 };
    } else {
      switch (type) {
        case 'clock':     return { x: Math.floor(window.innerWidth / 2) - 170, y: 40 };
        case 'dashboard': return { x: window.innerWidth - 460, y: 40 };
        default:          return { x: 40, y: 40 };
      }
    }
  };

  const [clockPos, setClockPos] = useState(() => getInitialPos('clock'));
  const [dashPos, setDashPos] = useState(() => getInitialPos('dashboard'));

  // Reset positions on resize/mode change
  useEffect(() => {
    setClockPos(getInitialPos('clock'));
    setDashPos(getInitialPos('dashboard'));
  }, [isMobile]);

  if (isMobile) {
    return (
      <div className="flex flex-col gap-6 items-center w-full p-6">
        <div className="w-full max-w-[380px]">
          <ClockWidget />
        </div>
        <div className="w-full max-w-[420px]">
          <SystemDashboard />
        </div>
      </div>
    );
  }


  return (
    <div className="fixed inset-0 pointer-events-none z-[5] overflow-hidden">
      <div className="h-full w-full pointer-events-none relative">
        <DraggableWidget 
          initialPos={clockPos} 
          setPos={setClockPos} 
          width={340}
        >
          <ClockWidget />
        </DraggableWidget>

        <DraggableWidget 
          initialPos={dashPos} 
          setPos={setDashPos} 
          width={420}
        >
          <SystemDashboard />
        </DraggableWidget>
      </div>
    </div>
  );
};

export default Widgets;
