import { pipeline, env } from '@xenova/transformers';

// Skip local model check and use remote CDN to avoid bloating the build
env.allowLocalModels = false;

let extractor = null;

self.onmessage = async (e) => {
  const { type, text, data } = e.data;

  if (type === 'init') {
    try {
      if (!extractor) {
        extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      }
      self.postMessage({ type: 'ready' });
    } catch (error) {
      self.postMessage({ type: 'error', error: error.message });
    }
  }

  if (type === 'embed') {
    if (!extractor) {
      self.postMessage({ type: 'error', error: 'AI not initialized' });
      return;
    }
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    self.postMessage({ type: 'embedding', embedding: Array.from(output.data) });
  }
};
