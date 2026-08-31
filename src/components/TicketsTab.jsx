import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

const CATEGORIES = ['Авиабилет', 'Отель', 'Поезд/автобус', 'Музей/экскурсия', 'Страховка', 'Виза', 'Другое']

export default function TicketsTab({ tripId }) {
  const tickets = useLiveQuery(() => db.tickets.where('tripId').equals(tripId).sortBy('date'), [tripId])
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [date, setDate] = useState('')
  const [file, setFile] = useState(null)

  async function handleAdd(e) {
    e.preventDefault()
    if (!title) return
    await db.tickets.add({
      tripId,
      title,
      category,
      date: date || null,
      fileBlob: file || null,
      fileName: file?.name || null,
      fileType: file?.type || null,
    })
    setTitle('')
    setDate('')
    setFile(null)
  }

  async function remove(id) {
    await db.tickets.delete(id)
  }

  function openFile(ticket) {
    if (!ticket.fileBlob) return
    const url = URL.createObjectURL(ticket.fileBlob)
    window.open(url, '_blank')
  }

  return (
    <div className="tickets-tab">
      <form className="card row" onSubmit={handleAdd}>
        <input placeholder="Название (например: Рейс SU100)" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files[0] || null)} />
        <button type="submit">Добавить</button>
      </form>

      <ul className="ticket-list">
        {tickets?.map((t) => (
          <li key={t.id} className="ticket-item">
            <span className="ticket-category">{t.category}</span>
            <strong>{t.title}</strong>
            {t.date && <span className="muted">{t.date}</span>}
            {t.fileBlob && <button onClick={() => openFile(t)}>Открыть файл</button>}
            <button className="icon-button" onClick={() => remove(t.id)}>✕</button>
          </li>
        ))}
        {tickets?.length === 0 && <p className="muted">Билетов и документов пока нет.</p>}
      </ul>
    </div>
  )
}
