import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import SocialWidget from './SocialWidget';
import SystemMetricsWidget from './SystemMetricsWidget';
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
      return { x: 0, y: 0 }; // Positions don't matter as much in flex/grid
    } else {
      switch (type) {
        case 'social':   return { x: window.innerWidth - 480, y: 40 };
        case 'metrics':  return { x: Math.floor((window.innerWidth - 300) / 2), y: Math.floor((window.innerHeight - 450) / 2) };
        default:         return { x: 40, y: 40 };
      }
    }
  };

  const [socialPos, setSocialPos] = useState(() => getInitialPos('social'));
  const [metricsPos, setMetricsPos] = useState(() => getInitialPos('metrics'));

  // Reset positions on resize/mode change
  useEffect(() => {
    setSocialPos(getInitialPos('social'));
    setMetricsPos(getInitialPos('metrics'));
  }, [isMobile]);

  if (isMobile) {
    return (
      <div className="flex flex-col gap-6 items-center w-full">
        <div className="w-full max-w-[380px]">
          <SocialWidget />
        </div>
        {/* <div className="w-full max-w-[340px]">
          <SystemMetricsWidget />
        </div> */}
      </div>
    );
  }


  return (
    <div className="fixed inset-0 pointer-events-none z-[5] overflow-hidden">
      <div className="h-full w-full pointer-events-none relative">
        <DraggableWidget 
          initialPos={socialPos} 
          setPos={setSocialPos} 
          width={440}
        >
          <SocialWidget />
        </DraggableWidget>

        {/* <DraggableWidget 
          initialPos={metricsPos} 
          setPos={setMetricsPos} 
          width={300}
        >
          <SystemMetricsWidget />
        </DraggableWidget> */}
      </div>
    </div>
  );
};

export default Widgets;
