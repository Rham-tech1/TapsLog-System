import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mkcert from 'vite-plugin-mkcert';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    mkcert(), // Automatically generates trusted local HTTPS certificates
  ],
  server: {
    host: true, // Exposes server to local network (e.g., https://192.168.x.x:5173)
    port: 5173,
    https: true, // Strictly required for Web NFC on mobile Android Chrome
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});