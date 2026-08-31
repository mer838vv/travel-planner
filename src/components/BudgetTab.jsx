import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

export default function BudgetTab({ tripId }) {
  const entries = useLiveQuery(() => db.budgetEntries.where('tripId').equals(tripId).sortBy('date'), [tripId])
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [category, setCategory] = useState('Прочее')

  async function add(e) {
    e.preventDefault()
    if (!title || !amount) return
    await db.budgetEntries.add({
      tripId,
      title,
      amount: Number(amount),
      currency,
      category,
      date: new Date().toISOString().slice(0, 10),
    })
    setTitle('')
    setAmount('')
  }

  async function remove(id) {
    await db.budgetEntries.delete(id)
  }

  if (!entries) return <p>Загрузка…</p>

  const totalsByCurrency = {}
  for (const e of entries) {
    totalsByCurrency[e.currency] = (totalsByCurrency[e.currency] || 0) + e.amount
  }

  return (
    <div className="budget-tab">
      <div className="totals">
        {Object.entries(totalsByCurrency).map(([cur, total]) => (
          <span key={cur} className="total-badge">{total.toFixed(2)} {cur}</span>
        ))}
        {entries.length === 0 && <span className="muted">Расходов пока нет</span>}
      </div>

      <ul className="budget-list">
        {entries.map((e) => (
          <li key={e.id}>
            <span className="budget-category">{e.category}</span>
            <strong>{e.title}</strong>
            <span className="budget-amount">{e.amount.toFixed(2)} {e.currency}</span>
            <button className="icon-button" onClick={() => remove(e.id)}>✕</button>
          </li>
        ))}
      </ul>

      <form className="card row" onSubmit={add}>
        <input placeholder="На что" value={title} onChange={(ev) => setTitle(ev.target.value)} />
        <input placeholder="Категория" value={category} onChange={(ev) => setCategory(ev.target.value)} />
        <input placeholder="Сумма" type="number" step="0.01" value={amount} onChange={(ev) => setAmount(ev.target.value)} />
        <select value={currency} onChange={(ev) => setCurrency(ev.target.value)}>
          <option>EUR</option>
          <option>USD</option>
          <option>RUB</option>
          <option>GBP</option>
        </select>
        <button type="submit">Добавить</button>
      </form>
    </div>
  )
}
