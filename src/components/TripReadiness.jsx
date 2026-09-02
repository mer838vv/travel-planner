import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { todayIso } from '../utils/weather'
import { daysUntil, downloadTripCalendar } from '../utils/tripCalendar'
import { plural } from '../utils/plural'

function countdownText(days) {
  if (days == null) return 'Проверь даты поездки'
  if (days > 0) return `До поездки ${plural(days, ['день', 'дня', 'дней'])}`
  if (days === 0) return 'Поездка начинается сегодня'
  return 'Поездка уже началась'
}

export default function TripReadiness({ trip, onOpenTab }) {
  const data = useLiveQuery(async () => {
    const [packing, tickets] = await Promise.all([
      db.packingItems.where('tripId').equals(trip.id).toArray(),
      db.tickets.where('tripId').equals(trip.id).toArray(),
    ])
    return { packing, tickets }
  }, [trip.id])

  if (!data) return null

  const documents = data.packing.filter((item) => item.category === 'Документы')
  const documentsReady = documents.filter((item) => item.packed).length
  const packed = data.packing.filter((item) => item.packed).length
  const days = daysUntil(trip.startDate, todayIso())

  return (
    <section className="card readiness-card" aria-labelledby="readiness-title">
      <div className="readiness-head">
        <div>
          <p className="eyebrow">Подготовка</p>
          <h2 id="readiness-title">{countdownText(days)}</h2>
        </div>
        <button type="button" className="secondary compact" onClick={() => downloadTripCalendar(trip)}>
          Добавить в календарь
        </button>
      </div>

      <div className="readiness-grid">
        <button type="button" className="readiness-item" onClick={() => onOpenTab('packing')}>
          <strong>{documentsReady} из {documents.length}</strong>
          <span>документов отмечено</span>
        </button>
        <button type="button" className="readiness-item" onClick={() => onOpenTab('tickets')}>
          <strong>{plural(data.tickets.length, ['билет сохранён', 'билета сохранено', 'билетов сохранено'])}</strong>
          <span>в поездке</span>
        </button>
        <button type="button" className="readiness-item" onClick={() => onOpenTab('packing')}>
          <strong>{packed} из {data.packing.length}</strong>
          <span>вещей собрано</span>
        </button>
      </div>

      {documents.length > documentsReady && days != null && days <= 14 && days >= 0 && (
        <p className="readiness-alert">До отъезда проверь раздел «Документы»: там остались неотмеченные пункты.</p>
      )}
    </section>
  )
}
