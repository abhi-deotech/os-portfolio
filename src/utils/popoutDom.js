/**
 * DOM plumbing for popped-out windows. PURE: no React, no store, no `import.meta.env`; plain Node
 * imports this with fake elements (scripts/interaction-check.mjs).
 *
 * A popped-out window is a second document (Document Picture-in-Picture, a `window.open` popup, or a
 * DEV iframe). It starts empty, so it needs the main document's theme attributes, CSS variables and
 * stylesheets before the window's DOM host is moved into it — and needs to keep following them.
 *
 * Only DOM methods and properties that the harness fakes are used: `children`, `tagName`,
 * get/set/remove/hasAttribute, `attributes`, `insertBefore`, `appendChild`, `remove`, `textContent`,
 * `href`, `style.cssText`, `title`, `body.className`, `createElement`.
 */

/** Every attribute applyTheme writes on <html>. The harness checks this list against the real applyTheme. */
export const THEME_ATTRS = ['data-theme', 'data-colorway', 'data-mode', 'data-grammar', 'data-density', 'data-glass', 'data-motion'];

/**
 * The popup's own base rules: the body gets the plane instead of the desktop gradient, and scrolls,
 * because the window frame's scrolling content area doesn't come along.
 *
 * `html body`, not `body`: Tailwind v3 compiles index.css's `@layer base` away, so its
 * `body{background:var(--desktop-gradient);overflow:hidden}` is plain CSS with the same specificity,
 * and the synced copy lands AFTER this style in the popup's head (and so would win on source order).
 * The extra type selector (0,0,2) wins wherever the sheets end up.
 */
export const BASE_CSS = 'html,body{height:100%;margin:0} html body{background:var(--sdl-plane);overflow:auto}';

/** Copied from App's root element, which the popup has no equivalent of. */
export const POPOUT_BODY_CLASS = 'font-sans select-none text-os-onSurface';

const SHEET_MARK = 'data-popout-sheet';
const BASE_MARK = 'data-popout-base';

const tag = (node) => String(node?.tagName ?? '').toLowerCase();
const kids = (node) => Array.from(node?.children ?? []);

/** Theme attributes (added, changed and removed) plus the inline CSS variables on <html>. */
export function copyThemeState(from, to) {
  for (const name of THEME_ATTRS) {
    const value = from.getAttribute(name);
    if (value == null) {
      if (to.hasAttribute(name)) to.removeAttribute(name);
    } else if (to.getAttribute(name) !== value) {
      to.setAttribute(name, value);
    }
  }
  const css = from.style?.cssText ?? '';
  if (to.style && to.style.cssText !== css) to.style.cssText = css;
}

const isSheet = (node) =>
  tag(node) === 'style' ||
  (tag(node) === 'link' && String(node.getAttribute('rel') ?? '').split(/\s+/).includes('stylesheet'));

/**
 * A stable key for a stylesheet node: Vite's dev id, else the link's href, else its position among
 * the keyless sheets.
 */
export function sheetKey(node, index) {
  return node.getAttribute('data-vite-dev-id') ??
    (tag(node) === 'link' ? node.getAttribute('href') : null) ??
    `#${index}`;
}

/**
 * Mirror the <style> and stylesheet <link> nodes of `fromDoc.head` into `toDoc.head`: new ones are
 * cloned (a link gets its ABSOLUTE href, since the popup's URL is about:blank), changed style text is
 * updated in place (Vite HMR rewrites it), and clones whose source is gone are removed.
 * Existing clones are never moved: re-inserting a <link> reloads it and flashes unstyled content.
 */
export function syncSheets(fromDoc, toDoc) {
  const live = new Set();
  const existing = new Map();
  for (const node of kids(toDoc.head)) {
    const key = node.getAttribute?.(SHEET_MARK);
    if (key != null) existing.set(key, node);
  }

  let keyless = 0;
  for (const node of kids(fromDoc.head)) {
    if (!isSheet(node)) continue;
    const hasOwnKey = node.getAttribute('data-vite-dev-id') != null || (tag(node) === 'link' && node.getAttribute('href') != null);
    const key = sheetKey(node, hasOwnKey ? -1 : keyless++);
    live.add(key);

    let clone = existing.get(key);
    if (!clone) {
      clone = toDoc.createElement(tag(node));
      for (const { name, value } of Array.from(node.attributes ?? [])) {
        if (name !== 'href') clone.setAttribute(name, value);
      }
      if (tag(node) === 'link') clone.setAttribute('href', node.href);
      clone.setAttribute(SHEET_MARK, key);
      if (tag(node) === 'style') clone.textContent = node.textContent;
      toDoc.head.appendChild(clone);
      existing.set(key, clone);
    } else if (tag(node) === 'style' && clone.textContent !== node.textContent) {
      clone.textContent = node.textContent;
    }
  }

  for (const [key, clone] of existing) {
    if (!live.has(key)) clone.remove();
  }
}

/**
 * Prepare an empty popup document. `<base>` goes FIRST, so every relative URL after it (sheets,
 * images) resolves against the app, not about:blank; `base-uri 'self'` in the CSP allows it.
 * `lang` (the main document's) goes on the popup's <html>, so assistive tech reads it in the right
 * language (WCAG 3.1.1). Idempotent: running it twice (StrictMode) leaves one of everything.
 */
export function bootstrapDocument(doc, { title = 'Lumina', bodyClass = POPOUT_BODY_CLASS, baseHref, lang } = {}) {
  if (lang && doc.documentElement && doc.documentElement.getAttribute('lang') !== lang) {
    doc.documentElement.setAttribute('lang', lang);
  }

  const head = doc.head;
  let base = kids(head).find((n) => tag(n) === 'base');
  if (!base) {
    base = doc.createElement('base');
    head.insertBefore(base, head.firstChild ?? null);
  }
  if (baseHref && base.getAttribute('href') !== baseHref) base.setAttribute('href', baseHref);

  if (!kids(head).some((n) => tag(n) === 'meta' && n.hasAttribute('charset'))) {
    const meta = doc.createElement('meta');
    meta.setAttribute('charset', 'utf-8');
    head.insertBefore(meta, base.nextSibling ?? null);
  }

  const fullTitle = `${title} — Lumina`;
  if (doc.title !== fullTitle) doc.title = fullTitle;

  if (!kids(head).some((n) => tag(n) === 'style' && n.hasAttribute(BASE_MARK))) {
    const style = doc.createElement('style');
    style.setAttribute(BASE_MARK, '');
    style.textContent = BASE_CSS;
    head.appendChild(style);
  }

  if (doc.body.className !== bodyClass) doc.body.className = bodyClass;
}

/**
 * Keep <video>/<audio> position across a document move. Chromium reloads media moved into another
 * document (`HTMLMediaElement::DidMoveToNewDocument`) everywhere except Document Picture-in-Picture,
 * so a `window.open` popup would restart playback from 0. Call BEFORE moving `root`: it records
 * { currentTime, paused } and restores them once the reloaded element has metadata.
 */
export function preserveMediaState(root) {
  for (const el of Array.from(root.querySelectorAll?.('video, audio') ?? [])) {
    const { currentTime, paused } = el;
    if (!(currentTime > 0) && paused) continue;
    el.addEventListener('loadedmetadata', () => {
      try { el.currentTime = currentTime; } catch { /* not seekable */ }
      if (!paused) el.play?.()?.catch?.(() => {});
    }, { once: true });
  }
}
