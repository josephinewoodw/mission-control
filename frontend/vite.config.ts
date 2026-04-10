import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 4200,
    proxy: {
      '/api': {
        target: 'http://localhost:4981',
        changeOrigin: true,
      },
      '/analytics': {
        target: 'http://localhost:4982',
        changeOrigin: true,
      },
    },
  },
})
