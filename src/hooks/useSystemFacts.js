import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { POLLED_IDS, ensure, getSnapshot, retainPolling, subscribe } from '../system/facts.js';
import { useDocumentVisible } from './useWindowVisibility';

/**
 * useSystemFact(id) → the fact (see src/system/facts.js), re-rendering only when it changes.
 *
 * Mounting runs the fact's one-shot probe; a polled fact (heap, storage) is kept fresh only while
 * this component is mounted AND the tab is visible. Observers (battery, CPU pressure) are shared and
 * ref-counted per fact id inside facts.js, so ten readers of `battery` hold one BatteryManager.
 *
 * `subscribe` is memoised on the id: a new function every render would make React resubscribe each
 * time, tearing down and rebuilding the observer behind it.
 */
export function useSystemFact(id) {
  const sub = useCallback((listener) => subscribe(listener, [id]), [id]);
  const read = useCallback(() => getSnapshot()[id], [id]);
  const fact = useSyncExternalStore(sub, read, read);

  useEffect(() => {
    ensure([id]);
  }, [id]);

  const visible = useDocumentVisible();
  const polled = POLLED_IDS.includes(id);
  useEffect(() => {
    if (!polled || !visible) return undefined;
    return retainPolling();
  }, [polled, visible]);

  return fact;
}

/** useSystemFacts(ids) → the whole frozen snapshot; same probing and polling rules as useSystemFact. */
export function useSystemFacts(ids) {
  const key = ids.join(',');
  const sub = useCallback((listener) => subscribe(listener, key.split(',')), [key]);
  const snapshot = useSyncExternalStore(sub, getSnapshot, getSnapshot);

  useEffect(() => {
    ensure(key.split(','));
  }, [key]);

  const visible = useDocumentVisible();
  const polled = key.split(',').some((id) => POLLED_IDS.includes(id));
  useEffect(() => {
    if (!polled || !visible) return undefined;
    return retainPolling();
  }, [polled, visible]);

  return snapshot;
}
