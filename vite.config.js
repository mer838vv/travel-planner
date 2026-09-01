import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// На GitHub Pages приложение живёт не в корне домена, а в /travel-planner/,
// поэтому base задаётся переменной BASE_PATH при сборке для деплоя.
// Локально (npm run dev) остаётся '/'.
const base = process.env.BASE_PATH || '/'

// Метка сборки: показывается в приложении, чтобы одним взглядом понять,
// свежая версия открыта или из кеша. Без неё «обновилось или нет» —
// гадание, что уже один раз стоило потерянного вечера.
const buildStamp = new Date().toISOString().slice(0, 16).replace('T', ' ')

// https://vite.dev/config/
export default defineConfig({
  base,
  define: {
    __BUILD_STAMP__: JSON.stringify(buildStamp),
  },
  plugins: [
    react(),
    VitePWA({
      // Регистрируем service worker сами (src/pwa.js): штатный скрипт умеет
      // только поставить новую версию, но не перезагрузить открытую
      // страницу — на айфоне из-за этого намертво висела первая версия.
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: ['icon.svg'],
      manifest: {
        // id фиксирует тождество приложения: без него браузер опознаёт PWA
        // по start_url, и смена адреса выглядела бы как новое приложение.
        id: base,
        lang: 'ru',
        name: 'Travel Planner',
        short_name: 'Travel',
        description: 'Личный планировщик поездок: маршруты, билеты, сборы, бюджет',
        theme_color: '#2f6bff',
        background_color: '#eaf0fb',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        // PNG обязательны: часть браузеров не считает приложение
        // устанавливаемым, пока нет растровых 192 и 512.
        //
        // maskable вынесен отдельной записью и нарисован с полями. Раньше
        // на одной иконке стояло purpose 'any maskable' — Android режет
        // такую под форму своей темы и срезал булавку по краям.
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        // Новая версия обязана активироваться немедленно, не дожидаясь, пока
        // закроются все вкладки. Без этого устройство, на котором уже стоит
        // старый service worker, ждало бы обновления бесконечно: старая
        // страница не умеет дать команду новой версии активироваться.
        skipWaiting: true,
        clientsClaim: true,
        // Старые кеши предыдущих сборок не должны копиться на устройстве.
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallback: `${base}index.html`.replace('//', '/'),
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              // Неделя, не месяц: тайл, испорченный при записи (например,
              // VPN подсунул заглушку вместо картинки), из CacheFirst сам
              // не уйдёт — он лежит до истечения срока. Чем короче срок,
              // тем быстрее карта чинится сама.
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            // Поиск мест и погода — сеть в приоритете, но последний ответ
            // остаётся в кеше, чтобы в самолёте/роуминге не было пустого экрана.
            urlPattern: /^https:\/\/(nominatim\.openstreetmap\.org|api\.open-meteo\.com)\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'travel-api',
              // Без таймаута NetworkFirst ждёт сеть сколько угодно. VPN
              // часто не обрывает соединение, а молча его держит — запрос
              // висел вечно, и до кеша дело не доходило: погода не
              // появлялась вовсе, поиск места замирал без объяснений.
              // Пять секунд — и отдаём последний известный ответ.
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
    }),
  ],
})
