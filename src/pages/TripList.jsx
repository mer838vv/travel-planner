import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router-dom'
import { db, dateRangeDays, DEFAULT_PACKING_TEMPLATE } from '../db'
import { searchPlace } from '../utils/geocode'
import { exportAllData, importAllData, readBackup, analyzeBackup } from '../utils/backup'
import { resetAppCache } from '../pwa'
import AgentImport from '../components/AgentImport'
import { formatDay, formatRange } from '../utils/formatDate'
import { plural } from '../utils/plural'
import { todayIso } from '../utils/weather'
import { daysUntil } from '../utils/tripCalendar'

export default function TripList() {
  const trips = useLiveQuery(() => db.trips.orderBy('startDate').toArray(), [])
  const [showForm, setShowForm] = useState(false)
  const [showAgent, setShowAgent] = useState(false)
  // Разобранный бэкап, ожидающий подтверждения: {payload, summary}
  const [pendingImport, setPendingImport] = useState(null)
  const [importStatus, setImportStatus] = useState(null)
  const navigate = useNavigate()

  async function pickBackup(e) {
    const file = e.target.files[0]
    // Сброс сразу: иначе повторный выбор того же файла не даст change.
    e.target.value = ''
    if (!file) return

    setImportStatus(null)
    try {
      const payload = await readBackup(file)
      setPendingImport({ payload, summary: await analyzeBackup(payload) })
    } catch (err) {
      setPendingImport(null)
      setImportStatus({
        ok: false,
        text: err?.userFacing ? err.message : 'Не удалось прочитать файл бэкапа.',
      })
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Мои поездки</h1>
        <div className="header-actions">
          <button className="secondary" onClick={() => exportAllData()}>Экспорт</button>
          <label className="button-like">
            Импорт
            <input
              type="file"
              accept="application/json"
              style={{ display: 'none' }}
              onChange={pickBackup}
            />
          </label>
        </div>
      </div>

      {importStatus && (
        <div className={`agent-status ${importStatus.ok ? 'ok' : 'err'}`}>{importStatus.text}</div>
      )}

      {pendingImport && (
        <ImportConfirm
          summary={pendingImport.summary}
          onCancel={() => setPendingImport(null)}
          onConfirm={async () => {
            try {
              await importAllData(pendingImport.payload)
              const { incoming } = pendingImport.summary
              setPendingImport(null)
              setImportStatus({
                ok: true,
                // Глагол впереди намеренно: «1 поездка загружено» —
                // рассогласование, а безличное «загружено 1 поездка»
                // работает для всех чисел разом.
                text: `Готово: из бэкапа загружено ${plural(incoming.trips, ['поездка', 'поездки', 'поездок'])}.`,
              })
            } catch {
              setPendingImport(null)
              setImportStatus({ ok: false, text: 'Импорт не удался — база отклонила запись. Данные на устройстве не тронуты.' })
            }
          }}
        />
      )}

      {!trips && <p className="muted">Загрузка…</p>}
      {trips && trips.length === 0 && !showForm && !showAgent && (
        <div className="empty">Пока нет ни одной поездки.<br />Создай вручную или вставь план от агента.</div>
      )}

      <ul className="trip-list">
        {trips?.map((trip) => <TripListItem key={trip.id} trip={trip} />)}
      </ul>

      {!showForm && !showAgent && (
        <div className="main-actions">
          <button className="big" onClick={() => setShowAgent(true)}>
            📋 Вставить план от агента
          </button>
          <button className="secondary big" onClick={() => setShowForm(true)}>
            + Создать поездку вручную
          </button>
        </div>
      )}

      {showAgent && <AgentImport onClose={() => setShowAgent(false)} />}

      {showForm && (
        <NewTripForm
          onCancel={() => setShowForm(false)}
          onCreated={(id) => navigate(`/trip/${id}`)}
        />
      )}

      <BuildStamp />
    </div>
  )
}

function TripListItem({ trip }) {
  const packing = useLiveQuery(
    () => db.packingItems.where('tripId').equals(trip.id).toArray(),
    [trip.id]
  )
  const today = todayIso()
  const untilStart = daysUntil(trip.startDate, today)
  const untilEnd = daysUntil(trip.endDate, today)
  const packed = packing?.filter((item) => item.packed).length || 0
  const documents = packing?.filter((item) => item.category === 'Документы') || []
  const documentsReady = documents.filter((item) => item.packed).length

  let status = ''
  if (untilStart > 0) status = `через ${plural(untilStart, ['день', 'дня', 'дней'])}`
  else if (untilEnd != null && untilEnd >= 0) status = 'сейчас в поездке'
  else if (untilEnd != null) status = 'поездка завершена'

  return (
    <li>
      <Link to={`/trip/${trip.id}`}>
        <strong>{trip.title}</strong>
        <span className="trip-dates">{formatRange(trip.startDate, trip.endDate)}{status ? ` · ${status}` : ''}</span>
        {trip.destinationName && <span className="muted">{trip.destinationName}</span>}
        {packing && packing.length > 0 && (
          <span className="trip-readiness">
            <span className={documents.length > 0 && documentsReady === documents.length ? 'ready' : ''}>
              {documents.length > 0 ? `Документы ${documentsReady}/${documents.length}` : 'Документы не добавлены'}
            </span>
            <span className={packed === packing.length ? 'ready' : ''}>
              Сборы {packed}/{packing.length}
            </span>
          </span>
        )}
      </Link>
    </li>
  )
}

/**
 * Подтверждение перед импортом бэкапа.
 *
 * Импорт кладёт записи по их собственным id, то есть может молча заменить
 * то, что уже есть на устройстве. Раньше он делал это без единого вопроса:
 * выбрал файл — и часть поездок уже перезаписана, откатить нечем.
 *
 * Поэтому здесь показывается цена решения до нажатия: что лежит в файле,
 * что добавится, что заменится целиком и — отдельно и заметнее всего —
 * какие посторонние поездки пострадают от совпадения id.
 */
function ImportConfirm({ summary, onCancel, onConfirm }) {
  const [busy, setBusy] = useState(false)
  const { incoming, replacedTrips, touchedTrips, newTrips, exportedAt } = summary

  const contents = [
    plural(incoming.trips, ['поездка', 'поездки', 'поездок']),
    incoming.days && plural(incoming.days, ['день', 'дня', 'дней']),
    incoming.pois && plural(incoming.pois, ['точка', 'точки', 'точек']),
    incoming.tickets && plural(incoming.tickets, ['билет', 'билета', 'билетов']),
    incoming.packingItems && plural(incoming.packingItems, ['вещь', 'вещи', 'вещей']),
    incoming.budgetEntries && plural(incoming.budgetEntries, ['трата', 'траты', 'трат']),
  ].filter(Boolean)

  const destructive = replacedTrips.length > 0 || touchedTrips.length > 0

  async function confirm() {
    setBusy(true)
    await onConfirm()
  }

  return (
    <div className={`card${destructive ? ' danger-card' : ''}`}>
      <div>
        <h2>Загрузить бэкап?</h2>
        <p className="agent-hint">
          В файле: {contents.join(', ')}
          {exportedAt ? ` · сделан ${formatDay(exportedAt.slice(0, 10))}` : ''}.
        </p>

        {newTrips > 0 && (
          <p className="agent-hint">
            Добавится {plural(newTrips, ['новая поездка', 'новые поездки', 'новых поездок'])}.
          </p>
        )}

        {replacedTrips.length > 0 && (
          <p className="agent-hint">
            Заменятся целиком: {replacedTrips.map((t) => `«${t.title}»`).join(', ')}.
          </p>
        )}

        {/* Самое опасное место: запись с чужого устройства встаёт на место
            записи, принадлежащей другой поездке, и та тихо портится. */}
        {touchedTrips.length > 0 && (
          <p className="agent-hint">
            ⚠️ Пострадают поездки, которых в бэкапе нет: {touchedTrips
              .map((t) => `«${t.title}» — ${plural(t.rows, ['запись', 'записи', 'записей'])}`)
              .join(', ')}. Совпали внутренние номера записей.
          </p>
        )}

        {!destructive && (
          <p className="agent-hint">Ничего из того, что уже есть на устройстве, не пострадает.</p>
        )}

        {destructive && (
          <p className="agent-hint">Отменить это будет нельзя. Если жалко — сначала сделай «Экспорт».</p>
        )}
      </div>

      <div className="row">
        <button className={destructive ? 'danger' : ''} onClick={confirm} disabled={busy}>
          {busy ? 'Загружаю…' : destructive ? 'Да, заменить' : 'Загрузить'}
        </button>
        <button className="secondary" onClick={onCancel} disabled={busy}>Отмена</button>
      </div>
    </div>
  )
}

/**
 * Метка версии и аварийная кнопка рядом с ней.
 *
 * Кнопка стоит именно здесь: когда возникает вопрос «а свежая ли это
 * версия», взгляд уже на метке — и починка должна быть под рукой, а не в
 * настройках телефона.
 */
function BuildStamp() {
  const [resetting, setResetting] = useState(false)

  async function reset() {
    setResetting(true)
    await resetAppCache()
  }

  return (
    <div className="build-stamp">
      <span>версия {__BUILD_STAMP__} UTC</span>
      <button type="button" className="link-reset" onClick={reset} disabled={resetting}>
        Обновить приложение
      </button>
      {resetting && <span className="reset-toast">Кеш очищен, перезагружаю…</span>}
    </div>
  )
}

function NewTripForm({ onCancel, onCreated }) {
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [destQuery, setDestQuery] = useState('')
  const [destOptions, setDestOptions] = useState([])
  const [destination, setDestination] = useState(null)
  const [saving, setSaving] = useState(false)

  async function handleSearch() {
    const results = await searchPlace(destQuery)
    setDestOptions(results)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title || !startDate || !endDate) return
    setSaving(true)

    const tripId = await db.trips.add({
      title,
      startDate,
      endDate,
      destinationName: destination?.name || destQuery || null,
      destinationLat: destination?.lat || null,
      destinationLon: destination?.lon || null,
      createdAt: new Date().toISOString(),
    })

    const dates = dateRangeDays(startDate, endDate)
    let order = 0
    for (const date of dates) {
      await db.days.add({ tripId, date, order: order++ })
    }

    for (const [category, items] of DEFAULT_PACKING_TEMPLATE) {
      for (const name of items) {
        await db.packingItems.add({ tripId, category, name, packed: false, qty: 1 })
      }
    }

    setSaving(false)
    onCreated(tripId)
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <label>
        Название поездки
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например: Рим, октябрь" required />
      </label>
      <div className="row">
        <label>
          Начало
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </label>
        <label>
          Конец
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
        </label>
      </div>
      <label>
        Пункт назначения (для карты и погоды)
        <div className="row">
          <input
            value={destQuery}
            onChange={(e) => setDestQuery(e.target.value)}
            placeholder="Город или место"
          />
          <button type="button" className="secondary" onClick={handleSearch}>Найти</button>
        </div>
      </label>
      {destOptions.length > 0 && (
        <ul className="suggestions">
          {destOptions.map((opt, i) => (
            <li key={i}>
              <button type="button" onClick={() => { setDestination(opt); setDestOptions([]); setDestQuery(opt.name) }}>
                {opt.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="row">
        <button type="submit" disabled={saving}>{saving ? 'Создаю…' : 'Создать поездку'}</button>
        <button type="button" className="secondary" onClick={onCancel}>Отмена</button>
      </div>
    </form>
  )
}
