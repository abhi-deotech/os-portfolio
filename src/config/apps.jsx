import {
  User, FileText, Code, HardDrive, Gamepad2, Music, Joystick,
  Activity, Mail, MessageSquare, Settings as SettingsIcon, Trophy, Globe, Brain, Book,
} from 'lucide-react';

const IS_PUTER_SHELL = import.meta.env.VITE_APP_MODE === 'puter-shell';

/**
 * Centralized application configuration for Lumina OS.
 *
 * ── Why this file is data and no longer JSX closures ───────────────────────────────────────────
 *
 * Every entry used to carry its own render function with a literal colour baked in
 * (`color="text-[#00f5a0]" glow="rgba(0,245,160,0.3)"`). Those hexes are the *legacy Lumina Neon*
 * palette, so the icon set was permanently pinned to one colorway's temperament: #00f5a0 sits at
 * OKLCH L=0.855 and measures 1.14:1 on Carbon Dimmed's plane — invisible. That is also why this
 * file sat on the codemod DENYLIST: there was no way to retint it without eighteen hand edits.
 *
 * Identity now lives in `hue`, not in a hex. `src/theme/icons.js` re-renders that hue at the ACTIVE
 * colorway's chroma and lightness, and `AppIcon` draws it. You can still find Music by its purple;
 * it is simply as muted as Carbon wants it, or as loud as the legacy neon wants it.
 *
 * ── Fields ────────────────────────────────────────────────────────────────────────────────────
 *
 *   glyph      Lucide component (or `mono` for a text mark, which Terminal uses)
 *   hue        OKLCH hue angle 0–360. Identity. See the spacing note below.
 *   legacyHex  the exact colour this app rendered before SDL — used ONLY by the "Lumina Neon"
 *              icon theme, so choosing it reproduces the old dock byte for byte
 *   badge      a small pulsing dot overlay (Resume advertises itself)
 *
 * ── Hue spacing ───────────────────────────────────────────────────────────────────────────────
 *
 * The old palette had five apps on the same purple and three on the same green, which is a real
 * wayfinding loss: colour is the fastest way to hit a dock target. These eighteen are spread around
 * the wheel with a ~13° minimum gap, kept near each app's historical hue wherever it had a distinct
 * one (Files stays amber at 80°, Resume stays pink at 352°, Browser stays cyan at 216°).
 */
export const APPS = [
  // --- CORE SYSTEM APPS ---
  {
    id: 'files',
    title: 'Files',
    glyph: HardDrive,
    hue: 80,            // amber — was #ffc86b
    legacyHex: '#ffc86b',
    pinned: true,
    featured: true,
  },
  {
    id: 'terminal',
    title: 'Terminal',
    // A text mark rather than a Lucide glyph. It used to be a bare div in
    // `text-os-onSurfaceVariant`, which meant Terminal was the one app that participated in no icon
    // theme at all; routing it through `mono` keeps the character and gains the theming.
    mono: '>_',
    hue: 234,           // steel — the neutral app, so a low-temperature blue
    legacyHex: '#a3aac4',
    featured: true,
    pinned: true,
  },
  {
    id: 'aichat',
    title: IS_PUTER_SHELL ? 'Lumina Assistant' : 'Lumina AI',
    glyph: Brain,
    hue: 316,           // violet — was os-primary
    legacyHex: '#cc97ff',
    featured: true,
    pinned: true,
  },
  {
    id: 'settings',
    title: 'Settings',
    glyph: SettingsIcon,
    hue: 200,           // teal — was #9effc8
    legacyHex: '#9effc8',
    pinned: true,
  },

  // --- PORTFOLIO APPS (Conditional) ---
  ...(!IS_PUTER_SHELL ? [
    {
      id: 'about',
      title: 'About Me',
      glyph: User,
      hue: 16,          // rose — was os-primary, one of five apps sharing it
      legacyHex: '#cc97ff',
      featured: true,
      pinned: false,
    },
    // NOTE — `cv` (Resume) and `skills` used to be declared here, `cv` even pinned and badged.
    // Neither has ever had an implementing component: WindowContentRenderer has no case for either,
    // so both fell through to `default: return null` and opened an empty, undismissable-looking
    // window from the dock. They are removed rather than stubbed because the repo holds no resume
    // or skills DATA to render, and inventing a career history is not a decision code should make.
    // Re-add both entries (and the matching cases) once real content exists.
    {
      id: 'projects',
      title: 'Projects',
      glyph: Code,
      hue: 252,         // azure — was os-secondary
      legacyHex: '#00d2fd',
      featured: true,
      pinned: true,
    },
    {
      id: 'mail',
      title: 'Mail',
      glyph: Mail,
      hue: 160,         // spring green — closest to its historical #00f5a0
      legacyHex: '#00f5a0',
    },
  ] : []),

  // --- PRODUCTIVITY & APPS ---
  {
    id: 'games',
    title: 'Game Center',
    glyph: Gamepad2,
    hue: 332,           // magenta — was os-tertiary green
    legacyHex: '#00f5a0',
    pinned: true,
  },
  {
    id: 'music',
    title: 'Music',
    glyph: Music,
    hue: 300,           // purple — was os-primary, and the one that keeps it
    legacyHex: '#cc97ff',
    pinned: true,
  },
  {
    id: 'browser',
    title: 'Flow-Net',
    glyph: Globe,
    hue: 216,           // cyan — was #00d2fd
    legacyHex: '#00d2fd',
  },
  {
    id: 'chat',
    title: 'Guestbook',
    glyph: MessageSquare,
    hue: 56,            // orange — warm, social
    legacyHex: '#cc97ff',
  },
  {
    id: 'retroarcade',
    title: 'Retro Arcade',
    // Was a second Gamepad2, identical to Game Center in both glyph AND colour — two dock targets
    // you could not tell apart.
    glyph: Joystick,
    hue: 34,            // vermilion
    legacyHex: '#cc97ff',
  },
  {
    id: 'notepad',
    title: 'Notepad',
    glyph: FileText,
    hue: 122,           // leaf — was cyan-400, which collided with Flow-Net
    legacyHex: '#22d3ee',
  },
  {
    id: 'taskmanager',
    title: 'Monitor',
    glyph: Activity,
    hue: 176,           // teal-green
    legacyHex: '#cc97ff',
  },
  {
    id: 'achievements',
    title: 'Honors',
    glyph: Trophy,
    hue: 96,            // gold — was yellow-400
    legacyHex: '#facc15',
  },
  {
    id: 'documentation',
    title: 'Docs',
    glyph: Book,
    hue: 272,           // indigo — was #9effc8, which collided with Settings
    legacyHex: '#9effc8',
  },
];

/** Lookup used by the dock, launcher and desktop; ids are unique by construction. */
export const APP_BY_ID = Object.fromEntries(APPS.map((a) => [a.id, a]));
