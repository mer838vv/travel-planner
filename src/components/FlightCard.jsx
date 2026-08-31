import { useEffect, useState } from 'react'
import { countdown, localClock, formatDuration } from '../utils/time'
import { taxiAddress } from '../utils/flights'

/** Тикающее «сейчас»: карточка живёт отсчётами, их надо обновлять. */
function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

export default function FlightCard({ segment, connection }) {
  const now = useNow()
  const [copied, setCopied] = useState(false)

  if (!segment) return null

  const toDepart = countdown(segment.departAt, now)
  const address = taxiAddress(segment.from)

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Без доступа к буферу подсказываем выделить руками, а не молчим
      setCopied('manual')
    }
  }

  return (
    <div className="flight-card">
      <div className="flight-top">
        <span className="flight-when">
          {toDepart
            ? toDepart.past ? `вылетел ${toDepart.text} назад` : `через ${toDepart.text}`
            : 'время не указано'}
        </span>
        <span className="flight-number">{segment.number}</span>
      </div>

      <div className="flight-route">
        <Endpoint place={segment.from} time={segment.departLocal} />
        <div className="flight-arrow">
          <span>✈</span>
          {segment.departAt && segment.arriveAt && (
            <small>{formatDuration(segment.arriveAt - segment.departAt)}</small>
          )}
        </div>
        <Endpoint place={segment.to} time={segment.arriveLocal} align="right" />
      </div>

      {(segment.seats.length > 0 || segment.pnr) && (
        <div className="flight-chips">
          {segment.pnr && <span>Бронь {segment.pnr}</span>}
          {segment.seats.length > 0 && <span>Места {segment.seats.join(', ')}</span>}
        </div>
      )}

      <div className="flight-deadlines">
        <Deadline
          label="Выезжать"
          at={segment.leaveAt}
          clock={localClock(segment.leaveAtLocal)}
          note={segment.leaveNote}
          now={now}
          accent
        />
        <Deadline
          label="Регистрация закрывается"
          at={segment.checkinClosesAt}
          clock={localClock(segment.checkinClosesLocal)}
          now={now}
        />
      </div>

      {address && (
        <button type="button" className="secondary" onClick={copyAddress}>
          {copied === true ? '✓ Скопировано' : copied === 'manual' ? address : '🚕 Скопировать адрес для такси'}
        </button>
      )}

      {connection && <ConnectionNote connection={connection} />}
    </div>
  )
}

function Endpoint({ place, time, align }) {
  return (
    <div className={`flight-point${align === 'right' ? ' right' : ''}`}>
      <span className="flight-iata">{place?.iata || '—'}</span>
      <span className="flight-clock">{localClock(time) || '--:--'}</span>
      {/* Терминал крупно и отдельно: в городах с несколькими аэропортами и
          терминалами именно он решает, куда ехать. */}
      {place?.terminal && <span className="flight-terminal">Терминал {place.terminal}</span>}
      <span className="flight-place">{place?.name}</span>
    </div>
  )
}

function Deadline({ label, at, clock, note, now, accent }) {
  if (!at) return null
  const left = countdown(at, now)

  return (
    <div className={`deadline${accent ? ' accent' : ''}${left.past ? ' past' : ''}`}>
      <div className="deadline-head">
        <strong>{label} {clock}</strong>
        <span>{left.past ? `${left.text} назад` : `через ${left.text}`}</span>
      </div>
      {note && <p className="deadline-note">{note}</p>}
    </div>
  )
}

// По раздельным билетам транзитной зоной обычно не обойтись: нужно выйти
// через паспортный контроль в страну пересадки и зайти на вылет заново.
// Одна ручная кладь тут не помогает — только избавляет от ленты багажа.
const SEPARATE_TICKET_LOOP =
  'Билеты разными бронями. Скорее всего придётся выйти через паспортный контроль и зайти на вылет заново — транзитная зона обычно только для единого билета, и ручная кладь от этого не спасает. Посадочный на второй рейс получай сам, заранее.'

function ConnectionNote({ connection }) {
  const gap = formatDuration(connection.gapMs)

  const text = connection.changesAirport
    ? `Пересадка со сменой аэропорта: прилёт в ${connection.from.to?.iata}, вылет из ${connection.to.from?.iata}. Нужен переезд между аэропортами, ${gap} на всё.`
    : connection.level === 'critical'
      ? `На пересадку всего ${gap}. Этого почти наверняка не хватит.${connection.separateTickets ? ' ' + SEPARATE_TICKET_LOOP : ''}`
      : connection.level === 'risky'
        ? `На пересадку ${gap}. ${connection.separateTickets
            ? `${SEPARATE_TICKET_LOOP} Если первый рейс опоздает, пересаживать тебя никто не обязан — на таких стыковках советуют закладывать от трёх часов.`
            : 'Запас небольшой, но билет единый — при опоздании пересадит перевозчик.'}`
        : `На пересадку ${gap} — запас есть.${connection.separateTickets ? ' ' + SEPARATE_TICKET_LOOP : ''}`

  return <div className={`connection-note ${connection.level}`}>{text}</div>
}
