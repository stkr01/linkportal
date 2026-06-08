import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxar /api till backend (port 4000) under utveckling.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
