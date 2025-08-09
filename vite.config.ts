/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    base: '/',  // Using root path for custom domain
    plugins: [
      react(),
      legacy()
    ],
    define: {
      // Provide a fallback for process.env
      'process.env': {}
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
    },
    // Add server configuration
    server: {
      host: true, // Listen on all network interfaces
      port: 3000, // Default port, change if needed
      strictPort: true,
      hmr: {
        protocol: 'ws',
        host: 'localhost'
      }
    }
  }
})
