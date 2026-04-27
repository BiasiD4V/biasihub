import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // BUILD_BASE='/obras/' no Capacitor, './' no Electron
  base: process.env.BUILD_BASE || './',
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5175,
    open: false
  }
})
