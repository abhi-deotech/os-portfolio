/**
 * Capability positions — the prose half of the capability registry: each vendor's standards position,
 * the MDN link, what Lumina does instead, and any caveat, keyed by registry id.
 *
 * Kept apart from registry.js so the first paint (facts.js → support.js → registry.js) never carries
 * vendor reasons, links or sentences. Only notice.js, the lazy Compatibility pane and the harness
 * import this module.
 *
 * PURE: no React, no store, no `import.meta.env`. Plain Node imports this (scripts/capabilities-check.mjs).
 *
 * Entry shape (per registry id):
 *   vendor     { mozilla?: { stance, reason, url? }, webkit?: { stance, reason, url? } }
 *              Mozilla stances: negative | positive | neutral | defer | none
 *              WebKit stances:  oppose | support | neutral | blocked | concerns | not-implementing | none
 *              `url` is omitted only where the vendor has no recorded issue.
 *   links      { mdn }
 *   instead    one sentence, no browser names: what Lumina does instead
 *   caveat?    no browser names (harness-enforced)
 *   nonStandard?  true when no vendor has a standards position to cite
 *   verifiedOn
 */

export const VERIFIED_ON = '2026-09-17';

// Literals only, and nothing at module scope is a call, so the bundler can drop what nothing reads.
const WEBKIT_NOT_IMPLEMENTING = 'https://webkit.org/tracking-prevention/#anti-fingerprinting';
const WEBKIT_HELD_BACK = 'held back over fingerprinting, security and other concerns';

export const POSITIONS = {
  /* ── Files & storage ─────────────────────────────────────────────────────────────────────── */
  fileSystemAccess: {
    vendor: {
      mozilla: { stance: 'negative', reason: 'the security risk of giving sites write access to local files', url: 'https://github.com/mozilla/standards-positions/issues/154' },
      webkit: { stance: 'oppose', reason: 'security concerns about sites reading and writing local files', url: 'https://github.com/WebKit/standards-positions/issues/28' },
    },
    links: { mdn: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker' },
    instead: 'Lumina Cloud keeps your files in site storage instead.',
    verifiedOn: VERIFIED_ON,
  },
  storageEstimate: {
    vendor: {},
    links: { mdn: 'https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/estimate' },
    instead: 'Storage figures are left out rather than estimated.',
    verifiedOn: VERIFIED_ON,
  },
  persistentStorage: {
    vendor: {},
    links: { mdn: 'https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist' },
    instead: 'Your files stay in site storage, which may be cleared when the device runs low on space.',
    verifiedOn: VERIFIED_ON,
  },

  /* ── System facts ────────────────────────────────────────────────────────────────────────── */
  computePressure: {
    vendor: {
      mozilla: { stance: 'none', reason: 'no position recorded yet', url: 'https://github.com/mozilla/standards-positions/issues/521' },
      webkit: { stance: 'oppose', reason: 'privacy and device-independence concerns', url: 'https://github.com/WebKit/standards-positions/issues/255' },
    },
    links: { mdn: 'https://developer.mozilla.org/en-US/docs/Web/API/Compute_Pressure_API' },
    instead: 'CPU load is labelled as not exposed rather than invented.',
    verifiedOn: VERIFIED_ON,
  },
  battery: {
    vendor: {
      mozilla: {
        stance: 'negative',
        reason: 'fingerprinting risk, which led to its removal in version 52',
        url: 'https://bugzilla.mozilla.org/show_bug.cgi?id=1313580',
      },
      webkit: { stance: 'not-implementing', reason: WEBKIT_HELD_BACK, url: WEBKIT_NOT_IMPLEMENTING },
    },
    links: { mdn: 'https://developer.mozilla.org/en-US/docs/Web/API/Battery_Status_API' },
    instead: 'Battery details are left out rather than guessed.',
    verifiedOn: VERIFIED_ON,
  },
  performanceMemory: {
    caveat: 'Deprecated and non-standard, so the figures are coarse.',
    // Non-standard: no vendor has a standards position on it to cite.
    nonStandard: true,
    vendor: {},
    links: { mdn: 'https://developer.mozilla.org/en-US/docs/Web/API/Performance/memory' },
    instead: 'Heap size is labelled as not exposed rather than invented.',
    verifiedOn: VERIFIED_ON,
  },
  deviceMemory: {
    vendor: {
      mozilla: { stance: 'none', reason: 'no position recorded' },
      webkit: { stance: 'oppose', reason: 'privacy concerns about fingerprinting', url: 'https://github.com/WebKit/standards-positions/issues/645' },
    },
    links: { mdn: 'https://developer.mozilla.org/en-US/docs/Web/API/Navigator/deviceMemory' },
    instead: 'Memory class is labelled as not exposed rather than invented.',
    verifiedOn: VERIFIED_ON,
  },
  uaClientHints: {
    vendor: {
      mozilla: { stance: 'neutral', reason: 'mixed benefits against fingerprinting', url: 'https://github.com/mozilla/standards-positions/issues/202' },
      webkit: { stance: 'blocked', reason: 'interoperability and privacy concerns', url: 'https://github.com/WebKit/standards-positions/issues/70' },
    },
    links: { mdn: 'https://developer.mozilla.org/en-US/docs/Web/API/User-Agent_Client_Hints_API' },
    instead: 'The OS family is read from the user-agent string and labelled as such.',
    verifiedOn: VERIFIED_ON,
  },
  networkInformation: {
    caveat: 'Speed and latency are coarse estimates; the connection type is rarely reported.',
    vendor: {
      mozilla: { stance: 'negative', reason: 'the privacy risk of exposing network details', url: 'https://github.com/mozilla/standards-positions/issues/117' },
      webkit: { stance: 'not-implementing', reason: WEBKIT_HELD_BACK, url: WEBKIT_NOT_IMPLEMENTING },
    },
    links: { mdn: 'https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API' },
    instead: 'Only online or offline is shown.',
    verifiedOn: VERIFIED_ON,
  },
  webgpu: {
    caveat: 'Adapter access varies by OS and GPU.',
    vendor: {},
    links: { mdn: 'https://developer.mozilla.org/en-US/docs/Web/API/GPUAdapter/info' },
    instead: 'The GPU is described from WebGL where that is available.',
    verifiedOn: VERIFIED_ON,
  },

  /* ── Media & sharing ─────────────────────────────────────────────────────────────────────── */
  mediaSession: {
    caveat: 'Embedded players may answer media keys themselves.',
    vendor: {},
    links: { mdn: 'https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API' },
    instead: 'Use the on-screen playback controls.',
    verifiedOn: VERIFIED_ON,
  },
  wakeLock: {
    vendor: {},
    links: { mdn: 'https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API' },
    instead: 'The screen follows your system sleep settings during playback.',
    verifiedOn: VERIFIED_ON,
  },
  webShare: {
    vendor: {
      mozilla: { stance: 'none', reason: 'desktop support is still behind a preference', url: 'https://github.com/mozilla/standards-positions/issues/27' },
    },
    links: { mdn: 'https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share' },
    instead: 'Download and Copy link do the same job.',
    verifiedOn: VERIFIED_ON,
  },
  webShareFiles: {
    vendor: {
      mozilla: { stance: 'none', reason: 'desktop support is still behind a preference', url: 'https://github.com/mozilla/standards-positions/issues/27' },
    },
    links: { mdn: 'https://developer.mozilla.org/en-US/docs/Web/API/Navigator/canShare' },
    instead: 'The note is shared as text, or downloaded.',
    verifiedOn: VERIFIED_ON,
  },

  /* ── Windows & input ─────────────────────────────────────────────────────────────────────── */
  fullscreen: {
    caveat: 'On iOS, only iPad supports it.',
    vendor: {},
    links: { mdn: 'https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API' },
    instead: 'Lumina stays inside the browser window.',
    verifiedOn: VERIFIED_ON,
  },
  idleDetection: {
    vendor: {
      mozilla: { stance: 'negative', reason: 'the surveillance risk of revealing when people are away', url: 'https://github.com/mozilla/standards-positions/issues/453' },
      webkit: { stance: 'not-implementing', reason: WEBKIT_HELD_BACK, url: WEBKIT_NOT_IMPLEMENTING },
    },
    links: { mdn: 'https://developer.mozilla.org/en-US/docs/Web/API/Idle_Detection_API' },
    instead: 'The screensaver starts after 2 minutes without activity in this page.',
    verifiedOn: VERIFIED_ON,
  },
  keyboardLock: {
    vendor: {
      mozilla: { stance: 'negative', reason: 'an API design that makes clear signals to the user hard', url: 'https://github.com/mozilla/standards-positions/issues/196' },
      webkit: { stance: 'concerns', reason: 'security, accessibility and API design', url: 'https://github.com/WebKit/standards-positions/issues/182' },
    },
    links: { mdn: 'https://developer.mozilla.org/en-US/docs/Web/API/Keyboard/lock' },
    instead: 'Esc and app switching will leave immersive mode.',
    verifiedOn: VERIFIED_ON,
  },
  documentPip: {
    vendor: {
      mozilla: { stance: 'positive', reason: 'device-independence concerns noted', url: 'https://github.com/mozilla/standards-positions/issues/670' },
      webkit: { stance: 'concerns', reason: 'usability, portability and annoyance', url: 'https://github.com/WebKit/standards-positions/issues/41' },
    },
    links: { mdn: 'https://developer.mozilla.org/en-US/docs/Web/API/Document_Picture-in-Picture_API' },
    instead: 'Windows pop out as a regular popup that does not stay on top.',
    verifiedOn: VERIFIED_ON,
  },
  windowManagement: {
    vendor: {
      mozilla: { stance: 'none', reason: 'no position recorded yet', url: 'https://github.com/mozilla/standards-positions/issues/542' },
      webkit: { stance: 'concerns', reason: 'privacy and annoyance', url: 'https://github.com/WebKit/standards-positions/issues/117' },
    },
    links: { mdn: 'https://developer.mozilla.org/en-US/docs/Web/API/Window_Management_API' },
    instead: 'Pop-outs open on the current screen.',
    verifiedOn: VERIFIED_ON,
  },
};

/** The positions entry for registry id `id`, or undefined. */
export const getPositions = (id) => (Object.hasOwn(POSITIONS, id) ? POSITIONS[id] : undefined);
