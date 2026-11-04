import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'Notice-Fartlek-Pro.pdf', 'maj-partage.js', 'maj-partage-qr.js'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,pdf}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'polices', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } }
          }
        ]
      },
      manifest: {
        name: 'Fartlek Pro by C. Guilhem',
        short_name: 'Fartlek Pro',
        description: "Évaluation du fartlek en EPS (Bac GT et Bac Pro) : observation sur piste, fiches, notes",
        theme_color: '#0F2E4C',
        background_color: '#0B1420',
        display: 'standalone',
        start_url: '/',
        lang: 'fr',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ]
})
