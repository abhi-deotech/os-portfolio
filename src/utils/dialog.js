import useOSStore from '../store/osStore';

/**
 * Lumina's system dialogs. This is the ONLY sanctioned way to ask the user something.
 *
 * `window.alert` / `confirm` / `prompt` are banned by `no-restricted-globals` in eslint.config.js,
 * and for good reason: they render the *browser's* chrome, not the OS's — wrong typeface, wrong
 * radius, wrong scrim, and stamped with the deployment's hostname, which breaks the illusion the
 * whole product is built on. They also block the main thread, so every animation on screen freezes
 * behind them.
 *
 * The return contract deliberately mirrors the natives so call sites read the same:
 *
 *   await osAlert(...)    → true once acknowledged
 *   await osConfirm(...)  → true | false
 *   await osPrompt(...)   → the trimmed string, or null if cancelled
 *
 * Because these go through the store rather than the component tree, non-React code — a store
 * slice, the terminal's command table — can raise one too.
 *
 * Shared options:
 *   title        required. Sentence case, no trailing period. The question or the verdict.
 *   message      the supporting line. Optional for an obvious title.
 *   kicker       tiny uppercase eyebrow naming the app that raised it ("Lumina Cloud").
 *   tone         'info' (default) | 'warn' | 'danger'. Picks the badge role and the button voice.
 *   icon         one of the keys in ICONS in SystemDialog.jsx. Defaults from `tone`.
 */

const request = (spec) => useOSStore.getState().requestDialog(spec);

/** A statement. One button. Resolves `true` when acknowledged or dismissed. */
export const osAlert = ({ confirmLabel = 'OK', tone = 'info', ...rest }) =>
  request({ kind: 'alert', tone, confirmLabel, ...rest });

/**
 * A yes/no question. Resolves `true` only on the affirmative button — Escape, the backdrop and
 * Cancel all resolve `false`, so the safe answer is the one you get by doing nothing.
 *
 * Pass `tone: 'danger'` for anything that destroys data; it re-voices the confirm button and
 * switches the role to `alertdialog`.
 */
export const osConfirm = ({ confirmLabel = 'Continue', cancelLabel = 'Cancel', tone = 'info', ...rest }) =>
  request({ kind: 'confirm', tone, confirmLabel, cancelLabel, ...rest });

/**
 * A single line of text. Resolves the trimmed value, or `null` if cancelled.
 *
 * `required` (default true) disables the confirm button on an empty field rather than letting the
 * caller discover it — `prompt()`'s habit of returning `""` and leaving every call site to guard
 * it is exactly the bug this replaces.
 */
export const osPrompt = ({
  confirmLabel = 'Create',
  cancelLabel = 'Cancel',
  tone = 'info',
  defaultValue = '',
  required = true,
  ...rest
}) => request({ kind: 'prompt', tone, confirmLabel, cancelLabel, defaultValue, required, ...rest });
