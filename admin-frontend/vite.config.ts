import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig(() => {
  return {
    base: '/admin/',
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, 'src'),
      },
    },
    build: {
      outDir: path.resolve(import.meta.dirname, '../dist-admin'),
      emptyOutDir: true,
    },
    server: {
      port: 3001,
      host: '0.0.0.0',
      hmr: false as const,
      ws: false as const,
      watch: {
        ignored: [
          '**/database/**',
          '**/backend/database/**',
          '**/auth_info_baileys/**',
          '**/backend/auth_info_baileys/**',
          '**/*.log',
        ],
      },
      proxy: {
        '/api': {
          target: process.env.VITE_BACKEND_URL || 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
