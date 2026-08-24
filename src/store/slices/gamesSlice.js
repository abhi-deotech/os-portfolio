import { get as idbGet, set as idbSet, del as idbDel, createStore } from 'idb-keyval';

/**
 * Storage for sideloaded games.
 *
 * Payloads live in their OWN idb-keyval store, deliberately not in the `os-settings` key the
 * zustand persist middleware writes. A sideloaded game is up to 2 MB of HTML; putting it in the
 * persisted state blob would mean re-serializing every megabyte on every unrelated settings
 * write — changing the wallpaper would rewrite the games.
 *
 * Only the small metadata record goes through zustand (~200 bytes each), so the launcher can
 * render the tiles synchronously without awaiting IndexedDB.
 */
const payloadStore = createStore('lumina-games', 'payloads');

export const MAX_SIDELOAD_BYTES = 2 * 1024 * 1024;

export const getGamePayload = (id) => idbGet(id, payloadStore);
const putGamePayload = (id, html) => idbSet(id, html, payloadStore);
const dropGamePayload = (id) => idbDel(id, payloadStore);

/** Ids are minted, never taken from user input, so they cannot collide with a builtin id. */
const mintId = () => {
  const rand = crypto.getRandomValues(new Uint8Array(8));
  return 'user:' + Array.from(rand, (b) => b.toString(16).padStart(2, '0')).join('');
};

export const createGamesSlice = (set, get) => ({
  /**
   * Metadata for sideloaded games: { id, title, addedAt, bytes }.
   * The HTML itself is in the payload store above, keyed by the same id.
   */
  userGames: [],

  /** Per-game stats surfaced in the launcher. Play counts only; bests live in useHighScore. */
  gameStats: {},

  recordGamePlayed: (gameId) =>
    set((state) => {
      const prev = state.gameStats[gameId] || { plays: 0 };
      return { gameStats: { ...state.gameStats, [gameId]: { ...prev, plays: prev.plays + 1 } } };
    }),

  /**
   * @param {{title: string, html: string}} input
   * @returns {Promise<{ok: true, id: string} | {ok: false, error: string}>}
   */
  addUserGame: async ({ title, html }) => {
    const bytes = new Blob([html]).size;
    if (bytes > MAX_SIDELOAD_BYTES) {
      return { ok: false, error: `That file is ${(bytes / 1048576).toFixed(1)} MB. The limit is 2 MB.` };
    }
    if (!/<\s*(html|body|canvas|script|div)/i.test(html)) {
      return { ok: false, error: 'That does not look like an HTML document.' };
    }

    const id = mintId();
    try {
      await putGamePayload(id, html);
    } catch {
      return { ok: false, error: 'Could not save the game. Your browser may be out of storage.' };
    }

    const clean = String(title || 'Untitled').trim().slice(0, 48) || 'Untitled';
    set((state) => ({
      userGames: [...state.userGames, { id, title: clean, addedAt: new Date().toISOString(), bytes }],
    }));
    return { ok: true, id };
  },

  removeUserGame: async (id) => {
    // The payload is dropped first: a metadata record with no payload renders a broken tile,
    // whereas an orphaned payload is merely dead bytes nobody can reach.
    try { await dropGamePayload(id); } catch { /* nothing to do if it was already gone */ }
    set((state) => ({ userGames: state.userGames.filter((g) => g.id !== id) }));
    const { closeWindow } = get();
    closeWindow?.(id);
  },
});
