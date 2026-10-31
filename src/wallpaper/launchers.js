/**
 * The app-access catalogue for wallpaper mode's Apps widget.
 *
 * Three kinds of tile, one id space (`kind:id`), so the URL can carry the visitor's picks as one list:
 *   mac:*  a macOS app, opened through the URL scheme it registers (`spotify:`, `vscode:` …). The OS
 *          only routes the scheme if the app is installed. Safari and Chrome hand such links to
 *          macOS; Plash does only with its "Open external links in default browser" setting on (it
 *          then passes every clicked link to another host to NSWorkspace).
 *   web:*  a website, opened in a new tab.
 *   app:*  one of Lumina's own apps, opened as a window over the wallpaper.
 *
 * Custom web links (name + URL) travel separately as `link` params, and any other Mac app by name as
 * `mac` params; see config.js and `macAppHref` below.
 */
import {
  Music, Code, NotebookPen, MessageSquare, Mail, Gem, MessagesSquare, Video, PenTool,
  Settings as Gear, Phone, Users, Sparkles, ShoppingBag, Map as MapIcon, Podcast, Workflow, ListChecks, Send,
  MousePointer2, LayoutList, Command, BatteryCharging,
} from 'lucide-react';

/** `site` is only for the tile's icon (its favicon); `Icon` is the fallback glyph if that fails. */
export const MAC_APPS = {
  spotify:  { name: 'Spotify',  href: 'spotify:',                    site: 'spotify.com', Icon: Music },
  music:    { name: 'Music',    href: 'music://',                    site: 'music.apple.com', Icon: Music },
  vscode:   { name: 'VS Code',  href: 'vscode://',                   site: 'code.visualstudio.com', Icon: Code },
  notion:   { name: 'Notion',   href: 'notion://',                   site: 'notion.so', Icon: NotebookPen },
  obsidian: { name: 'Obsidian', href: 'obsidian://',                 site: 'obsidian.md', Icon: Gem },
  slack:    { name: 'Slack',    href: 'slack://open',                site: 'slack.com', Icon: MessageSquare },
  discord:  { name: 'Discord',  href: 'discord://',                  site: 'discord.com', Icon: MessagesSquare },
  zoom:     { name: 'Zoom',     href: 'zoommtg://',                  site: 'zoom.us', Icon: Video },
  figma:    { name: 'Figma',    href: 'figma://',                    site: 'figma.com', Icon: PenTool },
  mail:     { name: 'Mail',     href: 'mailto:',                     site: 'icloud.com', Icon: Mail },
  settings: { name: 'Settings', href: 'x-apple.systempreferences:',  site: 'apple.com', Icon: Gear },
  messages: { name: 'Messages', href: 'sms:',                        site: 'support.apple.com', Icon: MessageSquare },
  whatsapp: { name: 'WhatsApp', href: 'whatsapp://',                 site: 'whatsapp.com', Icon: Phone },
  teams:    { name: 'Teams',    href: 'msteams:',                    site: 'teams.microsoft.com', Icon: Users },
  claude:   { name: 'Claude',   href: 'claude://',                   site: 'claude.ai', Icon: Sparkles },
  telegram: { name: 'Telegram', href: 'tg://',                       site: 'telegram.org', Icon: Send },
  cursor:   { name: 'Cursor',   href: 'cursor://',                   site: 'cursor.com', Icon: MousePointer2 },
  linear:   { name: 'Linear',   href: 'linear://',                   site: 'linear.app', Icon: LayoutList },
  raycast:  { name: 'Raycast',  href: 'raycast://',                  site: 'raycast.com', Icon: Command },
  reminders:{ name: 'Reminders', href: 'x-apple-reminderkit://',     site: 'icloud.com', Icon: ListChecks },
  maps:     { name: 'Maps',     href: 'maps://',                     site: 'maps.apple.com', Icon: MapIcon },
  podcasts: { name: 'Podcasts', href: 'podcasts://',                 site: 'podcasts.apple.com', Icon: Podcast },
  appstore: { name: 'App Store', href: 'macappstore://',             site: 'apps.apple.com', Icon: ShoppingBag },
  shortcuts:{ name: 'Shortcuts', href: 'shortcuts://',               site: 'support.apple.com', Icon: Workflow },
  // System Settings → Battery: Charge Limit, Low Power Mode and Optimized Charging live here.
  battery:  { name: 'Battery',  href: 'x-apple.systempreferences:com.apple.Battery-Settings.extension', site: 'apple.com', Icon: BatteryCharging },
};

/**
 * Any other Mac app, by name. Apps such as Finder, Safari, Notes or Calendar register no URL scheme a
 * page can call, but Shortcuts does: this runs a one-time shortcut, set up from Settings → Wallpaper
 * mode, whose single "Run Shell Script" action is `open -a "$1"` with the app name as its input.
 */
export const OPEN_SHORTCUT = 'Lumina Open';
export const macAppHref = (name) =>
  `shortcuts://run-shortcut?name=${encodeURIComponent(OPEN_SHORTCUT)}&input=text&text=${encodeURIComponent(name)}`;

/** One of the visitor's own shortcuts, run by name (names come through config.js's sanitizeShortcut). */
export const shortcutHref = (name) => `shortcuts://run-shortcut?name=${encodeURIComponent(name)}`;

/**
 * A project folder in its editor: VS Code's documented `vscode://file/<absolute path>`, which Cursor
 * keeps as `cursor://file/…`. The path is sanitized in config.js (absolute, no `..`, no `?`/`#`), and
 * each segment is percent-encoded so spaces and `%` survive.
 */
export const PROJECT_EDITOR_NAMES = { cursor: 'Cursor', vscode: 'VS Code' };
export const projectHref = ({ editor, path }) =>
  `${editor}://file/${path.split('/').filter(Boolean).map(encodeURIComponent).join('/')}`;

/**
 * Mac app links are plain top-level links, marked with this attribute so wallpaper mode can tell a
 * Mac link was clicked (see useMacLinkHint in WallpaperMode.jsx).
 *
 * Tested in real Plash 2.17.4 on macOS 27 (2026-10-30), with "Open external links in default
 * browser" on: a plain link (maps://) and a target=_blank link (podcasts://) both opened their app
 * and the wallpaper stayed put; the same kind of link aimed at a hidden iframe (shortcuts://) did
 * nothing, however often clicked. An earlier version used that hidden frame, after checking Plash
 * 2.16's navigation code in a WKWebView harness, and so no Mac tile opened anything in real Plash.
 * With the setting off, Plash cannot hand any of these to macOS; Settings → Wallpaper mode says to
 * turn it on, and the hint repeats it after a click.
 */
export const MAC_LINK_ATTR = 'data-mac-link';
export const MAC_LINK_PROPS = { [MAC_LINK_ATTR]: '' };

export const WEB_LINKS = {
  gmail:    { name: 'Gmail',    href: 'https://mail.google.com/' },
  calendar: { name: 'Calendar', href: 'https://calendar.google.com/' },
  github:   { name: 'GitHub',   href: 'https://github.com/' },
  chatgpt:  { name: 'ChatGPT',  href: 'https://chatgpt.com/' },
  claude:   { name: 'Claude',   href: 'https://claude.ai/' },
  youtube:  { name: 'YouTube',  href: 'https://www.youtube.com/' },
  linkedin: { name: 'LinkedIn', href: 'https://www.linkedin.com/' },
  drive:    { name: 'Drive',    href: 'https://drive.google.com/' },
};

/** Lumina apps worth a tile; the rest stay one click away on the desktop. */
export const LUMINA_APPS = ['terminal', 'notepad', 'music', 'files', 'browser', 'aichat', 'projects', 'settings'];

export const MAX_TILES = 8;

export const DEFAULT_TILES = ['mac:vscode', 'mac:spotify', 'web:gmail', 'web:github', 'web:chatgpt', 'app:terminal', 'app:notepad', 'app:music'];

export function isKnownTile(id) {
  const [kind, key] = String(id).split(':');
  if (kind === 'mac') return Boolean(MAC_APPS[key]);
  if (kind === 'web') return Boolean(WEB_LINKS[key]);
  if (kind === 'app') return LUMINA_APPS.includes(key);
  return false;
}

/** A custom link must be plain http(s): never `javascript:` or a data URL handed over in a URL. */
export function safeHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch {
    return null;
  }
}

export const SEARCH_ENGINES = {
  google:     { name: 'Google',     action: 'https://www.google.com/search',  param: 'q' },
  duckduckgo: { name: 'DuckDuckGo', action: 'https://duckduckgo.com/',        param: 'q' },
  bing:       { name: 'Bing',       action: 'https://www.bing.com/search',    param: 'q' },
  perplexity: { name: 'Perplexity', action: 'https://www.perplexity.ai/search', param: 'q' },
};
