import { WebContainer } from '@webcontainer/api';

export const createContainerSlice = (set, get) => ({
  webContainerInstance: null,
  isBooting: false,
  containerStatus: 'idle', // idle, booting, ready, error

  bootContainer: async () => {
    if (get().webContainerInstance) return;
    
    set({ isBooting: true, containerStatus: 'booting' });
    try {
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
