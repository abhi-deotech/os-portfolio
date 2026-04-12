import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

const BSOD = () => {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.reload();
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[10000] bg-[#0078d7] text-white font-sans p-10 md:p-20 flex flex-col justify-center items-start select-none"
    >
      <div className="text-[100px] md:text-[150px] mb-8 leading-none">:(</div>
      <h1 className="text-xl md:text-3xl mb-8 max-w-2xl leading-relaxed">
        Your PC ran into a problem and needs to restart. We're just collecting some error info, and then we'll restart for you.
      </h1>
      <div className="flex flex-col md:flex-row items-start md:items-center gap-8 mb-12">
        <div className="w-32 h-32 bg-white p-2">
          {/* Simulated QR Code */}
          <div className="w-full h-full bg-black flex items-center justify-center text-white text-[8px] text-center font-mono">
            QR CODE:<br/>LUMINA_OS<br/>FATAL_ERROR
          </div>
        </div>
        <div>
          <p className="text-lg md:text-xl opacity-80 mb-2">0% complete</p>
          <p className="text-sm opacity-60">
            For more information about this issue and possible fixes, visit https://www.lumina-os.org/stopcode
          </p>
        </div>
      </div>
      <div className="space-y-1 font-mono text-xs md:text-sm opacity-60">
        <p>If you call a support person, give them this info:</p>
        <p>Stop code: CRITICAL_PROCESS_DIED</p>
        <p>What failed: lumina_kernel.sys</p>
      </div>
    </motion.div>
  );
};

export default BSOD;
