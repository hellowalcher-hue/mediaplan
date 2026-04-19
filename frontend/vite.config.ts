import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Проксируем /api на локальный PHP-сервер при разработке
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: '../public_html',   // деплой прямо в public_html на reg.ru
    emptyOutDir: true,
  }
})
