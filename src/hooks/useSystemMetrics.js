import { useState, useEffect, useMemo } from 'react';

const useSystemMetrics = () => {
  const [metrics, setMetrics] = useState({ 
    cpu: 0, 
    ram: 0, 
    ramUsedMb: 0, 
    ramLimitMb: 4096 
  });

  // Static hardware info that doesn't change
  const hardwareInfo = useMemo(() => ({
    // navigator.hardwareConcurrency gives logical cores
    cores: navigator.hardwareConcurrency || 'Multiple',
    // navigator.deviceMemory gives RAM in GB (clamped to 8 for privacy)
    ramGb: navigator.deviceMemory || 8,
    // Platform info
    platform: navigator.platform || 'Unknown',
    agent: navigator.userAgent.split(') ')[0].split(' (')[1] || 'Web-Native'
  }), []);

  useEffect(() => {
    let lastTime = performance.now();
    let frames = 0;
    
    const updateMetrics = () => {
      const now = performance.now();
      const delta = now - lastTime;
      frames++;

      if (delta >= 2000) { // Update every 2 seconds
        // CPU estimation based on frame budget lag
        const avgFrameTime = delta / frames;
        const lag = Math.max(0, avgFrameTime - 16.7);
        // Map 0-16.7ms lag to 0-100% CPU load
        const estimatedCpu = Math.min(100, Math.round((lag / 16.7) * 100) + Math.floor(Math.random() * 5));

        // RAM usage calculation (if available)
        let estimatedPercent = Math.floor(Math.random() * 5) + 40; 
        let usedMb = 0;
        let limitMb = 4096;

        if (window.performance && window.performance.memory) {
          const memory = window.performance.memory;
          estimatedPercent = Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100);
          usedMb = Math.round(memory.usedJSHeapSize / (1024 * 1024));
          limitMb = Math.round(memory.jsHeapSizeLimit / (1024 * 1024));
        } else {
            // Fallback for non-Chrome browsers
            usedMb = Math.round((estimatedPercent / 100) * 4096);
        }

        setMetrics({ 
            cpu: estimatedCpu, 
            ram: estimatedPercent,
            ramUsedMb: usedMb,
            ramLimitMb: limitMb
        });
        lastTime = now;
        frames = 0;
      }
      requestAnimationFrame(updateMetrics);
    };

    const requestId = requestAnimationFrame(updateMetrics);
    return () => cancelAnimationFrame(requestId);
  }, []);

  return { ...metrics, ...hardwareInfo };
};

export default useSystemMetrics;
