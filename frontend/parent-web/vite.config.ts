import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: {
    host: true, // 绑全接口(含 127.0.0.1)，避免默认只绑 ::1 导致浏览器走 IPv4 时"拒绝访问"
    port: 5173,
    proxy: {
      '/api': { target: 'https://localhost:44394', changeOrigin: true, secure: false },
      '/connect': { target: 'https://localhost:44394', changeOrigin: true, secure: false },
    },
  },
})
