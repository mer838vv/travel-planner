import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, deleteTripCascade } from '../db'
import RouteTab from '../components/RouteTab'
import TicketsTab from '../components/TicketsTab'
import PackingTab from '../components/PackingTab'
import BudgetTab from '../components/BudgetTab'
import WeatherStrip from '../components/WeatherStrip'
import { formatRange } from '../utils/formatDate'
import { plural } from '../utils/plural'

const TABS = [
  { key: 'route', label: 'Маршрут' },
  { key: 'tickets', label: 'Билеты' },
  { key: 'packing', label: 'Сборы' },
  { key: 'budget', label: 'Бюджет' },
]

export default function TripDetail() {
  const { id } = useParams()
  const tripId = Number(id)
  const trip = useLiveQuery(() => db.trips.get(tripId), [tripId])
  const [tab, setTab] = useState('route')

  if (!trip) return <div className="page"><p>Загрузка…</p></div>

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link to="/" className="back-link">← Все поездки</Link>
          <h1>{trip.title}</h1>
          <p className="muted">{formatRange(trip.startDate, trip.endDate)}{trip.destinationName ? ` · ${trip.destinationName}` : ''}</p>
        </div>
      </div>

      {trip.destinationLat && (
        <WeatherStrip lat={trip.destinationLat} lon={trip.destinationLon} startDate={trip.startDate} endDate={trip.endDate} />
      )}

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? 'active' : ''} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'route' && <RouteTab trip={trip} />}
      {tab === 'tickets' && <TicketsTab tripId={tripId} />}
      {tab === 'packing' && <PackingTab tripId={tripId} />}
      {tab === 'budget' && <BudgetTab tripId={tripId} />}

      <DeleteTrip trip={trip} />
    </div>
  )
}

function DeleteTrip({ trip }) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  // Считаем, что именно исчезнет: удаление необратимо, и человек должен
  // видеть цену решения до нажатия, а не после.
  const counts = useLiveQuery(async () => {
    if (!confirming) return null
    const [pois, tickets, packingItems, budgetEntries] = await Promise.all([
      db.pois.where('tripId').equals(trip.id).count(),
      db.tickets.where('tripId').equals(trip.id).count(),
      db.packingItems.where('tripId').equals(trip.id).count(),
      db.budgetEntries.where('tripId').equals(trip.id).count(),
    ])
    return { pois, tickets, packingItems, budgetEntries }
  }, [confirming, trip.id])

  async function remove() {
    setBusy(true)
    await deleteTripCascade(trip.id)
    navigate('/')
  }

  if (!confirming) {
    return (
      <div className="danger-zone">
        <button className="link-danger" onClick={() => setConfirming(true)}>
          Удалить поездку
        </button>
      </div>
    )
  }

  const parts = []
  if (counts?.pois) parts.push(plural(counts.pois, ['точка', 'точки', 'точек']))
  if (counts?.tickets) parts.push(plural(counts.tickets, ['билет', 'билета', 'билетов']))
  if (counts?.packingItems) parts.push(plural(counts.packingItems, ['вещь', 'вещи', 'вещей']))
  if (counts?.budgetEntries) parts.push(plural(counts.budgetEntries, ['трата', 'траты', 'трат']))

  return (
    <div className="card danger-card">
      <div>
        <h2>Удалить «{trip.title}»?</h2>
        <p className="agent-hint">
          {parts.length
            ? `Вместе с поездкой исчезнут ${parts.join(', ')}. Отменить это будет нельзя.`
            : 'Отменить это будет нельзя.'}
          {' '}Если жалко — сначала сделай «Экспорт» на главном экране.
        </p>
      </div>
      <div className="row">
        <button className="danger" onClick={remove} disabled={busy}>
          {busy ? 'Удаляю…' : 'Да, удалить'}
        </button>
        <button className="secondary" onClick={() => setConfirming(false)} disabled={busy}>
          Отмена
        </button>
      </div>
    </div>
  )
}
