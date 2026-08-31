import test from 'node:test'
import assert from 'node:assert/strict'

import { parseSegments, pickCurrentSegment, findConnections, taxiAddress } from '../src/utils/flights.js'
import { formatDuration } from '../src/utils/time.js'

const FCO = { iata: 'FCO', name: 'Рим, Фьюмичино', terminal: '1', tz: 'Europe/Rome' }
const IST = { iata: 'IST', name: 'Стамбул', tz: 'Europe/Istanbul' }
const SVO = { iata: 'SVO', name: 'Шереметьево', terminal: 'C', address: 'Аэропорт Шереметьево', tz: 'Europe/Moscow' }

// Настоящая поездка 1 сентября 2026, двумя разными бронями
const TICKETS = [
  {
    id: 2, title: 'SU2137', category: 'Авиабилет',
    flight: {
      number: 'SU2137', pnr: 'G8CGD2', seats: ['20C', '20B'],
      from: IST, to: SVO,
      departLocal: '2026-09-01T15:50', arriveLocal: '2026-09-01T20:45',
      checkinClosesLocal: '2026-09-01T15:05',
    },
  },
  {
    id: 1, title: 'TK1362', category: 'Авиабилет',
    flight: {
      number: 'TK1362', pnr: 'THJK7T', seats: ['23B', '23A'],
      from: FCO, to: IST,
      departLocal: '2026-09-01T07:05', arriveLocal: '2026-09-01T10:45',
      leaveAtLocal: '2026-09-01T04:30', leaveNote: 'дорога 45 мин + контроль',
    },
  },
  { id: 3, title: 'Страховка', category: 'Страховка' },
]

test('рейсы разбираются и выстраиваются по вылету', () => {
  const segments = parseSegments(TICKETS)

  assert.equal(segments.length, 2, 'билет без рейса не попадает в список')
  assert.deepEqual(segments.map((s) => s.number), ['TK1362', 'SU2137'], 'порядок по вылету, а не по id')

  assert.equal(segments[0].departAt.toISOString(), '2026-09-01T05:05:00.000Z')
  assert.equal(segments[0].leaveAt.toISOString(), '2026-09-01T02:30:00.000Z')
  assert.deepEqual(segments[0].seats, ['23B', '23A'])
  assert.equal(segments[1].checkinClosesAt.toISOString(), '2026-09-01T12:05:00.000Z')
})

test('текущим считается ближайший ещё не вылетевший рейс', () => {
  const segments = parseSegments(TICKETS)

  // Ночь перед вылетом — впереди оба
  assert.equal(pickCurrentSegment(segments, new Date('2026-09-01T00:00:00Z')).number, 'TK1362')
  // Уже в Стамбуле, первый рейс позади
  assert.equal(pickCurrentSegment(segments, new Date('2026-09-01T09:00:00Z')).number, 'SU2137')
  // Всё позади — показываем последний, а не пустоту
  assert.equal(pickCurrentSegment(segments, new Date('2026-09-02T00:00:00Z')).number, 'SU2137')
  assert.equal(pickCurrentSegment([], new Date()), null)
})

test('стыковка в Стамбуле: 5 ч 05 мин по разным броням — запас есть', () => {
  const [connection] = findConnections(parseSegments(TICKETS))

  assert.equal(connection.airport.iata, 'IST')
  assert.equal(formatDuration(connection.gapMs), '5 ч 5 мин')
  assert.equal(connection.separateTickets, true, 'брони THJK7T и G8CGD2 разные')
  assert.equal(connection.changesAirport, false)
  assert.equal(connection.level, 'ok')
})

test('короткая стыковка по разным броням помечается рискованной', () => {
  const tight = structuredClone(TICKETS)
  tight[0].flight.departLocal = '2026-09-01T13:00'   // вместо 15:50 → запас 2 ч 15 мин

  const [connection] = findConnections(parseSegments(tight))
  assert.equal(connection.level, 'risky', 'меньше трёх часов на разных билетах')
})

test('те же два часа на одном билете риском не считаются', () => {
  const single = structuredClone(TICKETS)
  single[0].flight.departLocal = '2026-09-01T13:00'
  single[0].flight.pnr = 'THJK7T'                     // единая бронь

  const [connection] = findConnections(parseSegments(single))
  assert.equal(connection.separateTickets, false)
  assert.equal(connection.level, 'ok')
})

test('меньше часа или смена аэропорта — критично', () => {
  const impossible = structuredClone(TICKETS)
  impossible[0].flight.departLocal = '2026-09-01T11:20'  // 35 минут
  assert.equal(findConnections(parseSegments(impossible))[0].level, 'critical')

  const otherAirport = structuredClone(TICKETS)
  otherAirport[0].flight.from = { iata: 'SAW', name: 'Сабиха Гёкчен', tz: 'Europe/Istanbul' }
  const c = findConnections(parseSegments(otherAirport))[0]
  assert.equal(c.changesAirport, true)
  assert.equal(c.level, 'critical', 'прилёт в один аэропорт, вылет из другого')
})

test('адрес для такси содержит терминал и не содержит кода', () => {
  assert.equal(taxiAddress(SVO), 'Аэропорт Шереметьево, терминал C')
  assert.equal(taxiAddress(FCO), 'Рим, Фьюмичино, терминал 1')
  assert.equal(taxiAddress(IST), 'Стамбул', 'без терминала — просто название')
  assert.equal(taxiAddress(null), '')
})

test('рейс без времени не ломает разбор и уходит в конец', () => {
  const broken = [
    { id: 1, flight: { number: 'X', from: FCO, to: IST } },
    ...TICKETS,
  ]
  const segments = parseSegments(broken)
  assert.equal(segments.length, 3)
  assert.equal(segments[segments.length - 1].number, 'X')
  assert.equal(segments[0].number, 'TK1362')
})
