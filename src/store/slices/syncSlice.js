import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';

export const createSyncSlice = (set) => {
  // Initialize Y.Doc and Provider
  const doc = new Y.Doc();
  // Use your own Render-hosted signaling server, fallback to public
  const signalingServers = import.meta.env.VITE_SIGNALING_SERVER
    ? [import.meta.env.VITE_SIGNALING_SERVER]
    : ['wss://signaling.yjs.dev'];

  const provider = new WebrtcProvider('lumina-os-shared-v1', doc, {
    signaling: signalingServers,
  });

  const sharedWindows = doc.getMap('windows');
  const sharedNotes = doc.getText('notes');
  const awareness = provider.awareness;

  // Set initial awareness state
  const randomName = `Guest_${Math.floor(Math.random() * 1000)}`;
  const randomColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`;

  awareness.setLocalStateField('user', {
    name: randomName,
    color: randomColor,
    cursor: null
  });

  // Observe changes to shared state
  sharedWindows.observe(() => {
    // Logic to sync back to Zustand if needed
    // For now, we'll use sharedWindows directly in components
  });

  return {
    syncDoc: doc,
    syncProvider: provider,
    sharedWindows,
    sharedNotes,
    awareness,
    remoteUsers: [],

    updateCursor: (pos) => {
      const user = awareness.getLocalState().user;
      awareness.setLocalStateField('user', { ...user, cursor: pos });
    },

    setRemoteUsers: (users) => set({ remoteUsers: users }),
  };
};
