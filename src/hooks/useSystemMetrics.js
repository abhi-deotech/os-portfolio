import { useState, useEffect, useMemo } from 'react';

/**
 * Custom hook for monitoring simulated system metrics (CPU and RAM usage).
 * Uses performance APIs to estimate system load with synthetic data fallback.
 *
 * Features:
 * - CPU estimation based on frame timing variance
 * - RAM usage from Chrome's performance.memory API (with fallback)
 * - Hardware info detection (cores, device memory, platform)
 * - Real-time updates via requestAnimationFrame
 *
 * @returns {Object} System metrics object
 * @returns {number} returns.cpu - Estimated CPU usage percentage (0-100)
 * @returns {number} returns.ram - Estimated RAM usage percentage (0-100)
 * @returns {number} returns.ramUsedMb - Used RAM in megabytes
 * @returns {number} returns.ramLimitMb - Total available RAM in megabytes
 * @returns {number|string} returns.cores - Number of logical CPU cores
 * @returns {number} returns.ramGb - Total device memory in GB
 * @returns {string} returns.platform - Navigator platform string
 * @returns {string} returns.agent - Simplified user agent string
 */
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
        // CPU estimation - use more realistic synthetic data based on frame timing variance
        const avgFrameTime = delta / frames;
        const frameVariance = Math.abs(avgFrameTime - 16.67);
        // Base CPU on frame variance + random load fluctuation for realism
        let estimatedCpu = Math.min(100, Math.round((frameVariance / 16.67) * 30) + Math.floor(Math.random() * 15) + 5);
        // Ensure minimum CPU of 2-8% (idle baseline)
        estimatedCpu = Math.max(estimatedCpu, Math.floor(Math.random() * 6) + 2);

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
