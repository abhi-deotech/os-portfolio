/**
 * The app-access catalogue for wallpaper mode's Apps widget.
 *
 * Three kinds of tile, one id space (`kind:id`), so the URL can carry the visitor's picks as one list:
 *   mac:*  a macOS app, opened through the URL scheme it registers (`spotify:`, `vscode:` …). The OS
 *          only routes the scheme if the app is installed, and only if the page's host hands custom
 *          schemes to macOS — true in Safari and Chrome; for Plash it has to be checked on the Mac.
 *   web:*  a website, opened in a new tab.
 *   app:*  one of Lumina's own apps; opening it leaves wallpaper mode for the full desktop.
 *
 * Custom web links (name + URL) travel separately as `link` params; see config.js.
 */
import {
  Music, Code, NotebookPen, MessageSquare, Mail, Gem, MessagesSquare, Video, PenTool,
  Settings as Gear,
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
};

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
