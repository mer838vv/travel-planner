import 'fake-indexeddb/auto'
import test from 'node:test'
import assert from 'node:assert/strict'

import { db } from '../src/db.js'
import { ensureFlorenceWalkingDemo, FLORENCE_DEMO_TITLE } from '../src/demoTrip.js'

function memoryStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
}

test.beforeEach(async () => {
  await db.delete()
  await db.open()
})

test('добавляет контрольную Флоренцию с пятью точками и описаниями', async () => {
  const result = await ensureFlorenceWalkingDemo(db, memoryStorage())

  assert.equal(result.created, true)
  const trip = await db.trips.get(result.tripId)
  assert.equal(trip.title, FLORENCE_DEMO_TITLE)

  const [day] = await db.days.where('tripId').equals(result.tripId).toArray()
  const pois = await db.pois.where('dayId').equals(day.id).sortBy('order')
  assert.equal(pois.length, 5)
  assert.ok(pois.every((poi) => poi.description && Number.isFinite(poi.lat) && Number.isFinite(poi.lon)))
})

test('повторный запуск не создаёт дубликат и не меняет другие поездки', async () => {
  const storage = memoryStorage()
  await db.trips.add({ title: 'Моя поездка', startDate: '2026-10-01', endDate: '2026-10-02' })

  await ensureFlorenceWalkingDemo(db, storage)
  const second = await ensureFlorenceWalkingDemo(db, storage)

  assert.equal(second.created, false)
  assert.equal(await db.trips.count(), 2)
  assert.equal(await db.trips.filter((trip) => trip.title === FLORENCE_DEMO_TITLE).count(), 1)
})
