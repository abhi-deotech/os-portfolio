import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BOOT_LOGS = [
  "[    0.000000] Linux version 6.8.0-lumina (gcc version 12.3.0)",
  "[    0.000000] Command line: BOOT_IMAGE=/boot/vmlinuz-6.8.0-lumina root=UUID=os-root-123 ro quiet splash",
  "[    0.000000] x86/fpu: Supporting XSAVE feature 0x001: 'x87 floating point registers'",
  "[    0.000000] BIOS-e820: [mem 0x0000000000000000-0x000000000009fbff] usable",
  "[    0.000000] NX (Execute Disable) protection: active",
  "[    0.124512] smpboot: CPU0: Intel(R) Core(TM) i9-14900K (family: 0x6, model: 0xb7, stepping: 0x1)",
  "[    0.542100] usbcore: registered new interface driver usbfs",
  "[    0.891200] ACPI: bus type pci registered",
  "[    1.210041] pci 0000:00:00.0: [8086:9b43] rev 0c",
  "[    1.542100] scsi host0: Virtio SCSI rev 1.2",
  "[    1.891200] EXT4-fs (vda2): mounted filesystem with ordered data mode",
  "[    2.100451] systemd[1]: Inserted module 'autofs4'",
  "[    2.341200] systemd[1]: Started Dispatch Password Requests to Console Directory Watch.",
  "[    2.567100] systemd[1]: Reached target Local File Systems (Pre).",
  "[    2.891200] systemd[1]: Reached target Local File Systems.",
  "[    3.124500] systemd[1]: Started LVM2 metadata daemon.",
  "[    3.456100] systemd[1]: Started Network Time Synchronization.",
  "[    3.789200] systemd[1]: Reached target System Initialization.",
  "[    4.123100] systemd[1]: Started Lumina Kernel Neural Bridge.",
  "[    4.456200] systemd[1]: Started Desktop Window Manager Server.",
  "[    4.789100] systemd[1]: Reached target Graphical Interface.",
  "[    OK    ] Neural Link established.",
  "[    OK    ] Quantum Particles initialized.",
  "[    OK    ] Desktop Environment loaded.",
  "Starting Lumina OS v1.0.0..."
];

const BootSequence = ({ onComplete }) => {
  const [logs, setLogs] = useState([]);
  const [currentIndex, setCurrentPathIndex] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    if (currentIndex < BOOT_LOGS.length) {
      const timer = setTimeout(() => {
        setLogs((prev) => [...prev, BOOT_LOGS[currentIndex]]);
        setCurrentPathIndex((prev) => prev + 1);
      }, Math.random() * 150 + 50);
      return () => clearTimeout(timer);
    } else {
      const finishTimer = setTimeout(() => {
        onComplete();
      }, 1000);
      return () => clearTimeout(finishTimer);
    }
  }, [currentIndex, onComplete]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-black text-green-500 font-mono text-xs md:text-sm p-4 md:p-10 overflow-hidden flex flex-col"
    >
      <div 
        ref={containerRef}
        className="flex-grow overflow-y-auto scrollbar-hide space-y-1"
      >
        <AnimatePresence>
          {logs.map((log, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.1 }}
            >
              {log}
            </motion.div>
          ))}
        </AnimatePresence>
        {currentIndex < BOOT_LOGS.length && (
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ repeat: Infinity, duration: 0.8 }}
            className="inline-block w-2 h-4 bg-green-500 ml-1 translate-y-1"
          />
        )}
      </div>
    </motion.div>
  );
};

export default BootSequence;
