import { useState, useEffect } from 'react';

/**
 * Custom hook for monitoring network connection status and information.
 * Tracks online/offline state and connection quality metrics.
 *
 * Features:
 * - Online/offline detection
 * - Connection type (wifi, cellular, etc.)
 * - Effective connection type (4g, 3g, etc.)
 * - Downlink speed estimation
 * - Round-trip time (RTT)
 * - Data saver mode detection
 *
 * @returns {Object} Network information object
 * @returns {boolean} returns.isOnline - Whether the browser is online
 * @returns {string} returns.connectionType - Network connection type
 * @returns {string} returns.effectiveType - Effective connection type (4g, 3g, etc.)
 * @returns {number} returns.downlink - Downlink speed in Mbps
 * @returns {number} returns.downlinkMax - Maximum downlink speed
 * @returns {number} returns.rtt - Round-trip time in milliseconds
 * @returns {boolean} returns.saveData - Whether data saver is enabled
 */
const useNetworkInfo = () => {
  const [networkInfo, setNetworkInfo] = useState({
    isOnline: navigator.onLine,
    connectionType: 'unknown',
    effectiveType: 'unknown',
    downlink: 0,
    downlinkMax: 0,
    rtt: 0,
    saveData: false,
  });

  useEffect(() => {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

    const updateNetworkInfo = () => {
      setNetworkInfo({
        isOnline: navigator.onLine,
        connectionType: connection?.type || 'unknown',
        effectiveType: connection?.effectiveType || 'unknown',
        downlink: connection?.downlink || 0,
        downlinkMax: connection?.downlinkMax || 0,
        rtt: connection?.rtt || 0,
        saveData: connection?.saveData || false,
      });
    };

    // Initial update
    updateNetworkInfo();

    // Listen for online/offline events
    window.addEventListener('online', updateNetworkInfo);
    window.addEventListener('offline', updateNetworkInfo);

    // Listen for connection changes
    if (connection) {
      connection.addEventListener('change', updateNetworkInfo);
    }

    return () => {
      window.removeEventListener('online', updateNetworkInfo);
      window.removeEventListener('offline', updateNetworkInfo);
      if (connection) {
        connection.removeEventListener('change', updateNetworkInfo);
      }
    };
  }, []);

  return networkInfo;
};

export default useNetworkInfo;
