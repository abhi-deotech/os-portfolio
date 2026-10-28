/**
 * ⌘C, ⌘X, ⌘V, ⌘A, ⌘Z and ⇧⌘Z inside Plash.
 *
 * In a Mac app those keys are menu shortcuts: the Edit menu's Copy item is what sends `copy:` to a
 * web view. Plash lives in the menu bar and has no Edit menu, so in its web view the keys arrive as
 * plain keydowns and nothing happens. This performs them from the page instead.
 *
 * Installed only inside Plash (App.jsx). A browser has its own Edit menu; doing the work here as well
 * would paste twice. The listener sits on `window` in the bubble phase, so an app that handles one
 * of these keys itself (and calls preventDefault) keeps it.
 */

const isEditable = (el) =>
  !!el && (el.isContentEditable || (el.matches?.('input, textarea') && !el.readOnly && !el.disabled));

async function paste(target) {
  let text;
  try {
    // WebKit may show its small "Paste" button first when the text came from another app; the
    // keypress is the user gesture it asks for.
    text = await navigator.clipboard.readText();
  } catch {
    return;
  }
  if (!text || document.activeElement !== target) return;
  // `insertText` goes through the editor, so the input event fires (React sees the change) and ⌘Z
  // can undo it. The fallback only covers an engine that refuses the command.
  if (!document.execCommand('insertText', false, text) && 'setRangeText' in target) {
    target.setRangeText(text, target.selectionStart, target.selectionEnd, 'end');
    target.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

function onKeyDown(e) {
  if (!e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
  const target = document.activeElement;
  const editable = isEditable(target);
  switch (e.key.toLowerCase()) {
    case 'c':
      document.execCommand('copy');
      break;
    case 'x':
      if (!editable) return;
      document.execCommand('cut');
      break;
    case 'v':
      if (!editable) return;
      paste(target);
      break;
    case 'a':
      if (!editable) return;
      document.execCommand('selectAll');
      break;
    case 'z':
      if (!editable) return;
      document.execCommand(e.shiftKey ? 'redo' : 'undo');
      break;
    default:
      return;
  }
  e.preventDefault();
}

/** @returns {() => void} removes the listener */
export function installEditKeys() {
  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}
