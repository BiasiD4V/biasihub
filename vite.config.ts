import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync } from 'fs'

const buildVersion = Date.now().toString();

export default defineConfig({
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
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  }
})
