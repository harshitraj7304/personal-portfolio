import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Split heavy, rarely-changing vendor code out of the main bundle.
    rollupOptions: {
      output: {
        manualChunks: {
          motion: ['framer-motion'],
          router: ['react-router-dom'],
        },
      },
    },
  },
})
