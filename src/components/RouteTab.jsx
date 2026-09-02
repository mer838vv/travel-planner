import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import '../leafletIconFix'
import { db } from '../db'
import { searchPlace } from '../utils/geocode'
import { formatShort } from '../utils/formatDate'
import { resolveKind, kindMeta, isLogistics } from '../utils/poiKind'
import { splitWalkingRoute, googleMapsWalkingUrl, visitDurationText } from '../utils/walkingRoute'
import { analyzeRouteQuality, normalizeRouteStart, routeStartLabel } from '../utils/routeGuide'
import DeleteButton from './DeleteButton'

export default function RouteTab({ trip }) {
  const days = useLiveQuery(() => db.days.where('tripId').equals(trip.id).sortBy('order'), [trip.id])
  const [activeDayId, setActiveDayId] = useState(null)

  const currentDayId = activeDayId ?? days?.[0]?.id
  const currentDay = days?.find((day) => day.id === currentDayId)
  const pois = useLiveQuery(
    () => (currentDayId ? db.pois.where('dayId').equals(currentDayId).sortBy('order') : []),
    [currentDayId]
  )

  if (!days) return <p>Загрузка…</p>

  const routeStart = normalizeRouteStart(currentDay?.routeStart)
  const mapCenter = routeStart
    ? [routeStart.lat, routeStart.lon]
    : pois?.length
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

      {currentDay && <WalkingRouteCard key={currentDay.id} day={currentDay} pois={pois || []} />}

      <div className="route-layout">
        <div className="poi-list">
          {pois?.length === 0 && <div className="empty">На этот день ещё нет точек.</div>}
          {pois?.map((poi) => (
            <PoiCard key={poi.id} poi={poi} />
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
              {routeStart && (
                <Marker position={[routeStart.lat, routeStart.lon]}>
                  <Popup><strong>Старт: {routeStart.name}</strong></Popup>
                </Marker>
              )}
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

function WalkingRouteCard({ day, pois }) {
  const quality = analyzeRouteQuality(day, pois)
  const routePoints = quality.start
    ? [{ id: `start-${day.id}`, ...quality.start }, ...pois]
    : pois
  const stages = splitWalkingRoute(routePoints)
  const duration = visitDurationText(pois)
  const visitMinutes = pois.reduce((sum, poi) => sum + (Number(poi.durationMin) || 0), 0)
  const hasFoodStop = pois.some((poi) => resolveKind(poi) === 'food')

  return (
    <section className="card walking-route" aria-labelledby="walking-route-title">
      <div className="walking-route-head">
        <div>
          <p className="eyebrow">Пешеходная прогулка</p>
          <h3 id="walking-route-title">{pois.length} мест по порядку</h3>
          {(duration || day.walkingDistanceKm || day.walkingDurationMin) && (
            <p className="muted">
              {[
                duration,
                day.walkingDistanceKm ? `${day.walkingDistanceKm} км пешком` : null,
                day.walkingDurationMin ? `${day.walkingDurationMin} мин в пути` : null,
              ].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <div className="walking-route-actions">
          {stages.map((stage, index) => (
            <a
              key={stage.map((poi) => poi.id).join('-')}
              className="google-route-button"
              href={googleMapsWalkingUrl(stage)}
              target="_blank"
              rel="noreferrer"
            >
              {stages.length === 1 ? 'Открыть в Google Картах' : `Этап ${index + 1} в Google Картах`}
            </a>
          ))}
        </div>
      </div>

      <RouteStartEditor day={day} />

      <div className={`route-quality ${quality.ready ? 'ready' : 'needs-work'}`}>
        <strong>{quality.ready ? 'Маршрут подробно проработан' : 'Маршрут требует доработки'}</strong>
        <span>
          {quality.start ? routeStartLabel(quality.start) : 'Не указан отель или вокзал'}
          {' · '}подробно раскрыто {quality.detailed} из {quality.total} мест
          {!quality.hasRationale && ' · нет объяснения порядка'}
        </span>
      </div>

      {day.routeSummary && <p className="route-summary">{day.routeSummary}</p>}
      {day.routeRationale && (
        <div className="route-rationale">
          <strong>Почему именно такой порядок</strong>
          <p>{day.routeRationale}</p>
        </div>
      )}

      <ol className="walking-stops">
        {pois.map((poi) => (
          <li key={poi.id}>
            <strong>{poi.name}</strong>
            {poi.description && <span>{poi.description}</span>}
          </li>
        ))}
      </ol>

      {day.breakSuggestion && <p className="route-tip"><strong>Перерыв:</strong> {day.breakSuggestion}</p>}

      {day.routeSources?.length > 0 && (
        <div className="route-sources">
          <span>{day.researchedAt ? `Проверено ${day.researchedAt}:` : 'Официальные источники:'}</span>
          {day.routeSources.map((source) => (
            <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title}</a>
          ))}
        </div>
      )}

      {visitMinutes >= 420 && (
        <p className="route-tip">День выглядит насыщенным. Оставь запас на дорогу, очереди и незапланированные остановки.</p>
      )}
      {!hasFoodStop && (visitMinutes >= 300 || pois.length >= 5) && (
        <p className="route-tip">Добавь кафе или перерыв отдельной точкой — длинную прогулку проще выполнять частями.</p>
      )}
    </section>
  )
}

function RouteStartEditor({ day }) {
  const start = normalizeRouteStart(day.routeStart)
  const [editing, setEditing] = useState(!start)
  const [type, setType] = useState(start?.type || 'hotel')
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function findStart() {
    if (!query.trim()) return
    setBusy(true)
    setError('')
    try {
      setOptions(await searchPlace(query))
    } catch {
      setError('Не удалось найти адрес. Проверьте интернет и попробуйте ещё раз.')
    } finally {
      setBusy(false)
    }
  }

  async function selectStart(place) {
    await db.days.update(day.id, {
      routeStart: {
        type,
        name: place.name.split(',').slice(0, 2).join(',').trim(),
        address: place.name,
        lat: place.lat,
        lon: place.lon,
      },
    })
    setEditing(false)
    setOptions([])
    setQuery('')
  }

  if (!editing && start) {
    return (
      <div className="route-origin">
        <div><span>Старт маршрута</span><strong>{routeStartLabel(start)}</strong></div>
        <button type="button" className="secondary" onClick={() => setEditing(true)}>Изменить</button>
      </div>
    )
  }

  return (
    <div className="route-origin-editor">
      <strong>Откуда вы пойдёте</strong>
      <p>Выберите отель, если уже заселились, или вокзал, если приезжаете на один день.</p>
      <div className="route-origin-types" role="group" aria-label="Тип точки старта">
        <button type="button" className={type === 'hotel' ? 'active' : 'secondary'} onClick={() => setType('hotel')}>Отель</button>
        <button type="button" className={type === 'station' ? 'active' : 'secondary'} onClick={() => setType('station')}>Вокзал</button>
        <button type="button" className={type === 'custom' ? 'active' : 'secondary'} onClick={() => setType('custom')}>Другое место</button>
      </div>
      <div className="row">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={type === 'hotel' ? 'Название отеля и город' : type === 'station' ? 'Название вокзала и город' : 'Название или адрес'}
          onKeyDown={(event) => event.key === 'Enter' && findStart()}
        />
        <button type="button" className="secondary" disabled={busy} onClick={findStart}>{busy ? 'Ищу…' : 'Найти'}</button>
        {start && <button type="button" className="secondary" onClick={() => setEditing(false)}>Отмена</button>}
      </div>
      {error && <p className="form-error">{error}</p>}
      {options.length > 0 && (
        <ul className="suggestions">
          {options.map((option, index) => (
            <li key={`${option.lat}-${option.lon}-${index}`}>
              <button type="button" onClick={() => selectStart(option)}>{option.name}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function PoiCard({ poi }) {
  const [editing, setEditing] = useState(false)
  const [description, setDescription] = useState(poi.description || '')

  async function remove() {
    await db.pois.delete(poi.id)
  }

  async function saveDescription() {
    await db.pois.update(poi.id, { description })
    setEditing(false)
  }

  const kind = resolveKind(poi)
  const meta = kindMeta(kind)
  const logistics = isLogistics(kind)
  const analysis = poi.analysis

  // День из шести развёрнутых карточек читается как простыня. Свёрнутый вид
  // даёт обзор дня целиком, а подробности открываются по нажатию. Логистика
  // раскрыта сразу: её читают в спешке, и лишний тап там лишний.
  const [open, setOpen] = useState(logistics)

  return (
    <div className={`poi-card kind-${kind}${logistics ? ' logistics' : ''}${open ? ' open' : ''}`}>
      <div className="poi-header">
        {/* Иконка вместо порядкового номера: тип события должен читаться
            раньше текста, а порядок и так задан положением в списке. */}
        <span className="poi-index" title={meta.label}>{meta.icon}</span>

        <button
          type="button"
          className="poi-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <strong>{poi.name}</strong>
          <span className="poi-chevron" aria-hidden="true" />
        </button>

        <DeleteButton onDelete={remove} label={`Удалить точку «${poi.name}»`} />
      </div>

      {/* Время и стоимость видны всегда: по ним день и просматривают */}
      <div className="poi-meta">
        {poi.visitTime && <span>🕒 {poi.visitTime}</span>}
        {poi.durationMin && <span>⏱ {poi.durationMin} мин</span>}
        {poi.cost != null && poi.cost !== '' && <span>💶 {poi.cost}</span>}
      </div>

      {open && (
        editing ? (
          <div className="row">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
            <button onClick={saveDescription}>Сохранить</button>
          </div>
        ) : (
          <div className="poi-expanded">
            <p className="poi-description" onClick={() => setEditing(true)}>
              {poi.description || <span className="muted">Добавить описание…</span>}
            </p>
            {analysis && (
              <div className="poi-guide">
                {analysis.whyVisit && <section><h4>Почему это важно</h4><p>{analysis.whyVisit}</p></section>}
                {analysis.highlights?.length > 0 && (
                  <section><h4>Что не пропустить</h4><ul>{analysis.highlights.map((item) => <li key={item}>{item}</li>)}</ul></section>
                )}
                {analysis.practicalTip && <section><h4>Практически</h4><p>{analysis.practicalTip}</p></section>}
                {analysis.bestTime && <section><h4>Лучшее время</h4><p>{analysis.bestTime}</p></section>}
                {analysis.booking && <section><h4>Билеты и бронь</h4><p>{analysis.booking}</p></section>}
                {analysis.sourceUrl && (
                  <a className="poi-source" href={analysis.sourceUrl} target="_blank" rel="noreferrer">
                    {analysis.sourceTitle || 'Официальный источник'}{analysis.checkedAt ? ` · проверено ${analysis.checkedAt}` : ''}
                  </a>
                )}
              </div>
            )}
          </div>
        )
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
