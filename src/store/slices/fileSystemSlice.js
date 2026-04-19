import { DEFAULT_FILE_SYSTEM } from '../../data/fileSystem';

export const createFileSystemSlice = (set, get) => ({
  fileSystem: DEFAULT_FILE_SYSTEM,
  recentFiles: [],
  activeNotepadFile: null,
  activeDocFile: null,
  activeMediaFile: null,
  activePhotoFile: null,
  activeMusicFile: null,
  activeRetroGame: null,
  isSyncing: false,
  lastSyncTime: null,
  syncError: null,
  mountedHandles: {}, // { id: handle }

  setFileSystem: (tree) => set({ fileSystem: tree }),
  
  createFolder: (name, parentId = null) =>
    set((state) => {
      const newFolder = { id: `folder-${Date.now()}`, name, children: [] };
      if (!parentId) return { fileSystem: [...state.fileSystem, newFolder] };
      
      const addToParent = (nodes) =>
        nodes.map((n) => {
          if (n.id === parentId) return { ...n, children: [...(n.children || []), newFolder] };
          if (n.children) return { ...n, children: addToParent(n.children) };
          return n;
        });
      return { fileSystem: addToParent(state.fileSystem) };
    }),

  createFile: (name, content = '', parentId = null) =>
    set((state) => {
      const newFile = { id: `file-${Date.now()}`, name, content };
      if (!parentId) return { fileSystem: [...state.fileSystem, newFile] };
      
      const addToParent = (nodes) =>
        nodes.map((n) => {
          if (n.id === parentId) return { ...n, children: [...(n.children || []), newFile] };
          if (n.children) return { ...n, children: addToParent(n.children) };
          return n;
        });
      return { fileSystem: addToParent(state.fileSystem) };
    }),

  moveNode: (id, parentId, index = 0) =>
    set((state) => {
      let movedNode = null;
      
      const removeFromTree = (nodes) => {
        const filtered = [];
        for (const node of nodes) {
          if (node.id === id) {
            movedNode = node;
            continue;
          }
          if (node.children) {
            filtered.push({ ...node, children: removeFromTree(node.children) });
          } else {
            filtered.push(node);
          }
        }
        return filtered;
      };

      const treeWithoutNode = removeFromTree(state.fileSystem);
      if (!movedNode) return state;

      const addToTree = (nodes) => {
        if (!parentId) {
          const newRoot = [...nodes];
          newRoot.splice(index, 0, movedNode);
          return newRoot;
        }

        return nodes.map((node) => {
          if (node.id === parentId) {
            const newChildren = [...(node.children || [])];
            newChildren.splice(index, 0, movedNode);
            return { ...node, children: newChildren };
          }
          if (node.children) {
            return { ...node, children: addToTree(node.children) };
          }
          return node;
        });
      };

      return { fileSystem: addToTree(treeWithoutNode) };
    }),

  deleteNode: (id) =>
    set((state) => {
      const removeNode = (nodes) =>
        nodes
          .filter((n) => n.id !== id)
          .map((n) => ({
            ...n,
            children: n.children ? removeNode(n.children) : undefined,
          }));
      return { fileSystem: removeNode(state.fileSystem) };
    }),

  renameNode: (id, newName) =>
    set((state) => {
      const renameInTree = (nodes) =>
        nodes.map((n) => {
          if (n.id === id) return { ...n, name: newName };
          if (n.children) return { ...n, children: renameInTree(n.children) };
          return n;
        });
      return { fileSystem: renameInTree(state.fileSystem) };
    }),

  updateFileContent: (fileId, content) =>
    set((state) => {
      const updateInTree = (nodes) =>
        nodes.map((n) => {
          if (n.id === fileId) return { ...n, content };
          if (n.children) return { ...n, children: updateInTree(n.children) };
          return n;
        });
      return { fileSystem: updateInTree(state.fileSystem) };
    }),

  trackRecentFile: (fileId) => 
    set((state) => {
      const filtered = (state.recentFiles || []).filter(id => id !== fileId);
      return { recentFiles: [fileId, ...filtered].slice(0, 10) };
    }),

  resetFileSystem: () => set({ fileSystem: DEFAULT_FILE_SYSTEM }),

  setIsSyncing: (isSyncing) => set({ isSyncing }),
  setLastSyncTime: (lastSyncTime) => set({ lastSyncTime }),
  setSyncError: (syncError) => set({ syncError }),

  syncDocumentation: (files) =>
    set((state) => {
      const updateFileContent = (nodes) =>
        nodes.map((n) => {
          if (n.children) {
            return { ...n, children: updateFileContent(n.children) };
          }
          const fileToUpdate = files.find(f => f.id === n.id);
          if (fileToUpdate) {
            return { ...n, content: fileToUpdate.content };
          }
          return n;
        });

      return {
        fileSystem: updateFileContent(state.fileSystem),
        lastSyncTime: Date.now(),
        syncError: null
      };
    }),

  getFilteredFileSystem: () => {
    const state = get();
    if (state.userRole === 'admin') return state.fileSystem;
    return state.fileSystem.map(node => {
      if (node.name === 'Documents') {
        return { ...node, children: node.children.filter(c => !c.name.includes('Resume')) };
      }
      return node;
    });
  },

  findNodeById: (id, nodes = null) => {
    const state = get();
    const tree = nodes || state.fileSystem;
    for (const node of tree) {
      if (node.id === id) return node;
      if (node.children) {
        const found = state.findNodeById(id, node.children);
        if (found) return found;
      }
    }
    return null;
  },

  getPathFromId: (id) => {
    const state = get();
    const findPath = (targetId, nodes, path = []) => {
      for (const node of nodes) {
        const currentPath = [...path, node.name];
        if (node.id === targetId) return currentPath;
        if (node.children) {
          const subPath = findPath(targetId, node.children, currentPath);
          if (subPath) return subPath;
        }
      }
      return null;
    };
    return findPath(id, state.fileSystem);
  },

  searchFiles: (query) => {
    if (!query || query.length < 2) return [];
    const state = get();
    const results = [];
    const search = (nodes, path = []) => {
      nodes.forEach(node => {
        const currentPath = [...path, node.name];
        if (node.name.toLowerCase().includes(query.toLowerCase())) {
          results.push({ ...node, path: currentPath });
        }
        if (node.children) search(node.children, currentPath);
      });
    };
    search(state.fileSystem);
    return results;
  },

  mountPhysicalFolder: async (handle) => {
    const { id, name } = { id: `mounted-${Date.now()}`, name: handle.name };
    const newFolder = { id, name, children: [], isMounted: true };
    
    set((state) => ({
      fileSystem: [...state.fileSystem, newFolder],
      mountedHandles: { ...state.mountedHandles, [id]: handle }
    }));

    // Recursive function to map handles to virtual nodes
    const mapHandle = async (parentHandle) => {
      const children = [];
      for await (const entry of parentHandle.values()) {
        if (entry.kind === 'directory') {
          children.push({
            id: `mounted-${Math.random()}`,
            name: entry.name,
            children: await mapHandle(entry),
            isMounted: true
          });
        } else {
          children.push({
            id: `mounted-${Math.random()}`,
            name: entry.name,
            isMounted: true,
            handle: entry // Store handle for direct access
          });
        }
      }
      return children;
    };

    const children = await mapHandle(handle);
    set((state) => {
      const updateTree = (nodes) => nodes.map(n => n.id === id ? { ...n, children } : n);
      return { fileSystem: updateTree(state.fileSystem) };
    });
  }
});
