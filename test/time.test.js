import test from 'node:test'
import assert from 'node:assert/strict'

import { zonedTimeToUtc, localClock, formatDuration, countdown } from '../src/utils/time.js'

test('местное время переводится в момент по своему поясу', () => {
  // Настоящий рейс 1 сентября 2026: Рим летом +2, Стамбул и Москва +3
  assert.equal(zonedTimeToUtc('2026-09-01T07:05', 'Europe/Rome').toISOString(), '2026-09-01T05:05:00.000Z')
  assert.equal(zonedTimeToUtc('2026-09-01T10:45', 'Europe/Istanbul').toISOString(), '2026-09-01T07:45:00.000Z')
  assert.equal(zonedTimeToUtc('2026-09-01T15:50', 'Europe/Istanbul').toISOString(), '2026-09-01T12:50:00.000Z')
  assert.equal(zonedTimeToUtc('2026-09-01T20:45', 'Europe/Moscow').toISOString(), '2026-09-01T17:45:00.000Z')
})

test('зимнее время учитывается, а не хардкодится летнее смещение', () => {
  // Рим зимой +1, а не +2 — если бы смещение было зашито, тест бы упал
  assert.equal(zonedTimeToUtc('2026-01-15T07:05', 'Europe/Rome').toISOString(), '2026-01-15T06:05:00.000Z')
  // Москва перевод часов не делает: и зимой, и летом +3
  assert.equal(zonedTimeToUtc('2026-01-15T20:45', 'Europe/Moscow').toISOString(), '2026-01-15T17:45:00.000Z')
})

test('длительность перелёта считается между поясами верно', () => {
  const depart = zonedTimeToUtc('2026-09-01T15:50', 'Europe/Istanbul')
  const arrive = zonedTimeToUtc('2026-09-01T20:45', 'Europe/Moscow')
  // По часам на стене разница 4:55, и в этом случае она совпадает с реальной
  assert.equal(formatDuration(arrive - depart), '4 ч 55 мин')

  // А здесь часы врут: вылет 07:05, прилёт 10:45, но летели 2 ч 40 мин
  const romeOut = zonedTimeToUtc('2026-09-01T07:05', 'Europe/Rome')
  const istIn = zonedTimeToUtc('2026-09-01T10:45', 'Europe/Istanbul')
  assert.equal(formatDuration(istIn - romeOut), '2 ч 40 мин')
})

test('пересадка считается между прилётом и вылетом', () => {
  const arrive = zonedTimeToUtc('2026-09-01T10:45', 'Europe/Istanbul')
  const depart = zonedTimeToUtc('2026-09-01T15:50', 'Europe/Istanbul')
  assert.equal(formatDuration(depart - arrive), '5 ч 5 мин')
})

test('мусор на входе не роняет расчёт', () => {
  assert.equal(zonedTimeToUtc('', 'Europe/Rome'), null)
  assert.equal(zonedTimeToUtc('01.09.2026 07:05', 'Europe/Rome'), null)
  assert.equal(zonedTimeToUtc('2026-09-01T07:05', null), null)
  assert.equal(zonedTimeToUtc('2026-09-01T07:05', undefined), null)
})

test('форматирование длительности', () => {
  assert.equal(formatDuration(45 * 60000), '45 мин')
  assert.equal(formatDuration(2 * 3600000), '2 ч')
  assert.equal(formatDuration(2 * 3600000 + 40 * 60000), '2 ч 40 мин')
  assert.equal(formatDuration(-1000), null, 'отрицательное не форматируем')
  assert.equal(formatDuration(NaN), null)
})

test('обратный отсчёт различает будущее и прошлое', () => {
  const now = new Date('2026-09-01T04:00:00Z')
  const soon = new Date('2026-09-01T05:05:00Z')

  const ahead = countdown(soon, now)
  assert.equal(ahead.past, false)
  assert.equal(ahead.text, '1 ч 5 мин')

  const behind = countdown(new Date('2026-09-01T03:30:00Z'), now)
  assert.equal(behind.past, true)
  assert.equal(behind.text, '30 мин')

  assert.equal(countdown(null, now), null)
})

test('местное время читается как есть, без пересчёта', () => {
  assert.equal(localClock('2026-09-01T07:05'), '07:05')
  assert.equal(localClock('2026-09-01 15:50'), '15:50')
  assert.equal(localClock('ерунда'), '')
})
