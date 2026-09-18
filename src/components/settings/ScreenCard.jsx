import React, { useId } from 'react';
import useOSStore from '../../store/osStore';
import useCapability from '../../capabilities/useCapability.js';
import { CapabilityNotice } from '../../capabilities/CapabilityGate';
import { notifyUnavailable } from '../../capabilities/notify.js';
import { requestIdlePermission } from '../../hooks/useIdleDetection';
import { Card, Row, Switch } from './primitives';

/**
 * Settings → System → Screen. The screensaver's in-page timer always runs; this switch adds the
 * system idle state on top (Idle Detection), which also catches a locked screen.
 *
 * Turning it on asks for permission from the click. Granted turns it on; anything else leaves it off
 * and raises the denied notice. Browsers without the API see the notice in place of the switch.
 *
 * The notice sits under the row rather than in the Row's control slot: it is a full panel and needs
 * the card's width. A denied permission keeps the switch, so a setting that was on before the
 * permission was revoked can still be turned off here.
 */
const ScreenCard = () => {
  const statusId = useId();
  const idleDetection = useOSStore((s) => s.idleDetection);
  const setIdleDetection = useOSStore((s) => s.setIdleDetection);
  const cap = useCapability('idleDetection');
  const on = idleDetection === 'on';

  const onChange = async (next, e) => {
    if (!next) {
      setIdleDetection('off');
      return;
    }
    // Gesture realm: in a popped-out Settings the click activates the popup, not the main window,
    // so the request uses the switch's own window, and the notice pops the window back in first.
    const fromEl = e?.currentTarget ?? null;
    const result = await requestIdlePermission(fromEl?.ownerDocument?.defaultView ?? window);
    if (result === 'granted') {
      setIdleDetection('on');
    } else {
      setIdleDetection('off');
      notifyUnavailable('idleDetection', { kind: 'denied', fromEl });
    }
  };

  let statusLine;
  if (on && cap.supported) {
    if (cap.permission === 'granted' || cap.permission === 'unknown') statusLine = 'Active';
    else if (cap.permission === 'denied') statusLine = 'Permission revoked, using in-page activity';
    // 'prompt' after being on means the site permission was reset to ask: the detector can't run.
    else if (cap.permission === 'prompt') statusLine = 'Permission needed, using in-page activity';
  }

  return (
    <Card title="Screen" sub="Screensaver starts after 2 minutes without activity.">
      <Row title="Use the system idle state (also starts when the screen locks)" sub={statusLine} subId={statusId}>
        {cap.supported && (
          // The id is Compatibility's "Set up" focus target (SETUP_FOCUS). The status line is tied to
          // the switch, so a revoked permission is announced with "on", not only shown.
          <Switch
            id="screen-idle-switch"
            label="Use the system idle state (also starts when the screen locks)"
            checked={on}
            onChange={onChange}
            describedBy={statusLine ? statusId : undefined}
          />
        )}
      </Row>
      {!cap.supported && <CapabilityNotice id="idleDetection" kind="unsupported" />}
    </Card>
  );
};

export default ScreenCard;
