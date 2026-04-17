import React, { useState, useEffect } from 'react';
import { motion, useDragControls, AnimatePresence } from 'framer-motion';
import { X, Minus, Maximize2, Minimize2 } from 'lucide-react';
import CustomIcon from './common/CustomIcon';
import useOSStore from '../store/osStore';
import { useIsMobile } from '../hooks/useMediaQuery';

/**
 * Window container component for Lumina OS applications.
 * Provides a draggable, resizable window frame with title bar and traffic light controls.
 *
 * Features:
 * - Drag functionality with snap-to-maximize (drag to top edge)
 * - Traffic light buttons (close, minimize, maximize)
 * - Active/inactive visual states
 * - Mobile-responsive (always maximized on mobile)
 * - Spring animations via Framer Motion
 *
 * @component
 * @param {Object} props - Component properties
 * @param {string} props.id - Unique window identifier
 * @param {string} props.title - Window title displayed in title bar
 * @param {React.ReactNode} props.children - Window content
 * @param {number} [props.width=900] - Default window width
 * @param {number} [props.height=650] - Default window height
 * @param {number} [props.minWidth=400] - Minimum resize width
 * @param {number} [props.minHeight=300] - Minimum resize height
 */
const Window = ({ id, title, children, width = 900, height = 650, minWidth = 400, minHeight = 300 }) => {
  const { closeWindow, toggleMinimizeWindow, toggleMaximizeWindow, focusWindow, activeWindow, maximizedWindows, activeAccent, setIsDragging, isDragging, transparencyEffects } = useOSStore();
  const isMobile = useIsMobile();
  const isActive = activeWindow === id;
  const isMaximized = maximizedWindows?.includes(id) || isMobile;
  const dragControls = useDragControls();

  useEffect(() => {
    if (isMobile && !maximizedWindows?.includes(id)) {
      toggleMaximizeWindow(id);
    }
  }, [isMobile, id, maximizedWindows, toggleMaximizeWindow]);

  const accentHexMap = {
    purple: '#cc97ff',
    cyan: '#00d2fd',
    magenta: '#ff68f0',
    green: '#00f5a0'
  };
  const accentHex = accentHexMap[activeAccent] || '#cc97ff';

  const windowMotionProps = isMobile ? {
    initial: { y: '100%' },
    animate: { y: 0 },
    exit: { y: '100%' },
    transition: { type: "spring", stiffness: 300, damping: 30 }
  } : {
    initial: { scale: 0.95, opacity: 0, x: -width/2, y: -height/2 },
    animate: { 
      scale: 1, 
      opacity: 1, 
      ...(isMaximized ? { top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', borderRadius: 0, x: 0, y: 0 } : {})
    },
    transition: { type: "spring", stiffness: 300, damping: 30 }
  };

  const [snapTarget, setSnapTarget] = useState(null);

  const handleDrag = (e, info) => {
    const { x, y } = info.point;
    const threshold = 50;
    if (y < threshold) setSnapTarget('top');
    else if (x < threshold) setSnapTarget('left');
    else if (window.innerWidth - x < threshold) setSnapTarget('right');
    else setSnapTarget(null);
  };

  const handleDragEnd = (e, info) => {
    setIsDragging(false);
    if (snapTarget === 'top') toggleMaximizeWindow(id);
    // Add logic for left/right split if desired, but for now just top = maximize
    setSnapTarget(null);
  };

  return (
    <>
      <AnimatePresence>
        {snapTarget && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed z-[40] bg-os-primary/10 border-2 border-os-primary/30 backdrop-blur-sm transition-all duration-300 pointer-events-none ${
              snapTarget === 'top' ? 'inset-4 rounded-3xl' : 
              snapTarget === 'left' ? 'inset-y-4 left-4 w-[48%] rounded-3xl' :
              'inset-y-4 right-4 w-[48%] rounded-3xl'
            }`}
          />
        )}
      </AnimatePresence>

      <motion.div
        drag={!isMaximized && !isMobile}
        dragListener={false}
        dragControls={dragControls}
        dragMomentum={false}
        onDragStart={() => setIsDragging(true)}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        {...windowMotionProps}
      onMouseDown={() => focusWindow(id)}
      style={{
        ...(!isMaximized ? { width, height, minWidth, minHeight, top: '50%', left: '50%' } : { 
          zIndex: isActive ? 60 : 10,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: isMobile ? '80px' : 0, // Space for taskbar on mobile
          width: '100vw',
          height: isMobile ? 'calc(100vh - 80px)' : '100vh',
          x: 0,
          y: 0
        }),
        borderColor: isActive && !isMaximized ? accentHex : undefined,
        boxShadow: isActive && !isMaximized ? `0 32px 64px rgba(0,0,0,0.5), 0 0 20px ${accentHex}33` : undefined,
        resize: (isMaximized || isMobile) ? 'none' : 'both',
        overflow: 'hidden'
      }}
      className={`absolute flex flex-col transition-shadow duration-300 pointer-events-auto group/window ${
        isActive 
          ? 'z-50 border' 
          : 'grayscale-[0.1] border border-os-outline/10 shadow-[0_16px_32px_rgba(0,0,0,0.3)] z-10'
      } ${!isMaximized ? `bg-os-surfaceContainerHighest/50 ${transparencyEffects ? 'backdrop-blur-2xl' : ''} rounded-3xl` : `bg-os-surface/95 ${transparencyEffects ? 'backdrop-blur-3xl' : ''}`}`}
    >
      {/* Title Bar - Glassmorphic Strip */}
      <div 
        className={`${isMobile ? 'h-16' : 'h-14'} flex items-center px-6 border-b border-os-outline/5 relative shrink-0 transition-all duration-300`}
        onPointerDown={(e) => {
          if (!isMaximized && !isMobile) dragControls.start(e);
        }}
        onDoubleClick={() => !isMobile && toggleMaximizeWindow(id)}
        style={{ 
          touchAction: "none", 
          cursor: (isMaximized || isMobile) ? 'default' : 'grab',
          backgroundColor: isActive ? `${accentHex}15` : 'rgba(25, 37, 64, 0.4)'
        }}
      >
        <div className="flex space-x-2.5 z-50 w-24 group/controls" onPointerDown={(e) => e.stopPropagation()}>
          <button 
            onClick={() => closeWindow(id)} 
            className={`${isMobile ? 'w-5 h-5' : 'w-3.5 h-3.5'} rounded-full bg-[#ff5f56] hover:brightness-110 flex items-center justify-center relative z-50 cursor-pointer border border-[#e0443e]`}
          >
            <CustomIcon icon={X} size={isMobile ? 12 : 10} strokeWidth={4} color="text-[#4c0000]" className={`${isMobile ? 'opacity-100' : 'opacity-0'} group-hover/controls:opacity-100 transition-opacity`} animate={false} />
          </button>
          {!isMobile && (
            <>
              <button
               onClick={() => toggleMinimizeWindow(id)}
               className="w-3.5 h-3.5 rounded-full bg-[#ffbd2e] hover:brightness-110 flex items-center justify-center relative z-50 cursor-pointer border border-[#dea123]"
              >                <CustomIcon icon={Minus} size={10} strokeWidth={4} color="text-[#5c3e00]" className="opacity-0 group-hover/controls:opacity-100 transition-opacity" animate={false} />
              </button>
              <button
                onClick={() => toggleMaximizeWindow(id)}
                className="w-3.5 h-3.5 rounded-full bg-[#27c93f] hover:brightness-110 flex items-center justify-center relative z-50 cursor-pointer border border-[#1aab29]"
              >
                {isMaximized ? (
                  <CustomIcon icon={Minimize2} size={9} strokeWidth={4} color="text-[#004d09]" className="opacity-0 group-hover/controls:opacity-100 transition-opacity" animate={false} />
                ) : (
                  <CustomIcon icon={Maximize2} size={9} strokeWidth={4} color="text-[#004d09]" className="opacity-0 group-hover/controls:opacity-100 transition-opacity" animate={false} />
                )}
              </button>
            </>
          )}
        </div>
        
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-os-onSurfaceVariant text-sm font-semibold tracking-wide font-sans">{title}</span>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-grow overflow-auto text-os-onSurface relative scrollbar-os pb-10">
        {/* Subtle Ambient Glow behind content */}
        <div className="absolute top-[-50%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-os-primaryDim/5 to-transparent pointer-events-none -z-10 rounded-full blur-3xl opacity-50" />
        
        {/* Drag Overlay to prevent iframe event swallowing */}
        {isDragging && (
          <div className="absolute inset-0 z-[9999] cursor-grabbing pointer-events-auto" />
        )}
        
        {children}
      </div>

      {/* Resize Handle (Visual Only for now as native resize is enabled) */}
      {!isMaximized && !isMobile && (
        <div className="absolute bottom-1 right-1 w-4 h-4 cursor-nwse-resize opacity-0 group-hover/window:opacity-100 transition-opacity z-50 pointer-events-none">
           <div className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-os-outline/30 blur-[1px]" />
        </div>
      )}
    </motion.div>
    </>
  );
};

export default Window;
