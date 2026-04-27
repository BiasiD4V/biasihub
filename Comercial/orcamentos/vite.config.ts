import { writeFileSync } from 'fs';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const buildVersion = Date.now().toString();

export default defineConfig({
  // BUILD_BASE='/comercial/' no Capacitor (Mobile), './' no Electron (Desktop)
  base: process.env.BUILD_BASE || './',
  plugins: [
    react(),
    {
      name: 'version-file',
      buildStart() {
        writeFileSync('public/version.json', JSON.stringify({ v: buildVersion }));
      },
    },
  ],
  define: {
    __BUILD_VERSION__: JSON.stringify(buildVersion),
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  server: {
    port: 5174,
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
