import { useCallback, useEffect, useState } from 'react'
import { fetchDailyWeather, forecastRange, weatherEmoji } from '../utils/weather'
import { formatDay, formatShort } from '../utils/formatDate'

/**
 * Погода на даты поездки.
 *
 * Раньше при любой неудаче компонент возвращал null и просто исчезал с
 * экрана. Получалось непонятно: сломалось, не загрузилось или так и надо.
 * Особенно для поездки через месяц — прогноза на такую даль не существует
 * ни у кого, но выглядело это как поломка приложения.
 *
 * Поэтому каждое состояние говорит о себе словами.
 */
export default function WeatherStrip({ lat, lon, startDate, endDate }) {
  const range = forecastRange(startDate, endDate)

  const [days, setDays] = useState(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  const from = range.state === 'ok' ? range.from : null
  const to = range.state === 'ok' ? range.to : null

  const retry = useCallback(() => {
    setFailed(false)
    setDays(null)
    setAttempt((n) => n + 1)
  }, [])

  useEffect(() => {
    if (!from || !to) return
    let cancelled = false

    fetchDailyWeather(lat, lon, from, to)
      .then((d) => { if (!cancelled) setDays(d) })
      .catch(() => { if (!cancelled) setFailed(true) })

    return () => { cancelled = true }
  }, [lat, lon, from, to, attempt])

  // Поездка старше архива: прогноз ей уже ни к чему, молчим.
  if (range.state === 'too-old') return null

  if (range.state === 'too-far') {
    return (
      <div className="weather-strip weather-note">
        <span>
          🔭 Прогноза на эти даты ещё нет: он строится на 15 дней вперёд.
          Загляни после {formatDay(range.availableFrom)}.
        </span>
      </div>
    )
  }

  if (failed) {
    return (
      <div className="weather-strip weather-note">
        <span>☁️ Прогноз не загрузился — похоже, нет сети.</span>
        <button type="button" className="secondary tiny" onClick={retry}>Повторить</button>
      </div>
    )
  }

  if (!days) {
    return (
      <div className="weather-strip weather-note">
        <span className="muted">Смотрю прогноз…</span>
      </div>
    )
  }

  if (days.length === 0) {
    return (
      <div className="weather-strip weather-note">
        <span className="muted">На эти даты прогноза не нашлось.</span>
      </div>
    )
  }

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

      {/* Хвост поездки за горизонтом прогноза: без этой пометки кажется,
          что часть дней потерялась. */}
      {range.truncated && (
        <div className="weather-day weather-tail">
          <span className="muted">дальше прогноза пока нет</span>
        </div>
      )}
    </div>
  )
}
