import test from 'node:test'
import assert from 'node:assert/strict'

import { buildTripCalendar, daysUntil } from '../src/utils/tripCalendar.js'

test('считает дни до поездки без ошибок часового пояса', () => {
  assert.equal(daysUntil('2026-09-10', '2026-09-01'), 9)
  assert.equal(daysUntil('2026-09-01', '2026-09-01'), 0)
  assert.equal(daysUntil('2026-08-31', '2026-09-01'), -1)
})

test('календарь включает всю поездку и два напоминания', () => {
  const calendar = buildTripCalendar({
    id: 7,
    title: 'Рим, осень',
    destinationName: 'Рим; Италия',
    startDate: '2026-10-03',
    endDate: '2026-10-05',
  })

  assert.match(calendar, /DTSTART;VALUE=DATE:20261003/)
  assert.match(calendar, /DTEND;VALUE=DATE:20261006/)
  assert.match(calendar, /SUMMARY:Рим\\, осень/)
  assert.match(calendar, /TRIGGER:-P7D/)
  assert.match(calendar, /TRIGGER:-P1D/)
})

test('не создаёт календарь без дат', () => {
  assert.throws(() => buildTripCalendar({ title: 'Без дат' }), /не заполнены даты/)
})
