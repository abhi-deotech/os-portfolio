import { createElement } from 'react';

/**
 * PopoutHost and popoutDom stay out of the first paint: they load when someone first pops a window
 * out. They cannot go through React.lazy + Suspense, because the host element has to be adopted by
 * the popup in the SAME commit that unmounts the docked Window (a suspended PopoutHost would leave
 * media detached across a task and paused). So the click handler loads this module after the popup
 * is open and before it calls `popOutWindow`, and WindowSlot then renders it synchronously.
 */

let PopoutHost = null;
let pending = null;

export function loadPopoutHost() {
  if (PopoutHost) return Promise.resolve(PopoutHost);
  pending ??= import('./PopoutHost.jsx').then(
    (mod) => (PopoutHost = mod.default),
    (err) => {
      pending = null;
      throw err;
    },
  );
  return pending;
}

/** The PopoutHost element, or null until loadPopoutHost has resolved. */
export const popoutHostElement = (props) => (PopoutHost ? createElement(PopoutHost, props) : null);
