// Free Open-Meteo API — no API key.

/**
 * Насколько далеко вперёд и назад Open-Meteo вообще отвечает.
 *
 * Проверено запросами к сервису: сегодня + 15 дней и сегодня − 92. Дата за
 * этой границей возвращает 400 на ВЕСЬ запрос — то есть поездка, у которой
 * граница проходит по середине, раньше не показывала ни одного дня, хотя
 * первая половина прогноза существует. Поэтому диапазон подрезается до
 * доступного, а не отправляется как есть.
 */
export const FORECAST_AHEAD_DAYS = 15
export const FORECAST_BACK_DAYS = 92

/** Сегодняшняя дата по местным часам устройства, «2026-09-01». */
export function todayIso(now = new Date()) {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Сдвиг даты на n суток. Считается в UTC намеренно: обычный new Date(iso)
 * для формата без времени тоже трактует строку как UTC, и смешивать это с
 * местным временем — верный способ уехать на день.
 */
export function shiftDays(iso, n) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  if (!m) return null
  const base = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return new Date(base + n * 86400000).toISOString().slice(0, 10)
}

/**
 * Что вообще можно показать по датам поездки.
 *
 * Возвращает одно из:
 *   { state: 'too-far', availableFrom }  — поездка дальше горизонта прогноза;
 *                                          availableFrom — день, когда прогноз
 *                                          на её начало появится
 *   { state: 'too-old' }                 — поездка старше архива, показывать нечего
 *   { state: 'ok', from, to, truncated }  — что запрашивать; truncated значит,
 *                                          что хвост поездки в горизонт не влез
 */
export function forecastRange(startDate, endDate, today = todayIso()) {
  if (!startDate || !endDate) return { state: 'too-old' }

  const earliest = shiftDays(today, -FORECAST_BACK_DAYS)
  const latest = shiftDays(today, FORECAST_AHEAD_DAYS)

  if (startDate > latest) {
    return { state: 'too-far', availableFrom: shiftDays(startDate, -FORECAST_AHEAD_DAYS) }
  }
  if (endDate < earliest) return { state: 'too-old' }

  const from = startDate < earliest ? earliest : startDate
  const to = endDate > latest ? latest : endDate

  return { state: 'ok', from, to, truncated: to < endDate }
}

/**
 * Прогноз по дням. Бросает исключение при неудаче — молчаливый null не
 * давал отличить «сеть не ответила» от «данных нет», и полоса погоды в обоих
 * случаях просто исчезала с экрана без объяснений.
 */
export async function fetchDailyWeather(lat, lon, startDate, endDate) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&timezone=auto&start_date=${startDate}&end_date=${endDate}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Open-Meteo ответил ${res.status}`)

  const data = await res.json()
  if (!data.daily?.time) throw new Error('Open-Meteo вернул ответ без прогноза')

  return data.daily.time.map((date, i) => ({
    date,
    max: data.daily.temperature_2m_max[i],
    min: data.daily.temperature_2m_min[i],
    rainChance: data.daily.precipitation_probability_max[i],
    code: data.daily.weathercode[i],
  }))
}

export function weatherEmoji(code) {
  if (code === 0) return '☀️'
  if ([1, 2, 3].includes(code)) return '⛅'
  if ([45, 48].includes(code)) return '🌫️'
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return '🌧️'
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄️'
  if ([95, 96, 99].includes(code)) return '⛈️'
  return '🌡️'
}
