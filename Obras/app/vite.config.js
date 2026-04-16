import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',  // necessário para Electron (caminhos relativos nos assets)
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5175,
    open: false
  }
})
