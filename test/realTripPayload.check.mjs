// Разовая проверка конкретного плана перед выдачей пользователю:
// прогоняет файл через тот же импорт, что и приложение, и печатает,
// что реально окажется в базе. Запуск: node test/realTripPayload.check.mjs <файл>
import 'fake-indexeddb/auto'
import { readFileSync } from 'node:fs'
import { db } from '../src/db.js'
import { parseAgentPayload, applyAgentPayload } from '../src/utils/agentImport.js'

const file = process.argv[2]
if (!file) throw new Error('Укажите путь к файлу с планом')

const summary = await applyAgentPayload(parseAgentPayload(readFileSync(file, 'utf8')))

const trip = await db.trips.get(summary.tripId)
const days = await db.days.where('tripId').equals(summary.tripId).sortBy('order')

console.log(`Поездка: ${trip.title}  (${trip.startDate} → ${trip.endDate})`)
console.log(`Назначение: ${trip.destinationName} [${trip.destinationLat}, ${trip.destinationLon}]`)
console.log(`Дней: ${summary.days} | точек: ${summary.pois} | билетов: ${summary.tickets} | вещей: ${summary.packing} | трат: ${summary.budget}\n`)

for (const day of days) {
  const pois = await db.pois.where('dayId').equals(day.id).sortBy('order')
  console.log(`${day.date}:`)
  for (const p of pois) {
    console.log(`  ${p.visitTime || '--:--'}  ${p.name}  [${p.lat}, ${p.lon}]  ${p.durationMin ?? '?'} мин`)
    console.log(`          описание: ${p.description.length} симв.`)
  }
}

console.log('\nБилеты:')
for (const t of await db.tickets.where('tripId').equals(summary.tripId).toArray()) {
  console.log(`  [${t.category}] ${t.title} — ${t.date}`)
  console.log(`          ${t.note}`)
}

console.log('\nБюджет:')
for (const b of await db.budgetEntries.where('tripId').equals(summary.tripId).toArray()) {
  console.log(`  ${b.title}: ${b.amount} ${b.currency}`)
}

const packing = await db.packingItems.where('tripId').equals(summary.tripId).toArray()
const byCat = {}
for (const i of packing) (byCat[i.category] ||= []).push(i.name)
console.log('\nСборы:')
for (const [cat, names] of Object.entries(byCat)) console.log(`  ${cat}: ${names.length} — ${names.join('; ')}`)
