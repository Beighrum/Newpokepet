import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    // Ensure DOMPurify works in production builds
    global: 'globalThis',
  },
  build: {
    // Ensure DOMPurify is properly bundled
    rollupOptions: {
      external: [],
      output: {
        globals: {}
      }
    },
    // Enable source maps for debugging
    sourcemap: true,
    // Optimize for modern browsers
    target: 'es2020'
  },
  server: {
    port: 3000,
    host: true
  },
  preview: {
    port: 3000,
    host: true
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true
  }
})