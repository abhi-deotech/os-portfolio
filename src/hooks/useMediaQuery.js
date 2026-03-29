import { useState, useEffect } from 'react';

/**
 * Custom hook for tracking media query matches.
 * Returns true if the media query matches, false otherwise.
 *
 * @param {string} query - CSS media query string (e.g., '(max-width: 768px)')
 * @returns {boolean} Whether the media query currently matches
 *
 * @example
 * const isMobile = useMediaQuery('(max-width: 768px)');
 * const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const media = window.matchMedia(query);
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}

/**
 * Mobile detection hook using useMediaQuery.
 * Returns true if viewport is 768px or narrower.
 *
 * @returns {boolean} Whether the device is mobile-sized
 *
 * @example
 * const isMobile = useIsMobile();
 * return (
 *   <div className={isMobile ? 'mobile-layout' : 'desktop-layout'}>
 *     {content}
 *   </div>
 * );
 */
export function useIsMobile() {
  return useMediaQuery('(max-width: 768px)');
}
