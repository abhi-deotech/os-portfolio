import { CalendarCheck, Zap, Layers, ShoppingCart, Bot } from 'lucide-react';

/**
 * The project registry — the single source of truth for the Projects app.
 *
 * This file exists because the six entries it replaces were fiction. `Projects.jsx` shipped
 * Nexus-X Engine, Neural-Link Chat, Cyber-Vault Mobile, Quantum Analytics and Aether Design
 * System with GitHub links to repositories that do not exist, demo links to domains that do not
 * resolve (`nexus.dev`, `vault.dev`, `stats.quantum.dev`), and hand-written star/fork counts.
 * The Projects app is the one surface in this OS whose entire job is to be true, so every field
 * below is checkable and was checked:
 *
 *   - `demo` is a URL that returned 200 and carries no `X-Frame-Options` / CSP `frame-ancestors`,
 *     i.e. it actually survives being framed by Flow-Net. Anything that only *probably* embeds
 *     belongs in the browser's bookmark bar, not on a Live button.
 *   - `github` is present only when the repository is public. The client work lives under the
 *     private `SolutionsDeotech` org, where a Code button would 404 on a visitor — so those
 *     entries omit the field and the card widens the Live button over the gap.
 *   - `period` is read off `git log` in each repository, not estimated.
 *
 * ── No colour field, deliberately ──────────────────────────────────────────────────────────────
 *
 * Unlike `games.js` and `apps.jsx`, entries here carry neither a `hue` nor a hex. A card's accent
 * is its slot in the ACTIVE colorway's categorical series (`viz.cat`), because five peer cards
 * that must be told apart is exactly the categorical case — see the note above `seriesColor` in
 * `Projects.jsx`. `viz.cat` carries exactly five colours on every SDL colorway, so the five
 * projects map onto it 1:1 with no wrap. Adding a sixth means the sixth wraps to slot 0; that is
 * survivable, but prefer replacing over appending.
 *
 * Keeping literal colour out is also what keeps this file off `scripts/denylist.mjs` — `apps.jsx`
 * is exempted there only for its `legacyHex` brand fields.
 *
 * ── Fields ─────────────────────────────────────────────────────────────────────────────────────
 *
 *   id          stable key; also the filter/search identity
 *   title       display name
 *   description what it is and what it's made of, in the project's own terms
 *   tags        stack, most-load-bearing first
 *   category    drives the filter chips — keep the set small, it renders as a row
 *   icon        Lucide component
 *   period      from `git log --reverse` to `git log -1` in the project's repo
 *   demo        optional — a verified frameable URL. Opens INSIDE Flow-Net, not a new tab.
 *   github      optional — public repositories only
 *   status      optional — set only when neither link exists, so the card has something honest
 *               to say instead of two dead buttons
 *   featured    surfaces the "Featured" pill
 */
export const PROJECTS = [
  {
    id: 'workleisure',
    title: 'WorkLeisure',
    description:
      'Booking and membership platform for restaurants doubling as workspaces. Express/MongoDB API with Socket.IO and scheduled jobs, a React 18 portal serving six distinct user roles, and a Flutter wrapper for mobile — covering bookings, payments, wallets, subscriptions, events, referrals and promo codes.',
    tags: ['React 18', 'Node.js', 'MongoDB', 'Socket.IO', 'Flutter'],
    category: 'Platform',
    icon: CalendarCheck,
    period: '2024 — present',
    demo: 'https://www.workleisure.in',
    featured: true,
  },
  {
    id: 'winndo',
    title: 'Winndo',
    description:
      'B2B commerce for the electrical-products trade. One Express/Mongoose backend with S3-backed media and JWT auth feeds three separate React front-ends — a retailer storefront, an admin console, and a seller/brand portal — each on Redux Toolkit.',
    tags: ['React', 'Express', 'MongoDB', 'Redux Toolkit', 'AWS S3'],
    category: 'Commerce',
    icon: Zap,
    period: '2025 — 2026',
    demo: 'https://www.winndo.com',
    featured: true,
  },
  {
    id: 'lumina-os',
    title: 'Lumina OS',
    description:
      "The portfolio you're reading this in. A desktop environment in the browser: window manager, virtual file system, terminal, and a theme engine of sixteen colorways that swaps every role at once — light and dark — without a component ever naming a colour.",
    tags: ['React 19', 'Zustand', 'Framer Motion', 'Tailwind', 'Vite'],
    category: 'Systems',
    icon: Layers,
    period: '2026 — present',
    github: 'https://github.com/abhi-deotech/os-portfolio',
    featured: true,
  },
  {
    id: 'tribecart',
    title: 'TribeCart',
    description:
      'E-commerce built the way the large ones actually are: a pnpm/Turbo monorepo where three Next.js apps (customer, seller, admin) sit over five Go microservices — users, products, orders, payments, and the gateway that fronts them — talking gRPC through shared protobuf contracts.',
    tags: ['Next.js', 'Go', 'gRPC', 'PostgreSQL', 'Turborepo'],
    category: 'Commerce',
    icon: ShoppingCart,
    period: '2026',
    github: 'https://github.com/abhi-deotech/TribeCart',
  },
  {
    id: 'discord-engine',
    title: 'Discord Engine',
    description:
      'A gateway bot and a Next.js dashboard that share exactly three things: one config schema, one permission decision, one database. Handlers take plain data and return plain data, so discord.js is confined to a single adapter directory and every feature is testable without a mock.',
    tags: ['TypeScript', 'discord.js', 'Next.js', 'Drizzle', 'PostgreSQL'],
    category: 'Systems',
    icon: Bot,
    period: '2026',
    status: 'In active development',
  },
];

export const PROJECT_BY_ID = Object.fromEntries(PROJECTS.map((p) => [p.id, p]));

/** Filter chips. 'All' is synthesized first; the rest follow registry order, deduped. */
export const PROJECT_CATEGORIES = ['All', ...new Set(PROJECTS.map((p) => p.category))];

/**
 * The footer counters used to read "Total Deployments 24 / GitHub Commits 1.2K+ / Happy Clients
 * 15" — three numbers with no source that could never be checked and never went stale, because
 * nothing tied them to reality. These derive from the registry, so they cannot disagree with the
 * cards above them.
 */
export const PROJECT_TOTALS = {
  live: PROJECTS.filter((p) => p.demo).length,
  openSource: PROJECTS.filter((p) => p.github).length,
  technologies: new Set(PROJECTS.flatMap((p) => p.tags)).size,
};
