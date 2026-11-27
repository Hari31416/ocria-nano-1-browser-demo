import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // relative asset paths so the build works under any GitHub Pages sub-path
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  worker: { format: 'es' },
  // the wasm-bindgen glue resolves its .wasm via import.meta.url; keep it un-prebundled
  optimizeDeps: { exclude: ['@llamaindex/liteparse-wasm'] },
})
