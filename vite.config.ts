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
  
  // For GitHub Pages, we'll use the repository name as the base path
  // For the custom domain, we'll use root
  const base = isGitHubPages ? '/notable_frontend/' : '/';
  
  return {
    base,
    plugins: [
      react(),
      legacy()
    ],
    server: {
      host: true, // Listen on all network interfaces
      port: 3000, // Default port, change if needed
      strictPort: true,
      open: true, // Open browser on server start
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        port: 3000
      },
      // Ensure proper handling of SPA routes
      fs: {
        strict: false // Allow serving files outside of root
      },
      // Handle SPA fallback
      historyApiFallback: {
        index: '/index.html',
        disableDotRule: true,
        htmlAcceptHeaders: ['text/html', 'application/xhtml+xml'],
        rewrites: [
          { from: /^\/app/, to: '/index.html' },
          { from: /./, to: '/index.html' }
        ]
      },
      // Proxy configuration for development
      proxy: {
        // Proxy API requests if needed
        '/api': {
          target: 'http://localhost:5000', // Update this to your API URL
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      sourcemap: false,
      rollupOptions: {
        output: {
          // Ensure consistent hashing for better caching
          assetFileNames: 'assets/[name].[hash].[ext]',
          chunkFileNames: 'assets/[name].[hash].js',
          entryFileNames: 'assets/[name].[hash].js',
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            ionic: ['@ionic/react', '@ionic/react-router'],
            vendor: ['@auth0/auth0-react'],
          },
        },
      },
      // Ensure the build includes all necessary files
      manifest: true,
      // Minify the output
      minify: 'terser',
      // Enable gzip compression
      reportCompressedSize: true,
      // Source maps are disabled for production
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
