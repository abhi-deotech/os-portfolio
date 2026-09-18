/**
 * noteExport — naming and share payloads for Notepad's Download and Share (pure: no React, no store,
 * no DOM globals; the caller passes the navigator and File constructor of the window the click came
 * from, so a popped-out Notepad shares through its own window).
 *
 * Harnessed by scripts/interaction-check.mjs (noteExport section).
 */

const KEEP_EXT = /\.(md|markdown|txt)$/i;

/** A file name safe to save: path and reserved characters stripped, a note extension kept or added. */
export function downloadFileName(name) {
  const clean = String(name ?? '').replace(/[/\\:*?"<>|]/g, '').trim();
  if (!clean) return 'Untitled.md';
  return KEEP_EXT.test(clean) ? clean : `${clean}.md`;
}

/** The MIME type for a note file name: plain text for .txt, Markdown otherwise. */
export function noteMime(name) {
  return /\.txt$/i.test(String(name ?? '')) ? 'text/plain' : 'text/markdown';
}

/**
 * The first share payload this navigator accepts, tried in order:
 *   1. files — the note as .md (text/markdown)
 *   2. files — the note as .txt (text/plain); Chromium's share allowlist may refuse .md
 *   3. text
 * → { kind: 'files' | 'text' | 'none', data }. `none` when the navigator can't share at all.
 */
export function buildSharePayload({ fileName, content, nav, FileCtor }) {
  if (typeof nav?.share !== 'function') return { kind: 'none', data: null };
  const title = String(fileName ?? '').trim() || 'Untitled';
  const text = String(content ?? '');
  const canShare = typeof nav.canShare === 'function' ? (data) => {
    try { return !!nav.canShare(data); } catch { return false; }
  } : null;

  if (canShare && typeof FileCtor === 'function') {
    const base = downloadFileName(fileName).replace(KEEP_EXT, '') || 'Untitled';
    for (const [ext, type] of [['.md', 'text/markdown'], ['.txt', 'text/plain']]) {
      let file;
      try { file = new FileCtor([text], `${base}${ext}`, { type }); } catch { continue; }
      const data = { files: [file], title };
      if (canShare(data)) return { kind: 'files', data };
    }
  }

  // Without canShare there is nothing to ask; plain text is the one payload every share() accepts.
  const data = { title, text };
  if (!canShare || canShare(data)) return { kind: 'text', data };
  return { kind: 'none', data: null };
}
