import { WINDOW_SESSION_RESET } from './windowSlice';
import { closeAllPopouts } from '../../utils/popout.js';

export const createAuthSlice = (set) => ({
  isAuthenticated: false,
  userRole: 'admin', // 'admin' | 'guest'
  
  login: (role = 'admin') => set({ isAuthenticated: true, userRole: role }),
  
  logout: () => {
    set({ 
    ...WINDOW_SESSION_RESET,
    isAuthenticated: false, 
    openWindows: [], 
    activeWindow: null, 
    isControlCenterOpen: false, 
    isAppLauncherOpen: false, 
    isSpotlightOpen: false, 
    isDragging: false,
    achievementQueue: [],
    userRole: 'admin' 
    });
    // Popped-out windows close after the reset, never inside it.
    closeAllPopouts();
  },
});
