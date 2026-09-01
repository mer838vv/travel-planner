import test from 'node:test'
import assert from 'node:assert/strict'

import {
  forecastRange,
  shiftDays,
  todayIso,
  FORECAST_AHEAD_DAYS,
} from '../src/utils/weather.js'

const TODAY = '2026-09-01'

test('сдвиг даты переживает границу месяца и года', () => {
  assert.equal(shiftDays('2026-09-01', 15), '2026-09-16')
  assert.equal(shiftDays('2026-08-31', 1), '2026-09-01')
  assert.equal(shiftDays('2026-12-31', 1), '2027-01-01')
  assert.equal(shiftDays('2027-01-01', -1), '2026-12-31')
  // Високосный год
  assert.equal(shiftDays('2028-02-28', 1), '2028-02-29')
  assert.equal(shiftDays('мусор', 3), null)
})

test('сегодняшняя дата берётся по местным часам, а не по UTC', () => {
  // 1 сентября 00:30 по местному времени — это ещё 31 августа по UTC.
  // По UTC приложение показало бы вчерашний день.
  const localMidnight = new Date(2026, 8, 1, 0, 30)
  assert.equal(todayIso(localMidnight), '2026-09-01')
})

test('поездка внутри горизонта запрашивается целиком', () => {
  const r = forecastRange('2026-09-03', '2026-09-07', TODAY)
  assert.deepEqual(r, { state: 'ok', from: '2026-09-03', to: '2026-09-07', truncated: false })
})

test('поездка дальше горизонта: не запрос, а объяснение с датой', () => {
  const r = forecastRange('2026-10-03', '2026-10-07', TODAY)
  assert.equal(r.state, 'too-far')
  // Прогноз на 3 октября появится за 15 дней до него — 18 сентября
  assert.equal(r.availableFrom, '2026-09-18')
  assert.equal(shiftDays(r.availableFrom, FORECAST_AHEAD_DAYS), '2026-10-03')
})

test('граница горизонта: последний доступный день ещё запрашивается', () => {
  // Сегодня + 15 — крайняя дата, которую отдаёт Open-Meteo
  assert.equal(forecastRange('2026-09-16', '2026-09-16', TODAY).state, 'ok')
  assert.equal(forecastRange('2026-09-17', '2026-09-17', TODAY).state, 'too-far')
})

test('поездка на границе подрезается, а не пропадает целиком', () => {
  // Главный случай: одна дата вне диапазона роняет ВЕСЬ запрос к
  // Open-Meteo, и раньше такая поездка не показывала ни одного дня,
  // хотя прогноз на её начало существует.
  const r = forecastRange('2026-09-10', '2026-09-25', TODAY)
  assert.deepEqual(r, { state: 'ok', from: '2026-09-10', to: '2026-09-16', truncated: true })
})

test('начало раньше архива подтягивается к доступному', () => {
  const r = forecastRange('2026-01-01', '2026-09-03', TODAY)
  assert.equal(r.state, 'ok')
  assert.equal(r.from, '2026-06-01') // сегодня минус 92 дня
  assert.equal(r.to, '2026-09-03')
  assert.equal(r.truncated, false)
})

test('давняя поездка не показывает ничего', () => {
  assert.equal(forecastRange('2025-01-01', '2025-01-05', TODAY).state, 'too-old')
})

test('пустые даты не роняют расчёт', () => {
  assert.equal(forecastRange(null, null, TODAY).state, 'too-old')
  assert.equal(forecastRange('2026-09-03', undefined, TODAY).state, 'too-old')
})
