import { useState, useEffect } from 'react';
import { readNetwork } from '../system/facts.js';

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
  // One network reader for the whole shell: facts.readNetwork (the terminal calls it directly).
  const [networkInfo, setNetworkInfo] = useState(() => readNetwork(navigator));

  useEffect(() => {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

    const updateNetworkInfo = () => {
      setNetworkInfo(readNetwork(navigator));
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
