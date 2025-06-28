import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'url'
import { loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [vue()],
    root: 'src',
    build: {
      outDir: '../dist'
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    optimizeDeps: {
      include: ['vue', 'vue-router']
    },
    define: {
      // Expose env variables to the client
      'process.env.VITE_FACTORY_ADDRESS': JSON.stringify(env.VITE_FACTORY_ADDRESS)
    }
  }
}) 