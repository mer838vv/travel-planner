import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

export default function PackingTab({ tripId }) {
  const items = useLiveQuery(() => db.packingItems.where('tripId').equals(tripId).toArray(), [tripId])
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Прочее')

  async function toggle(item) {
    await db.packingItems.update(item.id, { packed: !item.packed })
  }

  async function remove(id) {
    await db.packingItems.delete(id)
  }

  async function add(e) {
    e.preventDefault()
    if (!name) return
    await db.packingItems.add({ tripId, name, category, packed: false, qty: 1 })
    setName('')
  }

  if (!items) return <p>Загрузка…</p>

  const byCategory = {}
  for (const item of items) {
    if (!byCategory[item.category]) byCategory[item.category] = []
    byCategory[item.category].push(item)
  }

  const packedCount = items.filter((i) => i.packed).length

  return (
    <div className="packing-tab">
      <p className="muted">Собрано: {packedCount} / {items.length}</p>

      {Object.entries(byCategory).map(([cat, catItems]) => (
        <div key={cat} className="packing-category">
          <h3>{cat}</h3>
          <ul>
            {catItems.map((item) => (
              <li key={item.id} className={item.packed ? 'packed' : ''}>
                <label>
                  <input type="checkbox" checked={item.packed} onChange={() => toggle(item)} />
                  {item.name}
                </label>
                <button className="icon-button" onClick={() => remove(item.id)}>✕</button>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <form className="card row" onSubmit={add}>
        <input placeholder="Новая вещь" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Категория" value={category} onChange={(e) => setCategory(e.target.value)} />
        <button type="submit">Добавить</button>
      </form>
    </div>
  )
}
