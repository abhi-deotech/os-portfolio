import { useEffect, useState } from 'react';
import { getCapability } from './registry.js';
import { defaultEnv, deriveAskable, deriveStatus, isSupported } from './support.js';
import { describeBrowser } from './browser.js';
import { refreshPermission, subscribePermission } from './permissions.js';

/**
 * useCapability(id) → { id, label, supported, available, status, permission, askable, tier, browser,
 *                       request }
 *
 * `supported` is computed in render: detection is memoised and pure, so there is no state to sync.
 * `permission` arrives from a shared PermissionStatus subscription (permissions.js), which calls
 * back asynchronously — never a synchronous setState in the effect body.
 *
 * No notice text here: eager surfaces (Control Center, windows) use this hook, so the words live in
 * notice.js, which callers that render a notice import themselves (or reach via notifyUnavailable).
 */
export default function useCapability(id) {
  const entry = getCapability(id);
  const supported = isSupported(id);
  const permissionName = supported ? entry?.permissionName : undefined;
  const [permission, setPermission] = useState(undefined);

  useEffect(() => {
    if (!permissionName) return undefined;
    return subscribePermission(permissionName, setPermission);
  }, [permissionName]);

  const status = deriveStatus({ supported, permission });
  const askable = supported && deriveAskable({ request: entry?.request, settingsTab: entry?.settingsTab, permission });
  const browser = describeBrowser();

  const request = supported && entry?.request
    ? async () => {
      try {
        return await entry.request(defaultEnv());
      } finally {
        if (permissionName) refreshPermission(permissionName);
      }
    }
    : undefined;

  return {
    id,
    label: entry?.label ?? id,
    supported,
    available: supported && status !== 'denied',
    status,
    permission,
    askable,
    tier: entry?.tier,
    browser,
    request,
  };
}
