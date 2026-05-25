import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@supabase'))   return 'supabase'
            if (id.includes('recharts'))    return 'charts'
            if (id.includes('react'))       return 'vendor'
            return 'deps'
          }
        }
      }
    }
  }
})
