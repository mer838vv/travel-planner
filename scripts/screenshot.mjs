/**
 * Снимает интерфейс в реальном браузере на размере экрана айфона, в светлой
 * и тёмной теме. Нужен потому, что «собралось без ошибок» ничего не говорит
 * о том, как оформление выглядит — это уже дважды приводило к выкатке
 * внешнего вида, который пользователя не устроил.
 *
 * Запуск: node scripts/screenshot.mjs [url]
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const url = process.argv[2] || 'http://localhost:4173/'
const outDir = new URL('../screenshots/', import.meta.url).pathname
mkdirSync(outDir, { recursive: true })

const PLAN = {
  trip: {
    title: 'Рим → Стамбул → Москва',
    startDate: '2026-09-01',
    endDate: '2026-09-01',
    destinationName: 'Москва',
    destinationLat: 55.7558,
    destinationLon: 37.6173,
  },
  days: [{
    date: '2026-09-01',
    pois: [
      { name: 'Hilton Garden Inn Rome Colosseum — выезд', description: 'Via Emanuele Filiberto 173. Uber на 04:10, 55 €.', lat: 41.8899752, lon: 12.506672, visitTime: '04:20', durationMin: 40, cost: '55 €' },
      { name: 'Рим, Фьюмичино (FCO) — вылет', description: 'TK1362 в 07:05, Терминал 3. Регистрация пройдена, места 23B и 23A.', lat: 41.8153911, lon: 12.2264848, visitTime: '05:00', durationMin: 120 },
      { name: 'Колизей', description: 'Амфитеатр 80 года. Билет общий с Форумом, действует два дня.', lat: 41.8902, lon: 12.4922, visitTime: '09:00', durationMin: 120, cost: '18 €' },
      { name: 'Устричная ферма', description: 'Устрицы от 1 € у производителя, а не в ресторане.', lat: 41.7712, lon: 12.2311, visitTime: '13:00', durationMin: 90 },
      { name: 'Вилла Боргезе, парк', description: 'Прогулка после обеда, вход свободный.', lat: 41.9142, lon: 12.4922, visitTime: '15:00', durationMin: 60 },
      { name: 'Стамбул (IST) — пересадка', description: 'Прилёт 10:45, вылет на Москву 15:50. Две разные брони.', lat: 41.2748684, lon: 28.7322749, visitTime: '10:45', durationMin: 305 },
    ],
  }],
  tickets: [
    {
      title: 'TK1362 Рим — Стамбул', category: 'Авиабилет', date: '2026-09-01',
      note: 'Регистрация пройдена, посадочные выданы',
      flight: {
        number: 'TK1362', pnr: 'THJK7T', seats: ['23B', '23A'],
        from: { iata: 'FCO', name: 'Рим, Фьюмичино', terminal: '1', address: 'Aeroporto di Fiumicino', tz: 'Europe/Rome' },
        to: { iata: 'IST', name: 'Стамбул', tz: 'Europe/Istanbul' },
        departLocal: '2026-09-01T07:05', arriveLocal: '2026-09-01T10:45',
        leaveAtLocal: '2026-09-01T04:20', leaveNote: 'дорога 40 мин, быть в аэропорту к 05:00',
        transfer: {
          from: 'Hilton Garden Inn Rome Colosseum, Via Emanuele Filiberto 173',
          durationMin: 40,
          warnings: ['В обычном такси сразу сказать «tariffa fissa Fiumicino», иначе включат счётчик и с ночной надбавкой выйдет дороже.'],
          options: [
            {
              name: 'Uber', price: 55, currency: 'EUR', priceRub: 5531, unit: 'за машину',
              note: 'Цена зафиксирована в приложении до заказа, надбавки за вызов нет.',
              howTo: 'Заказать на 04:10 из приложения, машина подъедет ко входу отеля.',
              url: 'https://m.uber.com/',
            },
            {
              name: 'Такси по фиксированному тарифу', price: 58.5, currency: 'EUR', priceRub: 5883, unit: 'за машину',
              note: 'Официальные 55 € плюс 3,50 € за вызов по телефону или приложению.',
              howTo: 'Попросить ресепшн заказать на 04:10 — цена та же, язык не нужен.',
              phone: '+39 06 3570',
              phrase: 'Buonasera! Vorrei prenotare un taxi per domattina alle 04:10, per l aeroporto di Fiumicino. Tariffa fissa 55 euro, per favore.',
              phraseTranslation: 'Добрый вечер! Хочу заказать такси на завтра на 04:10 в аэропорт Фьюмичино. По фиксированному тарифу 55 евро, пожалуйста.',
            },
            { name: 'Частный трансфер (NCC)', price: 75, currency: 'EUR', unit: 'за машину', note: 'Смысла нет при работающем фиксе и Uber.' },
            { name: 'Bolt', unavailable: true, note: 'В Риме не работает.' },
          ],
        },
      },
    },
    {
      title: 'SU2137 Стамбул — Москва', category: 'Авиабилет', date: '2026-09-01',
      note: 'Без багажа, только ручная кладь',
      flight: {
        number: 'SU2137', pnr: 'G8CGD2', seats: ['20C', '20B'],
        from: { iata: 'IST', name: 'Стамбул', tz: 'Europe/Istanbul' },
        to: { iata: 'SVO', name: 'Шереметьево', terminal: 'C', address: 'Аэропорт Шереметьево', tz: 'Europe/Moscow' },
        departLocal: '2026-09-01T15:50', arriveLocal: '2026-09-01T20:45',
        checkinClosesLocal: '2026-09-01T15:05',
      },
    },
  ],
  packing: [
    { category: 'Документы', name: 'Паспорт' },
    { category: 'Ручная кладь', name: 'Одно место до 8 кг' },
  ],
  budget: [{ title: 'Аэрофлот, 2 человека', category: 'Перелёт', amount: 44986, currency: 'RUB' }],
}

// Тот же маршрут, но стыковка в Стамбуле всего 1 ч 25 мин при разных бронях —
// проверяем, как выглядит предупреждение.
const TIGHT_PLAN = structuredClone(PLAN)
TIGHT_PLAN.trip.title = 'Опасная стыковка'
TIGHT_PLAN.days = []
TIGHT_PLAN.packing = []
TIGHT_PLAN.budget = []
TIGHT_PLAN.tickets[1].flight.departLocal = '2026-09-01T12:10'
TIGHT_PLAN.tickets[1].flight.checkinClosesLocal = '2026-09-01T11:25'

const browser = await chromium.launch()

for (const scheme of ['light', 'dark']) {
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },   // iPhone 15/16
    deviceScaleFactor: 2,
    colorScheme: scheme,
    locale: 'ru-RU',
    timezoneId: 'Europe/Rome',
  })

  // Отсчёты на карточке рейса зависят от «сейчас»: фиксируем момент, иначе
  // снимки каждый раз разные и их нельзя сравнивать между прогонами.
  // 02:30 по Риму — ночь перед вылетом, самое интересное состояние.
  await context.clock.setFixedTime(new Date('2026-09-01T00:30:00Z'))
  const page = await context.newPage()

  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.goto(url, { waitUntil: 'networkidle' })

  await page.screenshot({ path: `${outDir}${scheme}-1-главная.png` })

  // Заполняем поездку через тот же импорт, что и в приложении, чтобы снять
  // экраны с реальным содержимым, а не пустые.
  await page.getByRole('button', { name: /Вставить план от агента/ }).click()
  await page.locator('.agent-import textarea').fill(JSON.stringify(PLAN))
  await page.screenshot({ path: `${outDir}${scheme}-2-вставка-плана.png` })

  await page.getByRole('button', { name: 'Создать поездку' }).click()
  await page.waitForURL(/\/trip\//, { timeout: 15000 })
  await page.waitForTimeout(2500)                       // карта и погода
  await page.screenshot({ path: `${outDir}${scheme}-3-маршрут.png` })

  // Список точек дня целиком: ради него и делалась типизация карточек
  const poiList = page.locator('.poi-list')
  if (await poiList.count()) {
    await poiList.scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
    await poiList.screenshot({ path: `${outDir}${scheme}-3a-точки-дня.png` })
  }

  // Блок трансфера длиннее экрана — снимаем его целиком отдельно
  const transfer = page.locator('.transfer-card')
  if (await transfer.count()) {
    await transfer.scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
    await transfer.screenshot({ path: `${outDir}${scheme}-3b-трансфер.png` })
  }

  for (const [tab, file] of [['Билеты', '4-билеты'], ['Сборы', '5-сборы'], ['Бюджет', '6-бюджет']]) {
    await page.getByRole('button', { name: tab, exact: true }).click()
    await page.waitForTimeout(350)
    await page.screenshot({ path: `${outDir}${scheme}-${file}.png` })
  }

  // Подтверждение удаления: снимаем экран, но саму поездку не удаляем —
  // иначе следующий прогон стартовал бы с другого состояния.
  // Опасный случай отдельно: короткая стыковка по разным броням — то самое
  // предупреждение, ради которого всё и делалось. Его вид надо видеть.
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /Вставить план от агента/ }).click()
  await page.locator('.agent-import textarea').fill(JSON.stringify(TIGHT_PLAN))
  await page.getByRole('button', { name: 'Создать поездку' }).click()
  await page.waitForURL(/\/trip\//, { timeout: 15000 })
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${outDir}${scheme}-8-риск-стыковки.png` })

  await page.goBack()
  await page.waitForTimeout(300)
  await page.getByRole('link', { name: /Рим/ }).first().click()
  await page.waitForTimeout(600)

  const deleteButton = page.getByRole('button', { name: 'Удалить поездку' })
  await deleteButton.scrollIntoViewIfNeeded()
  await deleteButton.click()
  await page.locator('.danger-card').scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${outDir}${scheme}-7-удаление.png` })

  console.log(`${scheme}: снято, ошибок в консоли — ${errors.length}`)
  for (const e of errors.slice(0, 5)) console.log(`   ! ${e}`)

  await context.close()
}

await browser.close()
console.log(`Скриншоты: ${outDir}`)
