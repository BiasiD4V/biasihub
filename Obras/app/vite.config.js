import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['logo-icone.svg', 'biasi-icon.png', 'pwa-icon.svg'],
      manifest: {
        name: 'BiasíHub — Obras',
        short_name: 'Obras',
        description: 'Gestão de obras — Biasi Engenharia',
        theme_color: '#1e2a5e',
        background_color: '#1e2a5e',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'pt-BR',
        icons: [
          { src: 'pwa-icon.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
          { src: 'pwa-icon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
          { src: 'pwa-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/vzaabtzcilyoknksvhrc\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'supabase-cache', expiration: { maxEntries: 50, maxAgeSeconds: 3600 } },
          },
        ],
      },
    }),
  ],
  base: './',  // necessário para Electron (caminhos relativos nos assets)
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5175,
    open: false
  }
})
