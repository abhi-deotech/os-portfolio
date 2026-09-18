/**
 * What the browser says about the GPU. PURE: no React, no store, no `import.meta.env`; plain Node
 * imports this. facts.js loads it with a dynamic `import()` so it stays out of the entry chunk.
 *
 *   probeGpu({ win, nav, doc }) → { source: 'reported' | 'masked' | 'none', text, detail }
 *
 * Order: WebGPU `adapter.info` (+ a few limits) → WebGL renderer string → nothing. A browser may
 * withhold or genericise every one of these for fingerprinting reasons, so an empty or placeholder
 * answer is reported as MASKED, never replaced with a guess.
 */

/** Renderer strings that name no GPU: the browser answered, but on purpose said nothing. */
const MASKED_RENDERERS = new Set(['', 'apple gpu', 'mozilla', 'generic renderer', 'webkit webgl']);

const clean = (s) => (typeof s === 'string' ? s.trim() : '');

/**
 * Identify an adapter without building anything on it. `adapter.info` is the current shape;
 * `requestAdapterInfo()` was the earlier one. Every field may be an empty string.
 *
 * @returns {Promise<{ vendor: string, architecture: string, description: string }>}
 */
export async function describeAdapter(adapter) {
  let info = {};
  try {
    info = adapter?.info ?? (await adapter?.requestAdapterInfo?.()) ?? {};
  } catch {
    info = {};
  }
  return {
    vendor: clean(info.vendor),
    architecture: clean(info.architecture),
    description: clean(info.description) || clean(info.device),
  };
}

/** "NVIDIA GeForce RTX 4070", or "nvidia · ampere" when only vendor and architecture are given. */
const adapterText = (d) => d.description || [d.vendor, d.architecture].filter(Boolean).join(' · ');

function readWebGL(doc) {
  if (typeof doc?.createElement !== 'function') return null;
  let gl = null;
  try {
    const canvas = doc.createElement('canvas');
    gl = canvas?.getContext?.('webgl') ?? canvas?.getContext?.('experimental-webgl') ?? null;
    if (!gl) return null;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    return clean(renderer);
  } catch {
    return null;
  } finally {
    // Release the context now: browsers cap live WebGL contexts, and this one has served its purpose.
    try { gl?.getExtension?.('WEBGL_lose_context')?.loseContext?.(); } catch { /* already gone */ }
  }
}

export async function probeGpu({ win, nav, doc } = {}) {
  let adapterMasked = false;
  if (typeof nav?.gpu?.requestAdapter === 'function') {
    try {
      const adapter = await nav.gpu.requestAdapter();
      if (adapter) {
        const d = await describeAdapter(adapter);
        const text = adapterText(d);
        if (text) {
          const limits = adapter.limits
            ? { maxTextureDimension2D: adapter.limits.maxTextureDimension2D, maxBufferSize: adapter.limits.maxBufferSize }
            : undefined;
          return { source: 'reported', text, detail: { api: 'WebGPU', ...d, limits } };
        }
        adapterMasked = true;
      }
    } catch {
      /* no adapter: fall through to WebGL */
    }
  }

  const renderer = readWebGL(doc ?? win?.document);
  if (renderer === null) {
    return adapterMasked ? { source: 'masked', text: '', detail: { api: 'WebGPU' } } : { source: 'none', text: '', detail: undefined };
  }
  if (MASKED_RENDERERS.has(renderer.toLowerCase())) {
    return { source: 'masked', text: '', detail: { api: 'WebGL', renderer } };
  }
  return { source: 'reported', text: renderer, detail: { api: 'WebGL', renderer } };
}
