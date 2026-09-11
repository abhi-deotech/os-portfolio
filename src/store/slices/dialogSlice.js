/**
 * System dialogs — the OS's own replacement for `window.alert` / `confirm` / `prompt`.
 *
 * The public API is NOT this slice, it is `src/utils/dialog.js`. Everything here exists to give
 * that API a queue the shell can render and a promise it can settle.
 *
 * Two design points worth stating, because both were the obvious-but-wrong option first:
 *
 * 1. **Resolvers live at module scope, never in the store.** A resolver is a live continuation
 *    bound to one caller's `await`. Store state goes through zustand's `persist` middleware and
 *    ends up structured-cloned into IndexedDB, where a function cannot survive — and a resolver
 *    that came back from disk would be pointing at a call site from a previous session anyway.
 *    `dialogs` is deliberately absent from `partialize` in osStore.js for the same reason: a modal
 *    that outlives a reload is a modal nobody asked for.
 *
 * 2. **The spec is plain data.** Icons are string keys resolved by the component, not component
 *    references, and validation is a `required` flag rather than a callback. That keeps every
 *    dialog inspectable in devtools and keeps React out of the calling code — which is what lets a
 *    store slice or the terminal raise one without importing a component.
 */

// Monotonic. The queue length is not a unique id: it goes back down, and two dialogs raised either
// side of a resolve would collide on both the React key and the resolver map. (Same failure the
// toast queue hit — see the note on `toastSeq` in systemSlice.js.)
let dialogSeq = 0;

const resolvers = new Map();

export const createDialogSlice = (set) => ({
  /** Front of the queue is the oldest; the shell renders the LAST one and stacks the rest behind. */
  dialogs: [],

  /**
   * Queue a dialog and hand back a promise for its outcome.
   * Prefer the wrappers in src/utils/dialog.js — they carry the defaults and the return contract.
   */
  requestDialog: (spec) =>
    new Promise((resolve) => {
      const id = `dialog-${(dialogSeq += 1)}`;
      resolvers.set(id, resolve);
      set((state) => ({ dialogs: [...state.dialogs, { ...spec, id }] }));
    }),

  /** Settle one dialog and drop it. Safe to call twice — the second call is a no-op. */
  resolveDialog: (id, value) => {
    const resolve = resolvers.get(id);
    if (!resolve) return;
    resolvers.delete(id);
    set((state) => ({ dialogs: state.dialogs.filter((d) => d.id !== id) }));
    resolve(value);
  },
});
