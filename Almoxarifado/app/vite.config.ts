import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
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
    // VitePWA({
    //   registerType: 'prompt',
    //   includeAssets: ['logo-biasi.svg', 'logo-biasi.png', 'pwa-icon.svg'],
    //   manifest: {
    //     name: 'BiasíHub — Almoxarifado',
    //     short_name: 'Almoxarifado',
    //     description: 'Gestão de almoxarifado e frota — Biasi Engenharia',
    //     theme_color: '#1e2a5e',
    //     background_color: '#1e2a5e',
    //     display: 'standalone',
    //     start_url: '/',
    //     icons: [
    //       { src: 'pwa-icon.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
    //       { src: 'pwa-icon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
    //       { src: 'pwa-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    //     ],
    //   },
    //   workbox: {
    //     globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    //     runtimeCaching: [
    //       {
    //         urlPattern: /^https:\/\/vzaabtzcilyoknksvhrc\.supabase\.co\/.*/i,
    //         handler: 'NetworkFirst',
    //         options: { cacheName: 'supabase-cache', expiration: { maxEntries: 50, maxAgeSeconds: 3600 } },
    //       },
    //     ],
    //   },
    // }),
  ],
  define: { __BUILD_VERSION__: JSON.stringify(buildVersion) },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          charts: ['recharts'],
        },
      },
    },
  },
  server: {
    port: 5175,
    proxy: {
      '/api': { target: 'http://localhost:3003', changeOrigin: true },
    },
  },
})
