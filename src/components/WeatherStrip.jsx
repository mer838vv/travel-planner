import { useEffect, useState } from 'react'
import { fetchDailyWeather, weatherEmoji } from '../utils/weather'
import { formatShort } from '../utils/formatDate'

export default function WeatherStrip({ lat, lon, startDate, endDate }) {
  const [days, setDays] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchDailyWeather(lat, lon, startDate, endDate)
      .then((d) => { if (!cancelled) setDays(d) })
      .catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [lat, lon, startDate, endDate])

  if (error || (days && days.length === 0)) return null
  if (!days) return null

  return (
    <div className="weather-strip">
      {days.map((d) => (
        <div key={d.date} className="weather-day">
          <span className="date">{formatShort(d.date)}</span>
          <span className="emoji">{weatherEmoji(d.code)}</span>
          <span>{Math.round(d.min)}°–{Math.round(d.max)}°</span>
          {d.rainChance > 30 && <span className="rain">☔ {d.rainChance}%</span>}
        </div>
      ))}
    </div>
  )
}
