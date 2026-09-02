import 'fake-indexeddb/auto'
import test from 'node:test'
import assert from 'node:assert/strict'

import { db } from '../src/db.js'
import { ensureFlorenceWalkingDemo, FLORENCE_DEMO_TITLE } from '../src/demoTrip.js'
import { analyzeRouteQuality } from '../src/utils/routeGuide.js'

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
  assert.equal(day.routeStart.type, 'station')
  assert.equal(day.routeStart.name, 'Firenze Santa Maria Novella')
  assert.equal(analyzeRouteQuality(day, pois).ready, true)
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

test('обновляет старый технический пример, не создавая вторую поездку', async () => {
  const tripId = await db.trips.add({
    title: 'Проверка прогулки: Флоренция', demoKey: 'florence-walking-demo-v1',
    startDate: '2026-09-15', endDate: '2026-09-15',
  })
  const dayId = await db.days.add({ tripId, date: '2026-09-15', order: 0 })
  await db.pois.add({ tripId, dayId, name: 'Старая точка', lat: 1, lon: 2, order: 0 })

  const result = await ensureFlorenceWalkingDemo(db, memoryStorage())
  const trip = await db.trips.get(tripId)
  const day = await db.days.get(dayId)
  const pois = await db.pois.where('dayId').equals(dayId).sortBy('order')

  assert.equal(result.upgraded, true)
  assert.equal(await db.trips.count(), 1)
  assert.equal(trip.title, FLORENCE_DEMO_TITLE)
  assert.equal(pois.length, 5)
  assert.equal(analyzeRouteQuality(day, pois).ready, true)
})
