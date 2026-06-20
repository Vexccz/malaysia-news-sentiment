import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { boneyardPlugin } from 'boneyard-js/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    boneyardPlugin()
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Split heavy vendor libs into separate cacheable chunks
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-router')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/firebase/')) {
            if (id.includes('/auth')) return 'vendor-firebase-auth';
            if (id.includes('/analytics') || id.includes('/ai')) return 'vendor-firebase-lazy';
            return 'vendor-firebase-core';
          }
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
            return 'vendor-recharts';
          }
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-framer';
          }
          if (id.includes('node_modules/@coreui')) {
            return 'vendor-coreui';
          }
          if (id.includes('node_modules/@tanstack')) {
            return 'vendor-query';
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.js',
    css: true,
  },
})
