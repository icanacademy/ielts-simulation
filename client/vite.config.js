import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), basicSsl()],
  server: {
    host: true, // Allow external connections via IP
    port: 1375,
    allowedHosts: ['ielts.icanacademy.work'],
    https: true, // Enable HTTPS for microphone access from other devices
    proxy: {
      '/api': {
        target: 'http://localhost:5002',
        changeOrigin: true,
        timeout: 300000, // 5 minutes for full reading test generation (3 passages)
        proxyTimeout: 300000
      }
    }
  }
})
