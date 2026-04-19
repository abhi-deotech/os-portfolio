export const createAiSlice = (set, get) => ({
  aiWorker: null,
  isAiReady: false,
  isAiLoading: false,

  initAi: () => {
    if (get().aiWorker) return;

    set({ isAiLoading: true });
    const worker = new Worker(new URL('../../workers/aiWorker.js', import.meta.url), {
      type: 'module'
    });

    worker.onmessage = (e) => {
      const { type, error } = e.data;
      if (type === 'ready') {
        set({ isAiReady: true, isAiLoading: false });
      } else if (type === 'error') {
        console.error('AI Worker Error:', error);
        set({ isAiLoading: false });
      }
    };

    worker.postMessage({ type: 'init' });
    set({ aiWorker: worker });
  },

  getEmbedding: (text) => {
    return new Promise((resolve, reject) => {
      const worker = get().aiWorker;
      if (!worker) {
        get().initAi();
        reject('AI initializing...');
        return;
      }

      const handler = (e) => {
        if (e.data.type === 'embedding') {
          worker.removeEventListener('message', handler);
          resolve(e.data.embedding);
        }
      };

      worker.addEventListener('message', handler);
      worker.postMessage({ type: 'embed', text });
    });
  }
});
