import 'fake-indexeddb/auto'
import test from 'node:test'
import assert from 'node:assert/strict'

import { db } from '../src/db.js'
import { readBackup, analyzeBackup, importAllData, buildTripBackup } from '../src/utils/backup.js'

/** Подделка File: readBackup нужен только метод text(). */
function file(content) {
  const text = typeof content === 'string' ? content : JSON.stringify(content)
  return { text: async () => text }
}

function backup(extra = {}) {
  return {
    exportedAt: '2026-09-01T10:00:00.000Z',
    version: 1,
    trips: [{ id: 1, title: 'Рим из бэкапа', startDate: '2026-10-03', endDate: '2026-10-05' }],
    days: [{ id: 1, tripId: 1, date: '2026-10-03', order: 0 }],
    pois: [{ id: 1, tripId: 1, dayId: 1, name: 'Колизей', lat: 41.89, lon: 12.49, order: 0 }],
    tickets: [],
    packingItems: [],
    budgetEntries: [],
    ...extra,
  }
}

test.beforeEach(async () => {
  await db.delete()
  await db.open()
})

test('файл не-JSON отклоняется понятным сообщением', async () => {
  await assert.rejects(
    () => readBackup(file('это не json')),
    (err) => err.userFacing && /JSON/.test(err.message)
  )
})

test('план агента не принимается за бэкап', async () => {
  // Оба файла — JSON про поездку, перепутать легко. Раньше план уходил
  // в таблицы как попало.
  const plan = { trip: { title: 'Рим', startDate: '2026-10-03', endDate: '2026-10-05' } }
  await assert.rejects(
    () => readBackup(file(plan)),
    (err) => err.userFacing && /план от агента/.test(err.message)
  )
})

test('чужой JSON без списка поездок отклоняется', async () => {
  await assert.rejects(
    () => readBackup(file({ hello: 'world' })),
    (err) => err.userFacing && /нет списка поездок/.test(err.message)
  )
})

test('на пустой базе ничего не заменяется', async () => {
  const summary = await analyzeBackup(await readBackup(file(backup())))

  assert.equal(summary.incoming.trips, 1)
  assert.equal(summary.incoming.pois, 1)
  assert.equal(summary.newTrips, 1)
  assert.deepEqual(summary.replacedTrips, [])
  assert.deepEqual(summary.touchedTrips, [])
  assert.equal(summary.exportedAt, '2026-09-01T10:00:00.000Z')
})

test('поездка с тем же id показана как заменяемая, с обоими названиями', async () => {
  await db.trips.add({ id: 1, title: 'Мой Рим, собранный руками', startDate: '2026-10-03', endDate: '2026-10-05' })

  const summary = await analyzeBackup(await readBackup(file(backup())))

  assert.equal(summary.newTrips, 0)
  assert.equal(summary.replacedTrips.length, 1)
  assert.equal(summary.replacedTrips[0].title, 'Мой Рим, собранный руками')
  assert.equal(summary.replacedTrips[0].incomingTitle, 'Рим из бэкапа')
})

test('чужая поездка, попавшая под совпадение id, посчитана отдельно', async () => {
  // Тихая потеря данных: точка с другого устройства встаёт по своему id на
  // место точки, принадлежащей совсем другой поездке. Поездки с id 1 в
  // бэкапе нет среди местных, зато точка с id 1 занята Парижем.
  await db.trips.add({ id: 7, title: 'Париж', startDate: '2026-07-01', endDate: '2026-07-05' })
  await db.days.add({ id: 1, tripId: 7, date: '2026-07-01', order: 0 })
  await db.pois.add({ id: 1, tripId: 7, dayId: 1, name: 'Эйфелева башня', lat: 48.85, lon: 2.29, order: 0 })

  const summary = await analyzeBackup(await readBackup(file(backup())))

  assert.deepEqual(summary.replacedTrips, [])
  assert.equal(summary.touchedTrips.length, 1)
  assert.equal(summary.touchedTrips[0].title, 'Париж')
  // Пострадают обе записи: и день, и точка
  assert.equal(summary.touchedTrips[0].rows, 2)
})

test('записи заменяемой поездки не числятся пострадавшими', async () => {
  // Здесь перезапись ожидаема: это и есть восстановление той же поездки,
  // а не потеря чужих данных.
  await db.trips.add({ id: 1, title: 'Рим', startDate: '2026-10-03', endDate: '2026-10-05' })
  await db.days.add({ id: 1, tripId: 1, date: '2026-10-03', order: 0 })
  await db.pois.add({ id: 1, tripId: 1, dayId: 1, name: 'Старая точка', lat: 41.9, lon: 12.5, order: 0 })

  const summary = await analyzeBackup(await readBackup(file(backup())))

  assert.equal(summary.replacedTrips.length, 1)
  assert.deepEqual(summary.touchedTrips, [])
})

test('подсчёт совпадает с тем, что импорт делает на самом деле', async () => {
  await db.trips.add({ id: 7, title: 'Париж', startDate: '2026-07-01', endDate: '2026-07-05' })
  await db.pois.add({ id: 1, tripId: 7, dayId: 1, name: 'Эйфелева башня', lat: 48.85, lon: 2.29, order: 0 })

  const payload = await readBackup(file(backup()))
  const summary = await analyzeBackup(payload)
  await importAllData(payload)

  // Предупреждение не было ложной тревогой: точка Парижа действительно
  // затёрта записью из бэкапа.
  assert.equal(summary.touchedTrips[0].title, 'Париж')
  const poi = await db.pois.get(1)
  assert.equal(poi.name, 'Колизей')
  assert.equal(poi.tripId, 1)

  // А сам Париж как поездка остался на месте
  assert.equal((await db.trips.get(7)).title, 'Париж')
  assert.equal((await db.trips.get(1)).title, 'Рим из бэкапа')
})

test('импорт кладёт всё по своим таблицам', async () => {
  const payload = await readBackup(file(backup({
    tickets: [{ id: 1, tripId: 1, title: 'Рейс SU2402', category: 'Авиабилет', date: '2026-10-03' }],
    packingItems: [{ id: 1, tripId: 1, name: 'Паспорт', category: 'Документы', packed: false }],
    budgetEntries: [{ id: 1, tripId: 1, title: 'Отель', amount: 420, currency: 'EUR', date: '2026-10-03' }],
  })))

  await importAllData(payload)

  assert.equal(await db.trips.count(), 1)
  assert.equal(await db.days.count(), 1)
  assert.equal(await db.pois.count(), 1)
  assert.equal((await db.tickets.get(1)).title, 'Рейс SU2402')
  assert.equal((await db.packingItems.get(1)).name, 'Паспорт')
  assert.equal((await db.budgetEntries.get(1)).amount, 420)
})

test('битые записи в массивах не роняют разбор', async () => {
  const summary = await analyzeBackup(await readBackup(file(backup({
    trips: [null, { id: 1, title: 'Рим' }, 'мусор'],
    pois: [null, { id: 1, tripId: 1, name: 'Точка' }],
  }))))

  assert.equal(summary.incoming.trips, 1)
  assert.equal(summary.incoming.pois, 1)
})

test('бэкап одной поездки не захватывает данные другой', async () => {
  await db.trips.bulkAdd([
    { id: 1, title: 'Рим' },
    { id: 2, title: 'Париж' },
  ])
  await db.days.bulkAdd([
    { id: 11, tripId: 1, date: '2026-10-03' },
    { id: 22, tripId: 2, date: '2026-11-04' },
  ])
  await db.pois.bulkAdd([
    { id: 111, tripId: 1, dayId: 11, name: 'Колизей' },
    { id: 222, tripId: 2, dayId: 22, name: 'Лувр' },
  ])
  await db.tickets.bulkAdd([
    { id: 1111, tripId: 1, title: 'Рейс в Рим' },
    { id: 2222, tripId: 2, title: 'Рейс в Париж' },
  ])

  const payload = await buildTripBackup(1)

  assert.deepEqual(payload.trips.map((row) => row.title), ['Рим'])
  assert.deepEqual(payload.days.map((row) => row.tripId), [1])
  assert.deepEqual(payload.pois.map((row) => row.name), ['Колизей'])
  assert.deepEqual(payload.tickets.map((row) => row.title), ['Рейс в Рим'])
  assert.equal(payload.tickets[0].fileBlob, undefined)
  assert.equal(payload.tickets[0].fileData, null)
})

test('бэкап отсутствующей поездки завершается понятной ошибкой', async () => {
  await assert.rejects(
    () => buildTripBackup(404),
    (err) => err.userFacing && /не найдена/.test(err.message)
  )
})
