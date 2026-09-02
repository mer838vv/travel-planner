function compactDate(iso) {
  return String(iso || '').replaceAll('-', '')
}

function shiftIso(iso, days) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  if (!match) return ''
  const value = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return new Date(value + days * 86400000).toISOString().slice(0, 10)
}

function escapeIcs(value) {
  return String(value || '')
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replaceAll('\n', '\\n')
}

export function daysUntil(startDate, todayDate) {
  const start = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDate || '')
  const today = /^(\d{4})-(\d{2})-(\d{2})$/.exec(todayDate || '')
  if (!start || !today) return null
  const startUtc = Date.UTC(Number(start[1]), Number(start[2]) - 1, Number(start[3]))
  const todayUtc = Date.UTC(Number(today[1]), Number(today[2]) - 1, Number(today[3]))
  return Math.round((startUtc - todayUtc) / 86400000)
}

export function buildTripCalendar(trip) {
  if (!trip?.startDate || !trip?.endDate) throw new Error('У поездки не заполнены даты.')

  const endExclusive = shiftIso(trip.endDate, 1)
  const uid = `trip-${trip.id || 'local'}-${compactDate(trip.startDate)}@travel-planner`
  const description = trip.destinationName
    ? `Поездка: ${trip.destinationName}. Открой Travel Planner и проверь билеты, документы и сборы.`
    : 'Открой Travel Planner и проверь билеты, документы и сборы.'

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Travel Planner//RU',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
    `DTSTART;VALUE=DATE:${compactDate(trip.startDate)}`,
    `DTEND;VALUE=DATE:${compactDate(endExclusive)}`,
    `SUMMARY:${escapeIcs(trip.title || 'Поездка')}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    'BEGIN:VALARM',
    'TRIGGER:-P7D',
    'ACTION:DISPLAY',
    'DESCRIPTION:Проверь документы и билеты',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    'DESCRIPTION:Завтра поездка — проверь сборы',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n')
}

export function downloadTripCalendar(trip) {
  const content = buildTripCalendar(trip)
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `travel-${compactDate(trip.startDate)}.ics`
  link.click()
  URL.revokeObjectURL(url)
}
