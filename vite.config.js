import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Vite config specifically for Web Deploy (Vercel)
export default defineConfig({
  root: 'src/renderer',
  build: {
    outDir: '../../dist-web',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@renderer': resolve(__dirname, 'src/renderer/src')
    }
  },
  plugins: [react()]
})
