import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import compression from 'vite-plugin-compression'
import musicManifest from './plugins/musicManifest'

// MP3s (and cover images) are already compressed — recompressing wastes build time
const compressionFilter = /\.(js|mjs|json|css|html|svg)$/i

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    musicManifest(),
    // Brotli compression for production
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
      filter: compressionFilter,
    }),
    // Gzip fallback
    compression({
      algorithm: 'gzip',
      ext: '.gz',
      filter: compressionFilter,
    }),
  ],
  // COOP/COEP intentionally omitted: they broke the YouTube IFrame API's
  // postMessage handshake in Firefox (the "ready" event never fired), which
  // silently killed all YouTube playback. The only feature that wanted them
  // (@webcontainer/api, wired to the unfinished `node`/`npm` terminal
  // commands) already fails gracefully without cross-origin isolation.
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
