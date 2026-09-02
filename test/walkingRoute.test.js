import test from 'node:test'
import assert from 'node:assert/strict'

import { googleMapsWalkingUrl, splitWalkingRoute, visitDurationText } from '../src/utils/walkingRoute.js'

const points = Array.from({ length: 8 }, (_, index) => ({
  id: index + 1,
  name: `Место ${index + 1}`,
  lat: 43.77 + index / 100,
  lon: 11.25 + index / 100,
  durationMin: 60,
}))

test('ссылка открывает пешеходный маршрут с промежуточными точками', () => {
  const url = new URL(googleMapsWalkingUrl(points.slice(0, 5)))

  assert.equal(url.origin, 'https://www.google.com')
  assert.equal(url.searchParams.get('api'), '1')
  assert.equal(url.searchParams.get('travelmode'), 'walking')
  assert.equal(url.searchParams.get('origin'), '43.77,11.25')
  assert.equal(url.searchParams.get('destination'), '43.81,11.29')
  assert.equal(url.searchParams.get('waypoints').split('|').length, 3)
})

test('длинная прогулка делится на мобильные этапы без потери мест', () => {
  const stages = splitWalkingRoute(points)

  assert.deepEqual(stages.map((stage) => stage.map((point) => point.id)), [
    [1, 2, 3, 4, 5],
    [5, 6, 7, 8],
  ])
})

test('не строит маршрут для одной точки и считает время посещений', () => {
  assert.equal(googleMapsWalkingUrl(points.slice(0, 1)), null)
  assert.deepEqual(splitWalkingRoute(points.slice(0, 1)), [])
  assert.equal(visitDurationText(points.slice(0, 3)), '3 ч на посещения')
})
