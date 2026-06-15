import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// On Railway, default to the backend service private URL.
// Set BACKEND_INTERNAL_URL in Railway frontend service env to override.
const onRailway = Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID);
const backendTarget =
  process.env.BACKEND_INTERNAL_URL ||
  (onRailway ? 'http://backend.railway.internal:8000' : 'http://localhost:8001');

const apiProxy = {
  '/api': { target: backendTarget, changeOrigin: true },
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: apiProxy,
  },
  preview: {
    host: true,
    port: Number(process.env.PORT) || 4173,
    allowedHosts: true,
    proxy: apiProxy,
  },
});
