import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/lorawan-weather-network/', // Requis pour GitHub Pages
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Allow connections from outside the container
    port: 5173,      // Default Vite port
  }
})
