// Расширение .js обязательно: тесты гоняются голым node, который, в отличие
// от Vite, не достраивает расширения сам.
import { db, dateRangeDays } from '../db.js'
import { normalizeTransfer } from './transfer.js'
import { normalizeTransit } from './transit.js'

/**
 * Приём готового плана поездки от агента (Claude Code со скиллами
 * flight-floor / price-floor / local-finds).
 *
 * Приложение — статика на GitHub Pages, без бэкенда: вшить сюда ключ от
 * Claude API нельзя, сайт публичный. Поэтому агент работает снаружи и
 * отдаёт результат этим форматом, а приложение только принимает и
 * раскладывает по своим таблицам.
 *
 * Импорт всегда создаёт НОВУЮ поездку и ничего не перезаписывает —
 * ошибочная вставка не может стереть уже собранный вручную маршрут.
 */

const TICKET_CATEGORIES = [
  'Авиабилет', 'Отель', 'Поезд/автобус', 'Музей/экскурсия', 'Страховка', 'Виза', 'Другое',
]

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function fail(message) {
  const err = new Error(message)
  err.userFacing = true
  throw err
}

export function parseAgentPayload(raw) {
  const text = String(raw || '').trim()
  if (!text) fail('Пусто — вставьте план, который выдал агент.')

  // Агент часто оборачивает ответ в ```json … ``` — снимаем обёртку.
  const unfenced = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  let data
  try {
    data = JSON.parse(unfenced)
  } catch {
    fail('Это не похоже на план от агента: текст не читается как JSON. Скопируйте ответ агента целиком.')
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    fail('Ожидался объект с полем "trip".')
  }

  const trip = data.trip
  if (!trip || typeof trip !== 'object') fail('В плане нет раздела "trip".')
  if (!trip.title) fail('У поездки нет названия (trip.title).')
  if (!DATE_RE.test(trip.startDate || '')) fail('Некорректная дата начала (trip.startDate), нужен формат 2026-10-03.')
  if (!DATE_RE.test(trip.endDate || '')) fail('Некорректная дата конца (trip.endDate), нужен формат 2026-10-07.')
  if (trip.endDate < trip.startDate) fail('Дата конца раньше даты начала.')

  return data
}

function num(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const LOCAL_TIME_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/

function localTime(value) {
  return LOCAL_TIME_RE.test(String(value || '')) ? String(value) : null
}

function place(raw) {
  if (!raw?.iata) return null
  return {
    iata: String(raw.iata).toUpperCase().slice(0, 4),
    name: raw.name ? String(raw.name) : String(raw.iata),
    terminal: raw.terminal != null && raw.terminal !== '' ? String(raw.terminal) : null,
    address: raw.address ? String(raw.address) : null,
    // Без пояса нельзя посчитать ни отсчёт, ни длительность перелёта —
    // но и терять из-за этого весь рейс незачем, просто не будет отсчётов.
    tz: raw.tz ? String(raw.tz) : null,
    lat: num(raw.lat),
    lon: num(raw.lon),
  }
}

/**
 * Блок рейса внутри билета. Необязателен: у страховки или музея его нет,
 * и такой билет остаётся обычным билетом.
 */
function normalizeFlight(raw) {
  if (!raw) return null
  const from = place(raw.from)
  const to = place(raw.to)
  if (!from || !to) return null

  return {
    number: raw.number ? String(raw.number) : null,
    pnr: raw.pnr ? String(raw.pnr) : null,
    seats: Array.isArray(raw.seats) ? raw.seats.map(String).slice(0, 12) : [],
    from,
    to,
    departLocal: localTime(raw.departLocal),
    arriveLocal: localTime(raw.arriveLocal),
    checkinClosesLocal: localTime(raw.checkinClosesLocal),
    leaveAtLocal: localTime(raw.leaveAtLocal),
    leaveNote: raw.leaveNote ? String(raw.leaveNote) : null,
    transfer: normalizeTransfer(raw.transfer),
    transit: normalizeTransit(raw.transit),
  }
}

export async function applyAgentPayload(data) {
  const { trip } = data
  const dates = dateRangeDays(trip.startDate, trip.endDate)

  const summary = { title: trip.title, days: dates.length, pois: 0, tickets: 0, flights: 0, packing: 0, budget: 0 }

  await db.transaction(
    'rw',
    db.trips, db.days, db.pois, db.tickets, db.packingItems, db.budgetEntries,
    async () => {
      const tripId = await db.trips.add({
        title: String(trip.title),
        startDate: trip.startDate,
        endDate: trip.endDate,
        destinationName: trip.destinationName || null,
        destinationLat: num(trip.destinationLat),
        destinationLon: num(trip.destinationLon),
        createdAt: new Date().toISOString(),
        source: 'agent',
      })

      const dayIdByDate = {}
      for (let i = 0; i < dates.length; i++) {
        dayIdByDate[dates[i]] = await db.days.add({ tripId, date: dates[i], order: i })
      }

      for (const day of data.days || []) {
        const dayId = dayIdByDate[day?.date]
        // День вне диапазона поездки молча пропускаем, а не роняем весь импорт.
        if (!dayId) continue

        let order = 0
        for (const poi of day.pois || []) {
          if (!poi?.name) continue
          const lat = num(poi.lat)
          const lon = num(poi.lon)
          // Без координат точка не встанет на карту — такие пропускаем,
          // иначе Leaflet падает на NaN-позиции маркера.
          if (lat === null || lon === null) continue

          await db.pois.add({
            tripId,
            dayId,
            name: String(poi.name),
            description: poi.description ? String(poi.description) : '',
            lat,
            lon,
            visitTime: poi.visitTime ? String(poi.visitTime) : null,
            durationMin: num(poi.durationMin),
            cost: poi.cost != null ? String(poi.cost) : null,
            order: order++,
          })
          summary.pois++
        }
      }

      for (const ticket of data.tickets || []) {
        if (!ticket?.title) continue
        const flight = normalizeFlight(ticket.flight)
        await db.tickets.add({
          tripId,
          title: String(ticket.title),
          category: TICKET_CATEGORIES.includes(ticket.category) ? ticket.category : 'Другое',
          date: DATE_RE.test(ticket.date || '') ? ticket.date : null,
          note: ticket.note ? String(ticket.note) : null,
          flight,
          fileBlob: null,
          fileName: null,
          fileType: null,
        })
        summary.tickets++
        if (flight) summary.flights++
      }

      for (const item of data.packing || []) {
        if (!item?.name) continue
        await db.packingItems.add({
          tripId,
          name: String(item.name),
          category: item.category ? String(item.category) : 'Прочее',
          packed: false,
          qty: 1,
        })
        summary.packing++
      }

      for (const entry of data.budget || []) {
        const amount = num(entry?.amount)
        if (!entry?.title || amount === null) continue
        await db.budgetEntries.add({
          tripId,
          title: String(entry.title),
          category: entry.category ? String(entry.category) : 'Прочее',
          amount,
          currency: entry.currency ? String(entry.currency).toUpperCase() : 'EUR',
          date: DATE_RE.test(entry.date || '') ? entry.date : trip.startDate,
        })
        summary.budget++
      }

      summary.tripId = tripId
    }
  )

  return summary
}
