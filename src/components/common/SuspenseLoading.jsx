import React from 'react';
import { motion } from 'framer-motion';

const SuspenseLoading = ({ title = "Loading Application..." }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-os-surface/50 backdrop-blur-md rounded-2xl border border-os-outline/10 p-12 text-center space-y-6">
      <div className="relative w-20 h-20">
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-os-primary/20"
        />
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-t-os-primary border-r-transparent border-b-transparent border-l-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-4 rounded-full border-2 border-os-secondary/20"
        />
        <motion.div
          className="absolute inset-4 rounded-full border-2 border-b-os-secondary border-t-transparent border-r-transparent border-l-transparent"
          animate={{ rotate: -360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
      </div>
      <div>
        <h3 className="font-display font-black text-os-onSurface text-lg uppercase tracking-widest animate-pulse">
          {title}
        </h3>
        <p className="text-[10px] font-bold text-os-onSurfaceVariant uppercase tracking-[0.3em] mt-2 opacity-50">
          Neural Link Establishing...
        </p>
      </div>
    </div>
  );
};

export default SuspenseLoading;
