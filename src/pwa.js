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
