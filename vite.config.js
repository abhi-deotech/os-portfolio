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
        // Using function syntax for manualChunks to avoid potential "not a function" errors
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('framer-motion') || id.includes('lucide-react') || id.includes('react-contexify') || id.includes('react-arborist')) {
              return 'vendor-ui';
            }
            if (id.includes('zustand') || id.includes('clsx') || id.includes('tailwind-merge')) {
              return 'vendor-utils';
            }
            if (id.includes('react-markdown') || id.includes('react-syntax-highlighter') || id.includes('remark-gfm')) {
              return 'vendor-markdown';
            }
            return 'vendor'; // all other node_modules
          }
        },
      },
    },
    target: 'esnext',
    minify: 'oxc',
    sourcemap: false,
    assetsInlineLimit: 4096,
  },
})
