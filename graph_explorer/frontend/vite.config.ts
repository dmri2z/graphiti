import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.BACKEND_INTERNAL_URL || 'http://localhost:8001',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: true, // bind 0.0.0.0 so Railway's proxy can reach the container
    port: Number(process.env.PORT) || 4173, // honor Railway-injected $PORT
    allowedHosts: true, // accept the *.up.railway.app Host header
    proxy: {
      // Forward /api to the backend over Railway's private network so the
      // browser only ever hits this app's own public origin (no CORS, backend
      // stays private). Set BACKEND_INTERNAL_URL to the backend's
      // *.railway.internal address; defaults to local backend for `npm run preview`.
      '/api': {
        target: process.env.BACKEND_INTERNAL_URL || 'http://localhost:8001',
        changeOrigin: true,
      },
    },
  },
});
