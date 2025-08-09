/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')
  
  // For GitHub Pages, we need to set the base URL to the repository name
  // For custom domain, we can use '/' as the base
  const isGitHubPages = process.env.NODE_ENV === 'production' && 
    process.env.GITHUB_ACTIONS === 'true';
  
  return {
    base: isGitHubPages ? '/notable_frontend/' : '/',
    plugins: [
      react(),
      legacy()
    ],
    server: {
      host: true, // Listen on all network interfaces
      port: 3000, // Default port, change if needed
      strictPort: true,
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        port: 3000
      },
      historyApiFallback: {
        index: '/index.html',
        disableDotRule: true,
        htmlAcceptHeaders: ['text/html', 'application/xhtml+xml']
      },
      proxy: {
        // Proxy API requests if needed
        '/api': {
          target: 'https://your-api-endpoint.com',
          changeOrigin: true,
          secure: false,
        }
      }
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            ionic: ['@ionic/react', '@ionic/react-router'],
          },
        },
      },
    },
    define: {
      // Provide a fallback for process.env
      'process.env': {}
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
    }
  }
})
