import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import RouteTab from '../components/RouteTab'
import TicketsTab from '../components/TicketsTab'
import PackingTab from '../components/PackingTab'
import BudgetTab from '../components/BudgetTab'
import WeatherStrip from '../components/WeatherStrip'
import { formatRange } from '../utils/formatDate'

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
    </div>
  )
}
