import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router-dom'
import { db, dateRangeDays, DEFAULT_PACKING_TEMPLATE } from '../db'
import { searchPlace } from '../utils/geocode'
import { exportAllData, importAllData } from '../utils/backup'

export default function TripList() {
  const trips = useLiveQuery(() => db.trips.orderBy('startDate').toArray(), [])
  const [showForm, setShowForm] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="page">
      <div className="page-header">
        <h1>Мои поездки</h1>
        <div className="header-actions">
          <button onClick={() => exportAllData()}>Экспорт бэкапа</button>
          <label className="button-like">
            Импорт бэкапа
            <input
              type="file"
              accept="application/json"
              style={{ display: 'none' }}
              onChange={async (e) => {
                if (e.target.files[0]) {
                  await importAllData(e.target.files[0])
                  e.target.value = ''
                }
              }}
            />
          </label>
        </div>
      </div>

      {!trips && <p>Загрузка…</p>}
      {trips && trips.length === 0 && !showForm && <p>Пока нет ни одной поездки.</p>}

      <ul className="trip-list">
        {trips?.map((trip) => (
          <li key={trip.id}>
            <Link to={`/trip/${trip.id}`}>
              <strong>{trip.title}</strong>
              <span>{trip.startDate} → {trip.endDate}</span>
              {trip.destinationName && <span className="muted">{trip.destinationName}</span>}
            </Link>
          </li>
        ))}
      </ul>

      {!showForm && <button onClick={() => setShowForm(true)}>+ Новая поездка</button>}

      {showForm && (
        <NewTripForm
          onCancel={() => setShowForm(false)}
          onCreated={(id) => navigate(`/trip/${id}`)}
        />
      )}
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
          <button type="button" onClick={handleSearch}>Найти</button>
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
        <button type="button" onClick={onCancel}>Отмена</button>
      </div>
    </form>
  )
}
