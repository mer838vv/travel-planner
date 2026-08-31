const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]

const WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота']

// Разбираем строку сами, а не через new Date(iso): для формата без времени
// движок трактует строку как UTC, и в минусовых поясах дата уезжает на день назад.
function parts(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  if (!m) return null
  return { year: Number(m[1]), month: Number(m[2]) - 1, day: Number(m[3]) }
}

/** «1 сентября» или «1 сентября 2027», если год не текущий. */
export function formatDay(iso, currentYear = new Date().getFullYear()) {
  const p = parts(iso)
  if (!p) return iso || ''
  const base = `${p.day} ${MONTHS[p.month]}`
  return p.year === currentYear ? base : `${base} ${p.year}`
}

/** «вторник, 1 сентября» */
export function formatDayWithWeekday(iso, currentYear) {
  const p = parts(iso)
  if (!p) return iso || ''
  const weekday = WEEKDAYS[new Date(p.year, p.month, p.day).getDay()]
  return `${weekday}, ${formatDay(iso, currentYear)}`
}

/** «1 сентября» для однодневной поездки, иначе «1 — 7 сентября». */
export function formatRange(startIso, endIso, currentYear) {
  if (!startIso) return ''
  if (!endIso || startIso === endIso) return formatDay(startIso, currentYear)

  const a = parts(startIso)
  const b = parts(endIso)
  if (!a || !b) return `${formatDay(startIso, currentYear)} — ${formatDay(endIso, currentYear)}`

  // В пределах одного месяца название месяца не повторяем: «1 — 7 сентября».
  if (a.year === b.year && a.month === b.month) {
    const year = a.year === currentYear ? '' : ` ${a.year}`
    return `${a.day} — ${b.day} ${MONTHS[a.month]}${year}`
  }
  return `${formatDay(startIso, currentYear)} — ${formatDay(endIso, currentYear)}`
}

/** «09-01» для узких плашек вроде дней и погоды. */
export function formatShort(iso) {
  const p = parts(iso)
  return p ? `${p.day} ${MONTHS[p.month].slice(0, 3)}` : iso || ''
}
