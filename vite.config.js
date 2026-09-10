import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import compression from 'vite-plugin-compression'

// Kept identical to netlify.toml and vercel.json. Served in dev and preview too so a
// policy that breaks the app fails here rather than only in production — which is exactly what
// happened: this header set applies to EVERY response, including public/games/<slug>/index.html,
// and `frame-ancestors 'none'` on those made the sandboxed game frames fail to load with
// ERR_BLOCKED_BY_RESPONSE. 'self' still blocks another origin from framing the portfolio.
const CSP = "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.puter.com https://cdn.emulatorjs.org https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; media-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' blob: data: https: wss:; worker-src 'self' blob:; child-src 'self' blob: https:; frame-src 'self' blob: https:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Brotli compression for production
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
    }),
    // Gzip fallback
    compression({
      algorithm: 'gzip',
      ext: '.gz',
    }),
  ],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Content-Security-Policy': CSP,
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Content-Security-Policy': CSP,
    },
  },
  build: {
    rollupOptions: {
      output: {
        /**
         * Chunk by PACKAGE NAME, and only for packages that are genuinely on the critical path.
         *
         * The previous version tested `id.includes('react')` first against a full module path, so
         * `react-syntax-highlighter`, `react-arborist`, `react-window`, `react-dnd`,
         * `react-markdown` and `@react-three/fiber` all matched and were assigned to
         * `vendor-react`. React itself lives in that chunk, so the entry depends on it, so the
         * whole chunk loaded on first paint — dragging 640 KB of three.js bindings and a syntax
         * highlighter along with it, past the React.lazy boundaries in WindowContentRenderer that
         * were already splitting them correctly.
         *
         * The `vendor` catch-all failed the same way from the other side: it merged `motion-dom`
         * (eager, via framer-motion in App.jsx) with `three` (2,028 KB) and `refractor` (959 KB).
         * One eager member is enough to make the entire chunk eager.
         *
         * So: name only what is actually eager, and let everything else fall through to Rollup's
         * own splitting, which respects the dynamic imports. Measured effect of this plus the
         * lucide barrel fix and the QuantumWidget lazy boundary: first-paint JS went from ~662 KB
         * to ~150 KB brotli.
         */
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          const match = id.split('node_modules/').pop().match(/^(@[^/]+\/[^/]+|[^/]+)/);
          const pkg = match && match[1];

          if (pkg === 'react' || pkg === 'react-dom' || pkg === 'scheduler') return 'vendor-react';
          // The shell's own chrome: motion, icons and the context menu all render before any window does.
          if (pkg === 'framer-motion' || pkg === 'motion-dom' || pkg === 'motion-utils'
            || pkg === 'lucide-react' || pkg === 'react-contexify') return 'vendor-ui';
          if (pkg === 'zustand' || pkg === 'clsx' || pkg === 'tailwind-merge') return 'vendor-utils';

          // Everything else — three, refractor, arborist, webcontainer, the markdown stack — is
          // reachable only through a lazy boundary. Naming a chunk for it here would pull it back
          // onto first paint, which is the bug this comment exists to prevent recurring.
        },
      },
    },
    target: 'esnext',
    minify: 'oxc',
    sourcemap: false,
    assetsInlineLimit: 4096,
  },
})
