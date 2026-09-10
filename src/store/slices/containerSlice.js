/**
 * `@webcontainer/api` is imported lazily, inside `bootContainer`.
 *
 * osStore composes this slice at module scope, and App.jsx imports the store, so a top-level
 * `import { WebContainer }` put 46 KB of source on first paint for every visitor — including the
 * overwhelming majority who never open the terminal, let alone boot a container. Deferring it to
 * the one function that actually needs it costs a single `await` on a path that was already async
 * and already the slowest thing in the app.
 */
export const createContainerSlice = (set, get) => ({
  webContainerInstance: null,
  isBooting: false,
  containerStatus: 'idle', // idle, booting, ready, error

  bootContainer: async () => {
    if (get().webContainerInstance) return;
    
    set({ isBooting: true, containerStatus: 'booting' });
    try {
      const { WebContainer } = await import('@webcontainer/api');
      const instance = await WebContainer.boot();
      set({ webContainerInstance: instance, containerStatus: 'ready', isBooting: false });
      return instance;
    } catch (error) {
      console.error('WebContainer boot failed:', error);
      set({ containerStatus: 'error', isBooting: false });
      throw error;
    }
  },

  runCommand: async (command, args = []) => {
    const instance = get().webContainerInstance;
    if (!instance) {
      await get().bootContainer();
    }
    
    const freshInstance = get().webContainerInstance;
    const process = await freshInstance.spawn(command, args);
    
    return process;
  }
});
