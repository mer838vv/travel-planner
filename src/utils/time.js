/**
 * Время рейсов всегда местное: «вылет 07:05» в Риме и «прилёт 10:45» в
 * Стамбуле — это разные часовые пояса, и вычитать одно из другого напрямую
 * нельзя. Чтобы считать отсчёты и длительность, местное время сначала
 * переводится в абсолютный момент по его поясу.
 */

/**
 * Насколько часы в поясе tz сдвинуты относительно UTC в конкретный момент.
 * Считается через Intl, поэтому переход на летнее время учитывается сам.
 */
function zoneOffsetMs(instant, tz) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(instant)

  const v = {}
  for (const p of parts) if (p.type !== 'literal') v[p.type] = p.value

  // hour === '24' у полуночи в некоторых движках — приводим к 0
  const asIfUtc = Date.UTC(
    Number(v.year), Number(v.month) - 1, Number(v.day),
    Number(v.hour) % 24, Number(v.minute), Number(v.second)
  )
  return asIfUtc - instant.getTime()
}

/**
 * «2026-09-01T07:05» + «Europe/Rome» → момент времени.
 *
 * Смещение зависит от самого момента, а момент — от смещения, поэтому
 * приближаемся в два прохода: первый даёт грубую оценку, второй уточняет
 * её у границы перевода часов.
 */
export function zonedTimeToUtc(localISO, tz) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(String(localISO || ''))
  if (!m || !tz) return null

  const naive = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]))

  let instant = naive - zoneOffsetMs(new Date(naive), tz)
  instant = naive - zoneOffsetMs(new Date(instant), tz)

  const result = new Date(instant)
  return Number.isNaN(result.getTime()) ? null : result
}

/** «07:05» из строки местного времени — без пересчёта поясов. */
export function localClock(localISO) {
  const m = /[T ](\d{2}):(\d{2})/.exec(String(localISO || ''))
  return m ? `${m[1]}:${m[2]}` : ''
}

/** «4 ч 55 мин», «45 мин», «2 ч». Отрицательное и мусор → null. */
export function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return null
  const totalMinutes = Math.round(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (!hours) return `${minutes} мин`
  if (!minutes) return `${hours} ч`
  return `${hours} ч ${minutes} мин`
}

/**
 * Сколько осталось до момента.
 * `past: true` означает, что момент уже прошёл — вызывающий решает, что
 * показать: «через 20 мин» или «20 мин назад».
 */
export function countdown(target, now = new Date()) {
  if (!target) return null
  const diff = target.getTime() - now.getTime()
  const past = diff < 0
  return { past, ms: Math.abs(diff), text: formatDuration(Math.abs(diff)) }
}
