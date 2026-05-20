import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.js.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Aumentamos el límite de advertencia a 1600 KB
    chunkSizeWarningLimit: 1600,
  }
})