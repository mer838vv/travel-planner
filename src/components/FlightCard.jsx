import { useEffect, useState } from 'react'
import { countdown, localClock, formatDuration } from '../utils/time'
import { formatDay } from '../utils/formatDate'
import { taxiAddress } from '../utils/flights'
import TransferCard from './TransferCard'

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

      <TransferCard transfer={segment.transfer} />
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

/**
 * Что на самом деле меняют раздельные билеты.
 *
 * Раньше здесь стояло утверждение, что по разным броням придётся выйти через
 * паспортный контроль и зайти на вылет заново, а ручная кладь «от этого не
 * спасает». Это оказалось неправдой: в Стамбуле трансферный контроль
 * проходится по посадочному на второй рейс, без въезда в Турцию, и разные
 * брони этому не мешают.
 *
 * Раздельные билеты меняют три вещи — и ни одна из них не запрещает транзит.
 * Ручная кладь как раз снимает главное препятствие: сдаваемый багаж пришлось
 * бы получать в зале выдачи, а он за границей.
 *
 * Пройдёшь ли конкретный аэропорт без въезда — вопрос к аэропорту и паспорту,
 * а не к числу броней. Проверяет это скилл `transit-check`; пока проверки
 * нет, приложение так и говорит, вместо того чтобы пугать или обнадёживать.
 */
const SEPARATE_TICKET_FACTS =
  'Билеты разными бронями: багаж не проследует сам, посадочный на второй рейс получи заранее онлайн и сохрани офлайн, а при опоздании первого рейса пересаживать никто не обязан.'

function timeText(connection, gap) {
  if (connection.changesAirport) {
    return `Пересадка со сменой аэропорта: прилёт в ${connection.from.to?.iata}, вылет из ${connection.to.from?.iata}. Нужен переезд между аэропортами, ${gap} на всё.`
  }
  if (connection.level === 'critical') return `На пересадку всего ${gap} — этого, скорее всего, не хватит.`
  if (connection.level === 'risky') {
    return connection.separateTickets
      ? `На пересадку ${gap} — запас небольшой, а на раздельных билетах советуют закладывать от трёх часов.`
      : `На пересадку ${gap} — запас небольшой, но билет единый: при опоздании пересадит перевозчик.`
  }
  return `На пересадку ${gap} — запас есть.`
}

function ConnectionNote({ connection }) {
  const gap = formatDuration(connection.gapMs)

  return (
    <div className={`connection-note ${connection.level}`}>
      <p>{timeText(connection, gap)}</p>
      {connection.separateTickets && <p>{SEPARATE_TICKET_FACTS}</p>}
      <TransitNote transit={connection.transit} airport={connection.airport} />
    </div>
  )
}

/**
 * Проверенный транзит — или честное признание, что проверки не было.
 *
 * Отдельный блок, а не строчка в общем тексте: это единственное место, где
 * приложение говорит о границе, и человек должен видеть, на чём основано
 * утверждение — дату проверки и источник.
 */
function TransitNote({ transit, airport }) {
  if (!transit || transit.verdict === 'unknown') {
    return (
      <p className="transit-unknown">
        Пройдёшь ли транзитную зону без въезда в страну — зависит от аэропорта и
        паспорта{airport?.iata ? ` (${airport.iata})` : ''}. Не проверено.
      </p>
    )
  }

  const ok = transit.verdict === 'ok'

  return (
    <div className={`transit-note ${ok ? 'ok' : 'entry'}`}>
      <strong>
        {ok
          ? `Транзит без въезда: проходится${transit.airport ? ` в ${transit.airport}` : ''}`
          : 'Придётся въезжать в страну пересадки'}
      </strong>

      {transit.steps.length > 0 && (
        <ol className="transit-steps">
          {transit.steps.map((step, i) => <li key={i}>{step}</li>)}
        </ol>
      )}

      {transit.boardingPass && <p>🎫 {transit.boardingPass}</p>}
      {transit.baggage && <p>🧳 {transit.baggage}</p>}
      {transit.visaNote && <p>🛂 {transit.visaNote}</p>}

      {transit.warnings.map((warning, i) => (
        <p key={i} className="transit-warning">⚠️ {warning}</p>
      ))}

      {/* Дата и источник обязательны: транзитные правила меняются, и без
          них это утверждение ничем не отличается от догадки. */}
      <p className="transit-checked">
        {transit.checkedOn && `Проверено ${formatDay(transit.checkedOn)}`}
        {transit.citizenship && ` · паспорт ${transit.citizenship}`}
        {transit.sources.map((s, i) => (
          <span key={i}>
            {' · '}
            <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a>
          </span>
        ))}
      </p>
    </div>
  )
}
