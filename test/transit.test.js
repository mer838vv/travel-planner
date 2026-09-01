import test from 'node:test'
import assert from 'node:assert/strict'

import { normalizeTransit, transitIsStale } from '../src/utils/transit.js'
import { parseSegments, findConnections } from '../src/utils/flights.js'

const CHECKED = {
  airport: 'IST',
  verdict: 'ok',
  citizenship: 'RU',
  steps: ['Идти по указателям Transfer', 'Отсканировать посадочный'],
  boardingPass: 'Получить онлайн заранее',
  baggage: 'Только ручная кладь',
  visaNote: 'Транзитная виза не нужна',
  warnings: ['Разные брони: при опоздании пересаживать не обязаны'],
  minConnectionMin: 60,
  checkedOn: '2026-09-01',
  sources: [{ title: 'IST — Transfer', url: 'https://www.istairport.com/transfer' }],
}

test('проверенный транзит разбирается целиком', () => {
  const t = normalizeTransit(CHECKED)
  assert.equal(t.verdict, 'ok')
  assert.equal(t.airport, 'IST')
  assert.equal(t.citizenship, 'RU')
  assert.equal(t.steps.length, 2)
  assert.equal(t.minConnectionMin, 60)
  assert.equal(t.sources[0].url, 'https://www.istairport.com/transfer')
})

test('вердикт без даты и без источника понижается до «не проверено»', () => {
  // Суть всей правки: утверждение без опоры — это не факт, а мнение.
  // Приложение не должно выдавать его за проверенное ни в какую сторону.
  const t = normalizeTransit({ verdict: 'ok', steps: ['Просто идти'] })
  assert.equal(t.verdict, 'unknown')
  assert.equal(t.unverifiedClaim, true)

  const denial = normalizeTransit({ verdict: 'needs-entry', baggage: 'Забрать багаж' })
  assert.equal(denial.verdict, 'unknown', 'запрет тоже требует доказательств')
})

test('одной даты проверки достаточно, чтобы вердикт устоял', () => {
  assert.equal(normalizeTransit({ verdict: 'ok', checkedOn: '2026-09-01' }).verdict, 'ok')
  assert.equal(normalizeTransit({ verdict: 'ok', sources: CHECKED.sources }).verdict, 'ok')
})

test('неизвестный вердикт не выдумывается', () => {
  // Мусорный вердикт без всякого содержимого — это пустота, а не блок.
  // Возвращается null, и карточка честно пишет «не проверено».
  assert.equal(normalizeTransit({ verdict: 'наверное можно' }), null)
  assert.equal(normalizeTransit(null), null)
  assert.equal(normalizeTransit({}), null)

  // А вот если содержимое есть, блок остаётся — но вердикт всё равно unknown
  const withSteps = normalizeTransit({ verdict: 'наверное можно', steps: ['Идти'] })
  assert.equal(withSteps.verdict, 'unknown')
})

test('источник без ссылки отбрасывается', () => {
  const t = normalizeTransit({ ...CHECKED, sources: [{ title: 'Слышал от друга' }] })
  // Остался только checkedOn — вердикт держится на нём
  assert.deepEqual(t.sources, [])
  assert.equal(t.verdict, 'ok')
})

test('устаревшая проверка распознаётся', () => {
  const t = normalizeTransit(CHECKED)
  assert.equal(transitIsStale(t, new Date('2026-09-20T00:00:00Z')), false)
  assert.equal(transitIsStale(t, new Date('2027-03-01T00:00:00Z')), true)
  assert.equal(transitIsStale(normalizeTransit({ verdict: 'ok', sources: CHECKED.sources })), false)
})

// --- как транзит доезжает до карточки стыковки ---

function ticket(id, pnr, from, to, departLocal, arriveLocal, extra = {}) {
  return {
    id,
    flight: {
      number: `Рейс ${id}`,
      pnr,
      from: { iata: from, tz: 'Europe/Rome', name: from },
      to: { iata: to, tz: 'Europe/Istanbul', name: to },
      departLocal,
      arriveLocal,
      ...extra,
    },
  }
}

test('транзит принадлежит прилетающему рейсу и виден в стыковке', () => {
  const segments = parseSegments([
    ticket(1, 'AAA', 'FCO', 'IST', '2026-10-03T07:05', '2026-10-03T10:45', {
      transit: CHECKED,
    }),
    ticket(2, 'BBB', 'IST', 'SVO', '2026-10-03T14:30', '2026-10-03T18:00'),
  ])

  const [connection] = findConnections(segments)
  assert.equal(connection.transit.verdict, 'ok')
  assert.equal(connection.transit.airport, 'IST')
  assert.equal(connection.separateTickets, true, 'разные брони — по-прежнему разные')
})

test('без блока транзита стыковка просто не знает ответа', () => {
  const segments = parseSegments([
    ticket(1, 'AAA', 'FCO', 'IST', '2026-10-03T07:05', '2026-10-03T10:45'),
    ticket(2, 'BBB', 'IST', 'SVO', '2026-10-03T14:30', '2026-10-03T18:00'),
  ])

  assert.equal(findConnections(segments)[0].transit, null)
})
