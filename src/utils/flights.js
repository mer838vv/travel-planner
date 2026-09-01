import { zonedTimeToUtc } from './time.js'

/**
 * Разбор рейсов из билетов и оценка стыковок.
 *
 * Рейс живёт внутри билета, в поле `flight` — отдельной таблицы нет
 * намеренно: билет и так удаляется вместе с поездкой и попадает в бэкап,
 * а дублировать эти связи ради одной вложенной структуры незачем.
 */

/** Момент вылета/прилёта из местного времени и пояса аэропорта. */
function instant(localISO, place) {
  return zonedTimeToUtc(localISO, place?.tz)
}

/**
 * Билеты → рейсы, разобранные и упорядоченные по вылету.
 * Билеты без блока `flight` (страховка, музей) просто не попадают сюда.
 */
export function parseSegments(tickets = []) {
  return tickets
    .filter((t) => t?.flight?.from && t?.flight?.to)
    .map((t) => {
      const f = t.flight
      return {
        ticketId: t.id,
        number: f.number || t.title,
        pnr: f.pnr || null,
        seats: Array.isArray(f.seats) ? f.seats : [],
        from: f.from,
        to: f.to,
        departLocal: f.departLocal || null,
        arriveLocal: f.arriveLocal || null,
        departAt: instant(f.departLocal, f.from),
        arriveAt: instant(f.arriveLocal, f.to),
        checkinClosesAt: instant(f.checkinClosesLocal, f.from),
        checkinClosesLocal: f.checkinClosesLocal || null,
        leaveAt: instant(f.leaveAtLocal, f.from),
        leaveAtLocal: f.leaveAtLocal || null,
        leaveNote: f.leaveNote || null,
        transfer: f.transfer || null,
        transit: f.transit || null,
      }
    })
    .sort((a, b) => {
      // Рейсы без разобранного времени уводим в конец, а не роняем сортировку
      if (!a.departAt) return 1
      if (!b.departAt) return -1
      return a.departAt - b.departAt
    })
}

/** Ближайший ещё не вылетевший рейс; если все позади — последний. */
export function pickCurrentSegment(segments, now = new Date()) {
  if (!segments.length) return null
  return segments.find((s) => !s.departAt || s.departAt > now) || segments[segments.length - 1]
}

// Пороги взяты из практики: для стыковки по РАЗНЫМ билетам советуют
// закладывать не меньше трёх часов — при опоздании первого рейса пересаживать
// тебя никто не обязан. Для единого билета минимум заметно ниже, потому что
// ответственность за стыковку на перевозчике.
const SEPARATE_TICKET_SAFE_MS = 3 * 3600_000
const SINGLE_TICKET_SAFE_MS = 90 * 60_000

// Ниже этого не успеть почти никогда — уже физически, а не по осторожности.
const SEPARATE_TICKET_MIN_MS = 60 * 60_000
const SINGLE_TICKET_MIN_MS = 45 * 60_000

// Смена аэропорта не приговор, а надбавка ко времени: выход в город,
// паспортный контроль, дорога и регистрация заново. Раньше любая такая
// стыковка помечалась как критическая независимо от запаса — и семь часов
// между аэропортами выглядели так же безнадёжно, как сорок минут.
const AIRPORT_CHANGE_EXTRA_MS = 2 * 3600_000

/**
 * Стыковки между соседними рейсами: длительность, смена аэропорта и оценка
 * риска. Разные брони — отдельный фактор риска, а не мелочь.
 */
export function findConnections(segments) {
  const out = []

  for (let i = 0; i < segments.length - 1; i++) {
    const arrive = segments[i]
    const depart = segments[i + 1]
    if (!arrive.arriveAt || !depart.departAt) continue

    const gapMs = depart.departAt - arrive.arriveAt
    const changesAirport = arrive.to?.iata !== depart.from?.iata
    const separateTickets = Boolean(arrive.pnr && depart.pnr && arrive.pnr !== depart.pnr)

    const extra = changesAirport ? AIRPORT_CHANGE_EXTRA_MS : 0
    const safeMs = (separateTickets ? SEPARATE_TICKET_SAFE_MS : SINGLE_TICKET_SAFE_MS) + extra
    const minMs = (separateTickets ? SEPARATE_TICKET_MIN_MS : SINGLE_TICKET_MIN_MS) + extra

    let level = 'ok'
    if (gapMs < minMs) level = 'critical'
    else if (gapMs < safeMs) level = 'risky'

    out.push({
      airport: arrive.to,
      arriveLocal: arrive.arriveLocal,
      departLocal: depart.departLocal,
      gapMs,
      changesAirport,
      separateTickets,
      level,
      // Проверенные данные о транзите принадлежат прилетающему рейсу: его
      // карточка и висит перед глазами, пока человек летит к пересадке.
      transit: arrive.transit || null,
      from: arrive,
      to: depart,
    })
  }

  return out
}

/** Строка для приложения такси: без кода аэропорта, зато с терминалом. */
export function taxiAddress(place) {
  if (!place) return ''
  const parts = [place.address || place.name].filter(Boolean)
  if (place.terminal) parts.push(`терминал ${place.terminal}`)
  return parts.join(', ')
}
