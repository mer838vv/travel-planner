import 'fake-indexeddb/auto'
import test from 'node:test'
import assert from 'node:assert/strict'

import { db, deleteTripCascade } from '../src/db.js'
import { parseAgentPayload, applyAgentPayload } from '../src/utils/agentImport.js'

function plan(title, date) {
  return JSON.stringify({
    trip: { title, startDate: date, endDate: date },
    days: [{
      date,
      pois: [
        { name: 'Точка А', lat: 41.9, lon: 12.5 },
        { name: 'Точка Б', lat: 41.8, lon: 12.4 },
      ],
    }],
    tickets: [{ title: 'Рейс', category: 'Авиабилет', date }],
    packing: [{ category: 'Документы', name: 'Паспорт' }],
    budget: [{ title: 'Отель', amount: 100, currency: 'EUR' }],
  })
}

test.beforeEach(async () => {
  await db.delete()
  await db.open()
})

test('удаляет поездку вместе со всем, что к ней привязано', async () => {
  const { tripId } = await applyAgentPayload(parseAgentPayload(plan('На удаление', '2026-10-03')))

  const removed = await deleteTripCascade(tripId)

  assert.deepEqual(removed, { days: 1, pois: 2, tickets: 1, packingItems: 1, budgetEntries: 1 })
  assert.equal(await db.trips.get(tripId), undefined)

  // Ни одной осиротевшей записи не остаётся ни в одной таблице.
  for (const table of [db.days, db.pois, db.tickets, db.packingItems, db.budgetEntries]) {
    assert.equal(await table.where('tripId').equals(tripId).count(), 0, `осталось в ${table.name}`)
  }
})

test('не задевает соседнюю поездку', async () => {
  const doomed = await applyAgentPayload(parseAgentPayload(plan('На удаление', '2026-10-03')))
  const keep = await applyAgentPayload(parseAgentPayload(plan('Остаётся', '2026-11-05')))

  await deleteTripCascade(doomed.tripId)

  assert.equal((await db.trips.get(keep.tripId)).title, 'Остаётся')
  assert.equal(await db.trips.count(), 1)
  assert.equal(await db.pois.where('tripId').equals(keep.tripId).count(), 2)
  assert.equal(await db.tickets.where('tripId').equals(keep.tripId).count(), 1)
  assert.equal(await db.packingItems.where('tripId').equals(keep.tripId).count(), 1)
  assert.equal(await db.budgetEntries.where('tripId').equals(keep.tripId).count(), 1)
  assert.equal(await db.days.where('tripId').equals(keep.tripId).count(), 1)
})

test('удаление несуществующей поездки не роняет приложение', async () => {
  const removed = await deleteTripCascade(9999)
  assert.deepEqual(removed, { days: 0, pois: 0, tickets: 0, packingItems: 0, budgetEntries: 0 })
})
