import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Window from './Window';
import WindowContentRenderer from './WindowContentRenderer';
import useOSStore from '../store/osStore';
import { GAME_BY_ID } from '../config/games';
import { APP_BY_ID } from '../config/apps';
import { windowTitle } from '../config/windowTitle.js';
import { popoutHostElement } from './popoutHostLoader.js';

/**
 * Appends the window's DOM host inside the docked Window's content area.
 *
 * App content is portaled into the host, which makes it a fiber SIBLING of Window rather than its
 * child — so Window's `onMouseDown` no longer sees clicks on content. A native `mousedown` on the
 * host focuses the window instead.
 */
function HostMount({ id, hostEl }) {
  const slotRef = useRef(null);
  useLayoutEffect(() => {
    const slot = slotRef.current;
    if (slot && hostEl.parentNode !== slot) slot.appendChild(hostEl);
    const onMouseDown = () => useOSStore.getState().focusWindow(id);
    hostEl.addEventListener('mousedown', onMouseDown);
    return () => hostEl.removeEventListener('mousedown', onMouseDown);
  }, [id, hostEl]);
  return <div ref={slotRef} className="contents" />;
}

/**
 * One open window: its docked frame, or — while popped out — the PopoutHost that moved its DOM into
 * another browser window.
 *
 * The slot owns a stable host element for the window's whole life, and the app is ALWAYS portaled
 * into it. Popping out and back in moves that element between documents; the portal never changes
 * container, so the app never remounts (a portal whose container changes does).
 *
 * The host is created once, in the state initializer, and nothing writes to it afterwards; effects
 * only call DOM methods on it. `data-window-id` lets notifyUnavailable find which window raised a
 * notice from inside another document, so it can pop that window back in first.
 */
export default function WindowSlot({ id, isMinimized }) {
  const [hostEl] = useState(() => {
    const el = document.createElement('div');
    el.className = 'h-full w-full relative';
    el.setAttribute('data-window-id', id);
    return el;
  });
  const poppedOut = useOSStore((s) => !!s.poppedOut?.[id]);

  // Null until PopoutHost's chunk has loaded; the pop-out click loads it before `popOutWindow`, so a
  // popped-out window always has it. Rendered BEFORE the portal, so the host is attached (docked or
  // adopted) by the time the app's own layout effects run.
  const popoutHost = poppedOut ? popoutHostElement({ id, hostEl }) : null;

  return (
    <>
      {popoutHost ?? (
        <Window
          id={id}
          title={windowTitle(id)}
          // Window geometry follows the same lookup as the title — Window defaults to 900x650, so a
          // 420px Snake board and the whole Game Center launcher would sit in the same generic frame.
          {...(GAME_BY_ID[id]?.window ?? APP_BY_ID[id]?.window ?? {})}
          isMinimized={isMinimized}
        >
          <HostMount id={id} hostEl={hostEl} />
        </Window>
      )}
      {createPortal(<WindowContentRenderer id={id} />, hostEl)}
    </>
  );
}
