import { pipeline, env } from '@huggingface/transformers';

// Skip local model check and use remote CDN to avoid bloating the build
env.allowLocalModels = false;

const MODEL = 'Xenova/all-MiniLM-L6-v2';

/**
 * Tell ONNX Runtime how many WASM threads it may use.
 *
 * Left unset, ORT picks the count itself (`onnxruntime-web`, `ort.wasm.bundle.min.mjs`):
 *
 *   !crossOriginIsolated  ->  1
 *   crossOriginIsolated   ->  Math.min(4, Math.ceil(cores / 2))
 *
 * That ceiling is the thing worth changing. It binds from eight cores upward — a 16-core machine
 * still gets four threads — and ORT applies it whether or not the host can do better.
 *
 * This app NO LONGER satisfies the isolation precondition. COOP `same-origin` + COEP
 * `credentialless` used to be served everywhere, but COEP made every cross-origin iframe fail on
 * Firefox and Safari — the in-OS browser could not open a single URL — so the headers were removed
 * (see `vite.config.js` for the full account). `SharedArrayBuffer` is therefore absent and the
 * branch below settles on one thread; the ceiling this function exists to raise only binds if
 * isolation ever returns. WebGPU, when present, is unaffected and remains the fast path.
 *
 * We leave one core for the main thread and stop at eight. MiniLM is a small model, and past that
 * point thread synchronisation costs more than the extra parallelism returns.
 *
 * @returns {number|null} threads configured, or null if the ONNX backend was not reachable
 */
function configureWasmThreads() {
  // `env.backends.onnx` is a shallow spread of ORT's own env, so `.wasm` is the *same object* ORT
  // reads at session-create time — mutating it here is what makes this take effect.
  const wasm = env.backends?.onnx?.wasm;
  if (!wasm) return null;

  if (!self.crossOriginIsolated) {
    // Threaded WASM needs SharedArrayBuffer, which isolation gates. ORT would fall back to 1 on
    // its own; setting it explicitly means the number we report is the number that ran.
    wasm.numThreads = 1;
    return 1;
  }

  const cores = navigator.hardwareConcurrency || 4;
  wasm.numThreads = Math.max(1, Math.min(cores - 1, 8));
  return wasm.numThreads;
}

/**
 * Ask for a real adapter before committing to the WebGPU device.
 *
 * The previous version passed `device: 'webgpu'` and caught the throw. That works, but on every
 * machine without WebGPU it pays for a failed pipeline build before starting the real one. A
 * `requestAdapter()` probe costs nothing and answers the same question up front.
 */
async function hasWebGpuAdapter() {
  if (!navigator.gpu) return false;
  try {
    return !!(await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' }));
  } catch {
    return false;
  }
}

let extractor = null;
let backend = null;
let initPromise = null;

async function buildPipeline() {
  const threads = configureWasmThreads();
  const cores = navigator.hardwareConcurrency || null;

  if (await hasWebGpuAdapter()) {
    try {
      extractor = await pipeline('feature-extraction', MODEL, { device: 'webgpu' });
      return { device: 'webgpu', threads: null, cores };
    } catch (error) {
      // An adapter exists but this model did not build on it — a shader or dtype problem, not a
      // missing GPU. Worth distinguishing from "no WebGPU here", so it keeps its own message.
      console.warn('WebGPU adapter present but the pipeline failed to build:', error.message);
    }
  }

  extractor = await pipeline('feature-extraction', MODEL, { device: 'wasm' });
  return { device: 'wasm', threads, cores };
}

self.onmessage = async (e) => {
  const { type, text } = e.data;

  if (type === 'init') {
    try {
      // Guard the promise, not the extractor: two `init` messages arriving before the first
      // resolves would otherwise both see `extractor === null` and build two pipelines.
      initPromise ??= buildPipeline();
      backend = await initPromise;
      self.postMessage({ type: 'ready', ...backend });
    } catch (error) {
      initPromise = null;
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
