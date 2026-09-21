import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const configureProxy = (proxy) => {
  proxy.on('error', (err) => {
    if (err.code === 'ECONNRESET' || err.code === 'ECONNABORTED' || err.code === 'EPIPE') return;
    console.warn('[Vite Proxy Warning]:', err.message);
  });
  proxy.on('proxyReqWs', (_proxyReq, _req, socket) => {
    socket.on('error', (err) => {
      if (err.code === 'ECONNRESET' || err.code === 'ECONNABORTED' || err.code === 'EPIPE') return;
      console.warn('[Vite WS Socket Warning]:', err.message);
    });
  });
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    cors: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
        headers: {
          'ngrok-skip-browser-warning': '69420'
        },
        configure: configureProxy
      },
      '/socket.io': {
        target: 'http://127.0.0.1:5000',
        ws: true,
        changeOrigin: true,
        configure: configureProxy
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    cors: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
        configure: configureProxy
      },
      '/socket.io': {
        target: 'http://127.0.0.1:5000',
        ws: true,
        changeOrigin: true,
        configure: configureProxy
      }
    }
  }
})
