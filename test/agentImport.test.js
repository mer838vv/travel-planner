import 'fake-indexeddb/auto'
import test from 'node:test'
import assert from 'node:assert/strict'

import { db } from '../src/db.js'
import { parseAgentPayload, applyAgentPayload } from '../src/utils/agentImport.js'

const VALID = {
  trip: {
    title: 'Рим, октябрь',
    startDate: '2026-10-03',
    endDate: '2026-10-05',
    destinationName: 'Рим, Италия',
    destinationLat: 41.9028,
    destinationLon: 12.4964,
  },
  days: [
    {
      date: '2026-10-03',
      routeStart: { type: 'hotel', name: 'Hotel Roma', address: 'Via Roma 1', lat: 41.9, lon: 12.49 },
      routeSummary: 'Первый день в историческом центре.',
      routeRationale: 'Сначала посещение по билету на время, затем соседние места без возвратов по уже пройденным улицам и лишних переходов.',
      walkingDistanceKm: 3.4,
      walkingDurationMin: 48,
      researchedAt: '2026-09-03',
      routeSources: [{ title: 'Официальный сайт', url: 'https://example.org/official' }],
      pois: [
        {
          name: 'Колизей', description: 'Амфитеатр 80 года.', lat: 41.8902, lon: 12.4922,
          visitTime: '10:00', durationMin: 120, cost: '18 €', kind: 'sight',
          analysis: {
            whyVisit: 'Помогает понять устройство публичной жизни императорского Рима.',
            highlights: ['Арена', 'Ярусы'], practicalTip: 'Прийти заранее к контролю безопасности.',
            sourceTitle: 'Официальный сайт', sourceUrl: 'https://example.org/colosseum', checkedAt: '2026-09-03',
          },
        },
        { name: 'Римский форум', lat: 41.8925, lon: 12.4853 },
      ],
    },
    { date: '2026-10-04', pois: [{ name: 'Ватикан', lat: 41.9022, lon: 12.4539 }] },
  ],
  tickets: [{ title: 'Рейс SU2402', category: 'Авиабилет', date: '2026-10-03', note: 'Бронь ABC123' }],
  packing: [{ category: 'Документы', name: 'Паспорт' }],
  budget: [{ title: 'Отель', category: 'Жильё', amount: 420, currency: 'eur' }],
}

test.beforeEach(async () => {
  await db.delete()
  await db.open()
})

test('парсит план и раскладывает его по таблицам', async () => {
  const summary = await applyAgentPayload(parseAgentPayload(JSON.stringify(VALID)))

  assert.equal(summary.days, 3, 'дни создаются на весь диапазон, включая пустой 5 октября')
  assert.equal(summary.pois, 3)
  assert.equal(summary.tickets, 1)
  assert.equal(summary.packing, 1)
  assert.equal(summary.budget, 1)

  const trip = await db.trips.get(summary.tripId)
  assert.equal(trip.title, 'Рим, октябрь')
  assert.equal(trip.destinationLat, 41.9028)
  assert.equal(trip.source, 'agent')

  const days = await db.days.where('tripId').equals(summary.tripId).sortBy('order')
  assert.deepEqual(days.map((d) => d.date), ['2026-10-03', '2026-10-04', '2026-10-05'])

  // Точки должны попасть в свой день и сохранить порядок из плана.
  const firstDayPois = await db.pois.where('dayId').equals(days[0].id).sortBy('order')
  assert.deepEqual(firstDayPois.map((p) => p.name), ['Колизей', 'Римский форум'])
  assert.equal(firstDayPois[0].durationMin, 120)
  assert.equal(firstDayPois[0].cost, '18 €')
  assert.equal(firstDayPois[0].kind, 'sight')
  assert.deepEqual(firstDayPois[0].analysis.highlights, ['Арена', 'Ярусы'])
  assert.equal(firstDayPois[1].description, '', 'описание необязательно')
  assert.equal(days[0].routeStart.type, 'hotel')
  assert.equal(days[0].routeStart.name, 'Hotel Roma')
  assert.equal(days[0].walkingDistanceKm, 3.4)
  assert.equal(days[0].routeSources[0].url, 'https://example.org/official')

  const [ticket] = await db.tickets.where('tripId').equals(summary.tripId).toArray()
  assert.equal(ticket.note, 'Бронь ABC123')
  assert.equal(ticket.fileBlob, null)

  const [entry] = await db.budgetEntries.where('tripId').equals(summary.tripId).toArray()
  assert.equal(entry.currency, 'EUR', 'валюта приводится к верхнему регистру')
  assert.equal(entry.date, '2026-10-03', 'без даты трата падает на начало поездки')
})

test('снимает обёртку ```json вокруг ответа агента', () => {
  const wrapped = '```json\n' + JSON.stringify(VALID) + '\n```'
  assert.equal(parseAgentPayload(wrapped).trip.title, 'Рим, октябрь')
})

test('отклоняет мусор понятным сообщением, а не падает', () => {
  for (const bad of ['', 'привет', '[]', '{}']) {
    assert.throws(() => parseAgentPayload(bad), (err) => err.userFacing === true, `не отклонено: ${bad}`)
  }

  const noDate = { trip: { title: 'X', startDate: '03.10.2026', endDate: '2026-10-05' } }
  assert.throws(() => parseAgentPayload(JSON.stringify(noDate)), /2026-10-03/)

  const reversed = { trip: { title: 'X', startDate: '2026-10-05', endDate: '2026-10-03' } }
  assert.throws(() => parseAgentPayload(JSON.stringify(reversed)), /раньше/)
})

test('пропускает битые записи, но сохраняет остальной план', async () => {
  const messy = {
    trip: { title: 'Проверка', startDate: '2026-10-03', endDate: '2026-10-04' },
    days: [
      {
        date: '2026-10-03',
        pois: [
          { name: 'Без координат' },            // на карту не встанет — пропуск
          { lat: 1, lon: 2 },                    // без названия — пропуск
          { name: 'Годная', lat: 41.9, lon: 12.5 },
        ],
      },
      { date: '2030-01-01', pois: [{ name: 'Вне поездки', lat: 1, lon: 2 }] },
    ],
    tickets: [{ category: 'Авиабилет' }, { title: 'Ок', category: 'Выдуманная' }],
    budget: [{ title: 'Без суммы' }, { title: 'Ок', amount: '55.5' }],
  }

  const summary = await applyAgentPayload(parseAgentPayload(JSON.stringify(messy)))
  assert.equal(summary.pois, 1)
  assert.equal(summary.tickets, 1)
  assert.equal(summary.budget, 1)

  const [ticket] = await db.tickets.where('tripId').equals(summary.tripId).toArray()
  assert.equal(ticket.category, 'Другое', 'неизвестная категория заменяется, а не теряет билет')

  const [entry] = await db.budgetEntries.where('tripId').equals(summary.tripId).toArray()
  assert.equal(entry.amount, 55.5, 'сумма строкой всё равно принимается числом')
})

test('импорт не трогает уже существующие поездки', async () => {
  const existingId = await db.trips.add({ title: 'Своя поездка', startDate: '2026-01-01', endDate: '2026-01-02' })
  await db.pois.add({ tripId: existingId, dayId: 999, name: 'Своя точка', lat: 1, lon: 2, order: 0 })

  await applyAgentPayload(parseAgentPayload(JSON.stringify(VALID)))

  assert.equal(await db.trips.count(), 2, 'создана новая поездка, старая на месте')
  const own = await db.trips.get(existingId)
  assert.equal(own.title, 'Своя поездка')
  assert.equal(await db.pois.where('tripId').equals(existingId).count(), 1)
})
