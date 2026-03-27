import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, RotateCw, Download, Expand } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PhotoViewer = ({ file }) => {
  if (!file) return <div className="p-8 text-os-onSurfaceVariant">No image file found in system.</div>;

  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
  const handleRotate = (dir) => setRotation(prev => prev + (dir * 90));

  return (
    <div className="flex flex-col h-full bg-os-surfaceContainerLow/90 backdrop-blur-xl rounded-b-2xl overflow-hidden">
      {/* Photo Canvas */}
      <div className="flex-grow relative flex items-center justify-center overflow-hidden p-8">
        <motion.div
          animate={{ scale, rotate: rotation }}
          className="relative max-w-full max-h-full shadow-2xl rounded-lg overflow-hidden"
          style={{ cursor: scale > 1 ? 'grab' : 'default' }}
          drag={scale > 1}
          dragConstraints={{ left: -500, right: 500, top: -500, bottom: 500 }}
        >
          <img 
            src={file.url} 
            alt={file.name} 
            className="max-w-full max-h-[calc(100vh-300px)] object-contain pointer-events-none select-none"
            onDoubleClick={() => setScale(1)}
          />
        </motion.div>
      </div>

      {/* Toolbar */}
      <div className="h-16 bg-os-surfaceContainerHigh/50 border-t border-white/5 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
           <div className="flex items-center bg-black/20 rounded-xl p-1 border border-white/5">
              <button onClick={handleZoomOut} className="p-2 hover:bg-white/10 rounded-lg text-os-onSurfaceVariant transition-colors">
                <ZoomOut size={18} />
              </button>
              <div className="px-2 text-[10px] font-bold text-os-onSurfaceVariant min-w-[40px] text-center">
                {Math.round(scale * 100)}%
              </div>
              <button onClick={handleZoomIn} className="p-2 hover:bg-white/10 rounded-lg text-os-onSurfaceVariant transition-colors">
                <ZoomIn size={18} />
              </button>
           </div>

           <div className="flex items-center bg-black/20 rounded-xl p-1 border border-white/5">
              <button onClick={() => handleRotate(-1)} className="p-2 hover:bg-white/10 rounded-lg text-os-onSurfaceVariant transition-colors">
                <RotateCcw size={18} />
              </button>
              <button onClick={() => handleRotate(1)} className="p-2 hover:bg-white/10 rounded-lg text-os-onSurfaceVariant transition-colors">
                <RotateCw size={18} />
              </button>
           </div>
        </div>

        <div className="flex items-center gap-2">
           <span className="text-xs font-bold text-os-onSurfaceVariant mr-4">{file.name}</span>
           <button className="p-2.5 bg-os-primary/10 border border-os-primary/20 rounded-xl text-os-primary hover:bg-os-primary/20 transition-all">
              <Download size={18} />
           </button>
        </div>
      </div>
    </div>
  );
};

export default PhotoViewer;
