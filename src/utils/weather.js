// Free Open-Meteo API — no API key. Only returns data for dates within its forecast window.
export async function fetchDailyWeather(lat, lon, startDate, endDate) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&timezone=auto&start_date=${startDate}&end_date=${endDate}`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json()
  if (!data.daily) return null
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
