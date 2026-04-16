import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import compression from 'vite-plugin-compression'

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
    minify: 'esbuild',
    sourcemap: false,
    assetsInlineLimit: 4096,
  },
})
