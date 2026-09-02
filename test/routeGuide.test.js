import test from 'node:test'
import assert from 'node:assert/strict'

import { analyzeRouteQuality, normalizePoiAnalysis, normalizeRouteStart } from '../src/utils/routeGuide.js'

const richPoi = {
  description: 'Подробное описание достопримечательности, которое объясняет её место в истории города и помогает понять, зачем она включена в маршрут.',
  durationMin: 60,
  analysis: {
    whyVisit: 'Это важная остановка, потому что она связывает историю города, архитектуру и события целой эпохи в одном месте.',
    highlights: ['Первая важная деталь', 'Вторая важная деталь'],
    practicalTip: 'Приходите к открытию и заранее проверьте вход на официальной схеме комплекса.',
    sourceUrl: 'https://example.org/official',
  },
}

test('принимает только реальную точку старта с координатами', () => {
  assert.equal(normalizeRouteStart({ type: 'hotel', name: 'Без координат' }), null)
  assert.equal(normalizeRouteStart({ type: 'hotel', name: 'За пределами карты', lat: 100, lon: 200 }), null)
  assert.deepEqual(normalizeRouteStart({ type: 'station', name: 'Termini', lat: '41.9', lon: 12.5 }), {
    type: 'station', name: 'Termini', address: null, lat: 41.9, lon: 12.5,
  })
})

test('отбрасывает небезопасную ссылку источника', () => {
  const analysis = normalizePoiAnalysis({ whyVisit: 'Текст', sourceUrl: 'javascript:alert(1)' })
  assert.equal(analysis.sourceUrl, null)
})

test('маршрут считается проработанным только со стартом, логикой и полными карточками', () => {
  const day = {
    routeStart: { type: 'hotel', name: 'Hotel', lat: 41.9, lon: 12.5 },
    routeRationale: 'Порядок остановок учитывает билеты на время, сокращает возвраты и оставляет длинный музей на прохладную часть дня после перерыва.',
  }
  assert.equal(analyzeRouteQuality(day, [richPoi, richPoi]).ready, true)
  assert.equal(analyzeRouteQuality({ ...day, routeStart: null }, [richPoi, richPoi]).ready, false)
  assert.equal(analyzeRouteQuality(day, [{ ...richPoi, analysis: null }, richPoi]).detailed, 1)
})
