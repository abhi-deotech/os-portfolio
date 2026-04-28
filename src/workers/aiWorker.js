import { pipeline, env } from '@huggingface/transformers';

// Skip local model check and use remote CDN to avoid bloating the build
env.allowLocalModels = false;

let extractor = null;

self.onmessage = async (e) => {
  const { type, text, data } = e.data;

  if (type === 'init') {
    try {
      if (!extractor) {
        // Use WebGPU if available for 2026 performance standards
        extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
          device: 'webgpu',
        });
      }
      self.postMessage({ type: 'ready' });
    } catch (error) {
      console.warn('WebGPU not available, falling back to WASM/CPU:', error.message);
      try {
        extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        self.postMessage({ type: 'ready' });
      } catch (fallbackError) {
        self.postMessage({ type: 'error', error: fallbackError.message });
      }
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
