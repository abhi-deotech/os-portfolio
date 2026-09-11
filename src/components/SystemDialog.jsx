import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle, Info, HelpCircle, Trash2, FolderPlus, FilePlus, RotateCcw, Eraser,
} from 'lucide-react';
import useOSStore from '../store/osStore';

/**
 * The OS's dialog surface — what `window.alert` / `confirm` / `prompt` used to do, in Lumina's own
 * chrome. Raised through src/utils/dialog.js, queued by src/store/slices/dialogSlice.js.
 *
 * Mounted once at the ROOT (main.jsx), not inside App: App returns early for BSOD, BootSequence and
 * LoginScreen, and a dialog raised from any of those three has to be able to appear.
 *
 * Layered at z-3000 — above the toast rail (2000), Spotlight (1001) and every window, but below
 * the screensaver and BSOD (10000), which are states in which nothing should be asking questions.
 */

// String keys rather than component references so a dialog spec stays plain, serialisable data —
// see the header of dialogSlice.js.
const ICONS = {
  info: Info,
  alert: AlertTriangle,
  question: HelpCircle,
  trash: Trash2,
  folder: FolderPlus,
  file: FilePlus,
  reset: RotateCcw,
  erase: Eraser,
};

/**
 * Tone drives the badge, the role and the confirm button's voice.
 *
 * `danger` confirms are a TINT, never a solid `--sdl-alert` fill. `--sdl-on-accent` is computed
 * against the ACCENT and carries no guarantee against `alert`, so a solid alert button would be
 * unreadable on some colorways — the same constraint already recorded at TaskManager.jsx:170.
 * `info` uses `soft`/`aInk`, which is law 3 (lighten + desaturate before bolding).
 */
const TONES = {
  info: {
    icon: 'info',
    badge: 'bg-sdl-soft text-sdl-aInk border-sdl-accent/20',
    confirm:
      'bg-sdl-accent text-sdl-onAccent border-transparent hover:shadow-[var(--sdl-lift-hover)] ' +
      'focus-visible:ring-sdl-accent/50',
  },
  warn: {
    icon: 'alert',
    badge: 'bg-sdl-warn/10 text-sdl-warn border-sdl-warn/25',
    confirm:
      'bg-sdl-warn/15 text-sdl-warn border-sdl-warn/40 hover:bg-sdl-warn/25 ' +
      'focus-visible:ring-sdl-warn/50',
  },
  danger: {
    icon: 'alert',
    badge: 'bg-sdl-alert/10 text-sdl-alert border-sdl-alert/25',
    confirm:
      'bg-sdl-alert/15 text-sdl-alert border-sdl-alert/40 hover:bg-sdl-alert/25 ' +
      'focus-visible:ring-sdl-alert/50',
  },
};

const BUTTON_BASE =
  'px-5 py-2.5 rounded-xl border text-[11px] font-black uppercase tracking-widest ' +
  'transition-all duration-hover ease-sdl active:scale-[0.97] disabled:opacity-40 ' +
  'disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-sdl-surface';

// `:not([disabled])` matters: the confirm button of an empty required prompt is disabled, and a
// trap that cycles onto a disabled node strands the keyboard user on a dead stop.
const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

const DialogCard = ({ dialog, onResolve }) => {
  const {
    kind, tone = 'info', title, message, kicker, icon,
    confirmLabel, cancelLabel, defaultValue = '', placeholder, required = true, hint,
  } = dialog;

  const isPrompt = kind === 'prompt';
  const [value, setValue] = useState(defaultValue);
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const restoreRef = useRef(null);

  const toneSpec = TONES[tone] ?? TONES.info;
  const Icon = ICONS[icon] ?? ICONS[toneSpec.icon];
  const canConfirm = !isPrompt || !required || value.trim().length > 0;

  const confirm = useCallback(() => {
    if (isPrompt) {
      const trimmed = value.trim();
      if (required && !trimmed) return;
      onResolve(trimmed);
      return;
    }
    onResolve(true);
  }, [isPrompt, onResolve, required, value]);

  // Cancel is what Escape, the backdrop and the Cancel button all do, so the answer you get from
  // walking away is always the inert one. An alert has nothing to decline — dismissing it IS
  // acknowledging it, so it settles the same way its one button does.
  const cancel = useCallback(() => {
    if (kind === 'alert') onResolve(true);
    else onResolve(isPrompt ? null : false);
  }, [isPrompt, kind, onResolve]);

  // Capture focus, place it on the thing you are meant to act on, and hand it back on the way out.
  // Without the restore, dismissing a dialog raised from a toolbar button drops focus onto <body>
  // and the keyboard user starts again from the top of the document.
  useEffect(() => {
    restoreRef.current = document.activeElement;
    const target = isPrompt
      ? inputRef.current
      : panelRef.current?.querySelector('[data-default-action]');
    target?.focus();
    if (isPrompt) inputRef.current?.select();

    return () => {
      const previous = restoreRef.current;
      if (previous instanceof HTMLElement && document.contains(previous)) previous.focus();
    };
  }, [isPrompt]);

  // Modal means modal: Tab must not walk out of the panel and into the desktop behind the scrim.
  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      cancel();
      return;
    }
    if (event.key !== 'Tab') return;

    const nodes = Array.from(panelRef.current?.querySelectorAll(FOCUSABLE) ?? []);
    if (nodes.length === 0) return;

    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || !panelRef.current?.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const titleId = `${dialog.id}-title`;
  const bodyId = `${dialog.id}-body`;
  const transparencyEffects = useOSStore((s) => s.transparencyEffects);

  const Body = isPrompt ? 'form' : 'div';
  const bodyProps = isPrompt
    ? { onSubmit: (e) => { e.preventDefault(); confirm(); } }
    : {};

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      onKeyDown={handleKeyDown}
      onMouseDown={(e) => { if (e.target === e.currentTarget) cancel(); }}
      className={`fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-scrim ${
        transparencyEffects ? 'backdrop-blur-md' : ''
      }`}
    >
      <motion.div
        ref={panelRef}
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
        role={isPrompt ? 'dialog' : 'alertdialog'}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={message ? bodyId : undefined}
        className="w-full max-w-[430px] bg-sdl-surface border border-hairline/10
          rounded-sdl-panel shadow-[var(--sdl-lift-window)] overflow-hidden"
      >
        <Body {...bodyProps}>
          <div className="flex gap-4 p-6">
            <div
              aria-hidden="true"
              className={`shrink-0 w-11 h-11 rounded-2xl border flex items-center justify-center ${toneSpec.badge}`}
            >
              <Icon size={19} strokeWidth={2.2} />
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              {kicker && (
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-sdl-sec/70 mb-1.5">
                  {kicker}
                </p>
              )}
              <h2 id={titleId} className="font-display text-base font-black text-sdl-ink leading-snug">
                {title}
              </h2>
              {message && (
                <p id={bodyId} className="mt-1.5 text-[13px] leading-relaxed text-sdl-sec">
                  {message}
                </p>
              )}

              {isPrompt && (
                <>
                  <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    placeholder={placeholder}
                    onChange={(e) => setValue(e.target.value)}
                    aria-label={title}
                    aria-invalid={!canConfirm}
                    className="mt-4 w-full bg-sdl-sunken border border-hairline/15 rounded-xl
                      px-3.5 py-2.5 text-sm text-sdl-ink placeholder:text-sdl-sunkSec/60
                      outline-none transition-all duration-hover ease-sdl
                      focus:border-sdl-accent/50 focus:ring-2 focus:ring-sdl-accent/25"
                  />
                  {hint && (
                    <p className="mt-2 text-[11px] text-sdl-sec/70">{hint}</p>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 px-6 py-4 bg-veil/[0.03] border-t border-hairline/10">
            {kind !== 'alert' && (
              <button
                type="button"
                onClick={cancel}
                className={`${BUTTON_BASE} bg-veil/5 border-hairline/15 text-sdl-sec
                  hover:text-sdl-ink hover:bg-veil/10 focus-visible:ring-sdl-accent/50`}
              >
                {cancelLabel ?? 'Cancel'}
              </button>
            )}
            <button
              type={isPrompt ? 'submit' : 'button'}
              data-default-action=""
              disabled={!canConfirm}
              onClick={isPrompt ? undefined : confirm}
              className={`${BUTTON_BASE} ${toneSpec.confirm}`}
            >
              {confirmLabel ?? 'OK'}
            </button>
          </div>
        </Body>
      </motion.div>
    </motion.div>
  );
};

/**
 * One dialog on screen at a time; anything raised while one is up waits behind it, which is how a
 * real window manager serialises modals. Rendering the whole queue at once would stack scrims and
 * give two panels a claim on the focus trap.
 */
const SystemDialog = () => {
  const dialogs = useOSStore((s) => s.dialogs);
  const resolveDialog = useOSStore((s) => s.resolveDialog);
  const current = dialogs[dialogs.length - 1];

  const currentId = current?.id;
  const handleResolve = useCallback(
    (value) => { if (currentId) resolveDialog(currentId, value); },
    [currentId, resolveDialog],
  );

  return (
    <AnimatePresence>
      {current && <DialogCard key={current.id} dialog={current} onResolve={handleResolve} />}
    </AnimatePresence>
  );
};

export default SystemDialog;
