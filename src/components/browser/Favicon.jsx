import React, { useState } from 'react';
import { Globe } from 'lucide-react';
import { hostOf } from './browserCore';

/**
 * DuckDuckGo's icon service, following the external-image precedent already in the codebase
 * (images.weserv.nl proxies, YouTube thumbnails). Hosts whose icon 404s land in a module-level
 * set shared by every tab, bookmark tile and history row, so a dead host is fetched once per
 * session instead of retrying on every render — the `onError` → state-bump only exists to make
 * the component that observed the failure repaint as the glyph.
 */
const failedHosts = new Set();

const Favicon = ({ url, size = 14, className = '' }) => {
  const [, bump] = useState(0);
  const host = hostOf(url);

  if (!host || failedHosts.has(host)) {
    return <Globe size={size} className={`text-sdl-sec shrink-0 ${className}`} aria-hidden="true" />;
  }

  return (
    <img
      src={`https://icons.duckduckgo.com/ip3/${host}.ico`}
      width={size}
      height={size}
      alt=""
      loading="lazy"
      className={`rounded-sm shrink-0 ${className}`}
      onError={() => {
        failedHosts.add(host);
        bump((n) => n + 1);
      }}
    />
  );
};

export default Favicon;
