import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 8080,
    host: '0.0.0.0',   // listen on all interfaces so HR office can reach it
    strictPort: false,  // fall back to next available port if 8080 is taken
    proxy: {
      '/api': {
        target: 'http://10.201.1.214:3001',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 8080,
    host: '0.0.0.0',
    strictPort: true,
  },
})
