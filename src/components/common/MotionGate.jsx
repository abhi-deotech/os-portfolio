import React from 'react';
import { MotionConfig } from 'framer-motion';
import useOSStore from '../../store/osStore';

/**
 * Bridges the in-app Reduced Motion setting into Framer Motion.
 *
 * `<MotionConfig reducedMotion="user">` — what this used to be — reads ONLY the OS-level
 * `prefers-reduced-motion` media query. It cannot see the app's own three-way setting, so the two
 * halves of the reduced-motion story disagreed the moment a user chose anything but "Follow system":
 *
 *   "Reduce" with no OS preference  → grammar.css collapsed CSS transitions to 1ms, but every
 *                                     Framer spring (window open/close, boot, login, AnimatePresence)
 *                                     kept playing at full tempo.
 *   "Full" with an OS preference    → the inverse: CSS ran full speed while Framer suppressed
 *                                     everything, overriding an explicit user choice.
 *
 * Framer's own vocabulary maps one-to-one onto ours, so the fix is a translation, not a mechanism:
 * 'system' → 'user' (defer to the media query), 'on' → 'always', 'off' → 'never'.
 *
 * Lives at the ROOT, outside App, because App returns early for BSOD, BootSequence and LoginScreen —
 * wrapping only the authenticated tree would leave boot and login animating regardless.
 */
const TO_FRAMER = { system: 'user', on: 'always', off: 'never' };

const MotionGate = ({ children }) => {
  const reducedMotion = useOSStore((s) => s.reducedMotion);
  return (
    <MotionConfig reducedMotion={TO_FRAMER[reducedMotion] || 'user'}>
      {children}
    </MotionConfig>
  );
};

export default MotionGate;
