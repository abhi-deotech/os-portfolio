import { useCallback, useState } from 'react';

const KEY = 'lumina-game-stats';

/**
 * Legacy keys, each written by a different game with a different convention.
 *
 * `2048-best-score` and `snake-high-score` held higher-is-better numbers as strings, and
 * `memory-best-moves` held a lower-is-better count that was initialised to the STRING '--' and
 * compared with `>`. Reading them back without Number() meant comparisons like `'900' > '1024'`
 * evaluating true, because that is string ordering.
 */
const LEGACY = [
  ['snake-high-score', 'snake', 'max'],
  ['2048-best-score', '2048', 'max'],
  ['memory-best-moves', 'memory', 'min'],
];

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    const stats = raw ? JSON.parse(raw) : {};

    // One-time migration, so nobody loses a score they earned before this refactor. The legacy
    // keys are removed once folded in, so this runs at most once per browser.
    let migrated = false;
    for (const [legacyKey, gameId, dir] of LEGACY) {
      const legacy = localStorage.getItem(legacyKey);
      if (legacy === null) continue;
      const n = Number(legacy);
      if (Number.isFinite(n) && n > 0) {
        const cur = stats[gameId];
        if (cur == null || (dir === 'max' ? n > cur : n < cur)) stats[gameId] = n;
        migrated = true;
      }
      localStorage.removeItem(legacyKey);
    }
    if (migrated) localStorage.setItem(KEY, JSON.stringify(stats));
    return stats;
  } catch {
    return {};
  }
}

/**
 * Persisted personal best for one game.
 *
 * @param {string} gameId              registry id, used as the storage key
 * @param {'max'|'min'} [direction]    'min' for games where lower is better (Memory's move count)
 * @returns {[number|null, (v: number) => boolean]} the best so far, and a submit function that
 *          returns true when the value became the new best
 */
export default function useHighScore(gameId, direction = 'max') {
  const [best, setBest] = useState(() => {
    const v = readAll()[gameId];
    return Number.isFinite(v) ? v : null;
  });

  /**
   * The comparison reads the STORED value rather than React state or a mirrored ref.
   *
   * That matters for two reasons. Reading `best` from state would need it in the dependency
   * array, rebuilding the callback on every new record; and doing the comparison inside a
   * `setBest` updater would put it on StrictMode's double-invocation path, where the second pass
   * compares against the value the first pass already wrote and reports a genuine record as
   * "not a best". localStorage is synchronously readable and is the durable source of truth, so
   * it settles the question without either hazard.
   */
  const submit = useCallback((value) => {
    if (!Number.isFinite(value)) return false;
    try {
      const stats = readAll();
      const prev = stats[gameId];
      const isBest = !Number.isFinite(prev) || (direction === 'max' ? value > prev : value < prev);
      if (!isBest) return false;
      stats[gameId] = value;
      localStorage.setItem(KEY, JSON.stringify(stats));
      setBest(value);
      return true;
    } catch {
      // Private mode or quota exhaustion. Still reflect it in the session so the player sees
      // their run acknowledged; it simply will not survive a reload.
      setBest((prev) => (prev == null || (direction === 'max' ? value > prev : value < prev) ? value : prev));
      return true;
    }
  }, [gameId, direction]);

  return [best, submit];
}
