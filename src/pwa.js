import { registerSW } from 'virtual:pwa-register'

/**
 * Обновление приложения на устройстве.
 *
 * История проблемы: со штатным autoUpdate новая версия молча ставилась в
 * кеш, но открытая страница не перезагружалась. На айфоне хуже — PWA,
 * запущенное с экрана «Домой», не проверяет обновления при возврате из
 * фона. В результате на телефоне неделями висела первая версия, хотя на
 * сервере лежала новая.
 *
 * Здесь две половины решения:
 *   1. service worker собран со skipWaiting + clientsClaim — новая версия
 *      активируется сразу и сама перехватывает управление. Это важно для
 *      устройств, где уже стоит старый service worker: старая страница не
 *      умеет скомандовать новой версии активироваться, так что ждать
 *      команды от неё нельзя.
 *   2. Здесь ловится момент перехвата и делается перезагрузка — иначе на
 *      экране осталась бы старая разметка поверх нового кеша.
 */

const CHECK_INTERVAL_MS = 60_000

/** Сколько подтверждение обязано побыть на экране до перезагрузки. */
const MIN_TOAST_MS = 700

/**
 * Аварийный сброс: снять service worker, стереть все кеши и перезагрузиться
 * начисто.
 *
 * Нужен потому, что автообновление выше чинит нормальный случай, но не
 * спасает, когда в кеше уже лежит испорченное — так было при включённом
 * VPN. До этой кнопки единственным выходом было снести иконку с домашнего
 * экрана и поставить приложение заново.
 *
 * Данные поездок это не трогает: они в IndexedDB, а не в Cache Storage.
 *
 * Про `location.reload(true)`: аргумент из старых руководств современные
 * браузеры игнорируют — принудительной перезагрузки он не даёт. Поэтому
 * index.html сначала перезапрашивается с `cache: 'reload'`, что обновляет
 * и HTTP-кеш (на GitHub Pages страница отдаётся с max-age=600, то есть без
 * этого до десяти минут могла бы вернуться прежняя копия и кнопка
 * выглядела бы сломанной), и только потом идёт обычный reload.
 */
export async function resetAppCache() {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((r) => r.unregister()))
  }

  if ('caches' in window) {
    const keys = await caches.keys()
    await Promise.all(keys.map((k) => caches.delete(k)))
  }

  // Офлайн этот запрос не удастся — тогда просто перезагружаемся тем, что
  // есть, а не застреваем на кнопке.
  await fetch(window.location.pathname, { cache: 'reload' }).catch(() => {})

  // На быстрой сети всё выше укладывается в десяток миллисекунд, и надпись
  // «Кеш очищен, перезагружаю…» не успевала отрисоваться: экран просто
  // моргал, и было непонятно, нажалась кнопка или нет.
  await new Promise((resolve) => setTimeout(resolve, MIN_TOAST_MS))

  window.location.reload()
}

if ('serviceWorker' in navigator) {
  // Если контроллера ещё нет, это первая установка: перехват управления
  // произойдёт штатно и перезагружать нечего.
  const hadController = Boolean(navigator.serviceWorker.controller)
  let reloading = false

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return
    reloading = true
    window.location.reload()
  })
}

registerSW({
  immediate: true,

  onRegisteredSW(_swUrl, registration) {
    if (!registration) return

    // Офлайн проверка обновления просто не удастся — это штатная ситуация
    // в самолёте, а не ошибка.
    const check = () => registration.update().catch(() => {})

    setInterval(check, CHECK_INTERVAL_MS)

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check()
    })

    // Возврат из фона на iOS не всегда даёт visibilitychange — ловим и focus.
    window.addEventListener('focus', check)
  },
})
