import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { db } from '../db'
import { searchPlace } from '../utils/geocode'
import { formatShort } from '../utils/formatDate'

export default function RouteTab({ trip }) {
  const days = useLiveQuery(() => db.days.where('tripId').equals(trip.id).sortBy('order'), [trip.id])
  const [activeDayId, setActiveDayId] = useState(null)

  const currentDayId = activeDayId ?? days?.[0]?.id
  const pois = useLiveQuery(
    () => (currentDayId ? db.pois.where('dayId').equals(currentDayId).sortBy('order') : []),
    [currentDayId]
  )

  if (!days) return <p>Загрузка…</p>

  const mapCenter = pois?.length
    ? [pois[0].lat, pois[0].lon]
    : trip.destinationLat
      ? [trip.destinationLat, trip.destinationLon]
      : [48.8566, 2.3522]

  return (
    <div className="route-tab">
      <div className="day-tabs">
        {days.map((day, i) => (
          <button
            key={day.id}
            className={currentDayId === day.id ? 'active' : ''}
            onClick={() => setActiveDayId(day.id)}
          >
            День {i + 1}
            <span className="muted">{formatShort(day.date)}</span>
          </button>
        ))}
      </div>

      <div className="route-layout">
        <div className="poi-list">
          {pois?.length === 0 && <div className="empty">На этот день ещё нет точек.</div>}
          {pois?.map((poi, i) => (
            <PoiCard key={poi.id} poi={poi} index={i} />
          ))}
          {currentDayId && <AddPoiForm dayId={currentDayId} tripId={trip.id} nextOrder={pois?.length || 0} />}
        </div>

        <div className="map-wrap">
          {pois?.length > 0 && (
            <MapContainer center={mapCenter} zoom={13} style={{ height: '420px', width: '100%' }}>
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {pois.map((poi) => (
                <Marker key={poi.id} position={[poi.lat, poi.lon]}>
                  <Popup>
                    <strong>{poi.name}</strong>
                    {poi.visitTime && <div>{poi.visitTime}</div>}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
          {(!pois || pois.length === 0) && <div className="map-placeholder">Добавь точку, чтобы увидеть карту</div>}
        </div>
      </div>
    </div>
  )
}

function PoiCard({ poi, index }) {
  const [editing, setEditing] = useState(false)
  const [description, setDescription] = useState(poi.description || '')

  async function remove() {
    await db.pois.delete(poi.id)
  }

  async function saveDescription() {
    await db.pois.update(poi.id, { description })
    setEditing(false)
  }

  return (
    <div className="poi-card">
      <div className="poi-header">
        <span className="poi-index">{index + 1}</span>
        <strong>{poi.name}</strong>
        <div className="poi-meta">
          {poi.visitTime && <span>🕒 {poi.visitTime}</span>}
          {poi.durationMin && <span>⏱ {poi.durationMin} мин</span>}
          {poi.cost != null && poi.cost !== '' && <span>💶 {poi.cost}</span>}
        </div>
        <button className="icon-button" onClick={remove}>✕</button>
      </div>
      {editing ? (
        <div className="row">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          <button onClick={saveDescription}>Сохранить</button>
        </div>
      ) : (
        <p className="poi-description" onClick={() => setEditing(true)}>
          {poi.description || <span className="muted">Добавить описание…</span>}
        </p>
      )}
    </div>
  )
}

function AddPoiForm({ dayId, tripId, nextOrder }) {
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState([])
  const [visitTime, setVisitTime] = useState('')
  const [durationMin, setDurationMin] = useState('')
  const [cost, setCost] = useState('')

  async function handleSearch() {
    if (!query.trim()) return
    const results = await searchPlace(query)
    setOptions(results)
  }

  async function addPoi(place) {
    await db.pois.add({
      tripId,
      dayId,
      name: place.name.split(',')[0],
      description: '',
      lat: place.lat,
      lon: place.lon,
      visitTime: visitTime || null,
      durationMin: durationMin ? Number(durationMin) : null,
      cost: cost || null,
      order: nextOrder,
    })
    setQuery('')
    setOptions([])
    setVisitTime('')
    setDurationMin('')
    setCost('')
  }

  return (
    <div className="card add-poi-form">
      <div className="row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Название места или адрес"
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button type="button" className="secondary" onClick={handleSearch}>Найти</button>
      </div>
      <div className="row">
        <input placeholder="Время (10:00)" value={visitTime} onChange={(e) => setVisitTime(e.target.value)} />
        <input placeholder="Длительность, мин" type="number" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} />
        <input placeholder="Стоимость" value={cost} onChange={(e) => setCost(e.target.value)} />
      </div>
      {options.length > 0 && (
        <ul className="suggestions">
          {options.map((opt, i) => (
            <li key={i}>
              <button type="button" onClick={() => addPoi(opt)}>{opt.name}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
