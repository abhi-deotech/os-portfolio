import React, { useState, useEffect, useMemo } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, RotateCw, Download, Expand, ChevronLeft, Search, Image as ImageIcon, Heart, Share2, Info, Maximize2, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PHOTO_DATA, PHOTO_CATEGORIES } from '../data/photoData';
import useOSStore from '../store/osStore';

const PhotoViewer = ({ file: initialFile }) => {
  const [currentPhoto, setCurrentPhoto] = useState(initialFile || null);
  const [view, setView] = useState(initialFile ? 'viewer' : 'gallery');
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [category, setCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUI, setShowUI] = useState(true);

  const { activeAccent } = useOSStore();

  useEffect(() => {
    if (initialFile) {
      setCurrentPhoto(initialFile);
      setView('viewer');
    }
  }, [initialFile]);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
  const handleRotate = (dir) => setRotation(prev => prev + (dir * 90));

  const selectPhoto = (photo) => {
    setCurrentPhoto(photo);
    setView('viewer');
    setScale(1);
    setRotation(0);
  };

  const filteredPhotos = useMemo(() => {
    return PHOTO_DATA.filter(item => {
      const matchesCategory = category === 'all' || item.category === category;
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           item.artist.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [category, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white rounded-b-2xl overflow-hidden relative select-none">
      <AnimatePresence mode="wait">
        {view === 'gallery' ? (
          <motion.div 
            key="gallery"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col h-full"
          >
            {/* Gallery Header */}
            <div className="p-6 md:p-8 bg-gradient-to-b from-os-primary/10 to-transparent border-b border-white/5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                   <h2 className="text-3xl md:text-4xl font-black tracking-tighter flex items-center gap-3">
                      <ImageIcon className="text-os-primary" /> Lumina Photos
                   </h2>
                   <p className="text-os-onSurfaceVariant font-bold mt-1">Your visual collection across the Lumina universe</p>
                </div>
                <div className="relative">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                   <input 
                     type="text"
                     placeholder="Search photos..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-3 w-full md:w-64 focus:outline-none focus:border-os-primary/50 transition-all font-bold"
                   />
                </div>
              </div>

              <div className="flex gap-2 mt-8 overflow-x-auto pb-2 no-scrollbar">
                {PHOTO_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`px-6 py-2 rounded-xl whitespace-nowrap font-bold text-sm transition-all ${category === cat.id ? 'bg-os-primary text-black' : 'bg-white/5 hover:bg-white/10 text-os-onSurfaceVariant hover:text-white border border-white/5'}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Photo Grid */}
            <div className="flex-grow overflow-y-auto p-6 md:p-8 custom-scrollbar">
               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredPhotos.map(photo => (
                    <motion.div
                      key={photo.id}
                      whileHover={{ scale: 1.02, y: -5 }}
                      onClick={() => selectPhoto(photo)}
                      className="group relative aspect-square bg-white/5 rounded-2xl overflow-hidden cursor-pointer border border-white/5"
                    >
                       <img src={photo.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                          <p className="font-bold text-sm truncate">{photo.title}</p>
                          <p className="text-[10px] text-white/60 font-medium">{photo.artist}</p>
                       </div>
                    </motion.div>
                  ))}
               </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="viewer"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col h-full bg-black relative group/viewer"
          >
            {/* Viewer Top Bar */}
            <AnimatePresence>
              {showUI && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between z-30"
                >
                  <button 
                    onClick={() => setView('gallery')}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl border border-white/10 transition-all font-bold text-sm"
                  >
                    <ChevronLeft size={20} />
                    Gallery
                  </button>
                  <div className="flex items-center gap-4">
                    <button className="p-3 hover:bg-white/10 rounded-full transition-colors"><Heart size={20} /></button>
                    <button className="p-3 hover:bg-white/10 rounded-full transition-colors"><Share2 size={20} /></button>
                    <button className="p-3 hover:bg-white/10 rounded-full transition-colors"><Info size={20} /></button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Photo Canvas */}
            <div 
              className="flex-grow relative flex items-center justify-center overflow-hidden p-8"
              onClick={() => setShowUI(!showUI)}
            >
              <motion.div
                animate={{ scale, rotate: rotation }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative max-w-full max-h-full"
                style={{ cursor: scale > 1 ? 'grab' : 'default' }}
                drag={scale > 1}
                dragConstraints={{ left: -1000, right: 1000, top: -1000, bottom: 1000 }}
              >
                <img 
                  src={currentPhoto?.url} 
                  alt={currentPhoto?.title} 
                  className="max-w-full max-h-[80vh] object-contain shadow-2xl rounded-lg pointer-events-none select-none border border-white/5"
                />
              </motion.div>
            </div>

            {/* Viewer Bottom Controls */}
            <AnimatePresence>
              {showUI && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/90 to-transparent flex flex-col items-center gap-6 z-30"
                >
                  <div className="flex flex-col items-center">
                     <h3 className="text-xl font-black tracking-tight">{currentPhoto?.title || 'Untitled Image'}</h3>
                     <p className="text-os-onSurfaceVariant font-bold text-sm">{currentPhoto?.artist || 'Unknown Artist'}</p>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center bg-white/10 backdrop-blur-md rounded-2xl p-1 border border-white/10">
                      <button onClick={handleZoomOut} className="p-3 hover:bg-white/10 rounded-xl transition-colors"><ZoomOut size={20} /></button>
                      <div className="px-4 text-xs font-black min-w-[60px] text-center">{Math.round(scale * 100)}%</div>
                      <button onClick={handleZoomIn} className="p-3 hover:bg-white/10 rounded-xl transition-colors"><ZoomIn size={20} /></button>
                    </div>

                    <div className="flex items-center bg-white/10 backdrop-blur-md rounded-2xl p-1 border border-white/10">
                      <button onClick={() => handleRotate(-1)} className="p-3 hover:bg-white/10 rounded-xl transition-colors"><RotateCcw size={20} /></button>
                      <button onClick={() => handleRotate(1)} className="p-3 hover:bg-white/10 rounded-xl transition-colors"><RotateCw size={20} /></button>
                    </div>

                    <button className="p-4 bg-os-primary text-black rounded-2xl font-black hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                       <Download size={20} />
                       Save
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PhotoViewer;
