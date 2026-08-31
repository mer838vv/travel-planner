import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// На GitHub Pages приложение живёт не в корне домена, а в /travel-planner/,
// поэтому base задаётся переменной BASE_PATH при сборке для деплоя.
// Локально (npm run dev) остаётся '/'.
const base = process.env.BASE_PATH || '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Travel Planner',
        short_name: 'Travel',
        description: 'Личный планировщик поездок: маршруты, билеты, сборы, бюджет',
        theme_color: '#2563eb',
        background_color: '#0b0e14',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallback: `${base}index.html`.replace('//', '/'),
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Поиск мест и погода — сеть в приоритете, но последний ответ
            // остаётся в кеше, чтобы в самолёте/роуминге не было пустого экрана.
            urlPattern: /^https:\/\/(nominatim\.openstreetmap\.org|api\.open-meteo\.com)\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'travel-api',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
    }),
  ],
})
