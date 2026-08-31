// Разовая проверка конкретного плана перед выдачей пользователю:
// прогоняет файл через тот же импорт, что и приложение, и печатает,
// что реально окажется в базе. Запуск: node test/realTripPayload.check.mjs <файл>
import 'fake-indexeddb/auto'
import { readFileSync } from 'node:fs'
import { db } from '../src/db.js'
import { parseAgentPayload, applyAgentPayload } from '../src/utils/agentImport.js'
import { parseSegments, findConnections, taxiAddress } from '../src/utils/flights.js'
import { formatDuration } from '../src/utils/time.js'

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

const tickets = await db.tickets.where('tripId').equals(summary.tripId).toArray()

console.log('\nБилеты:')
for (const t of tickets) {
  console.log(`  [${t.category}] ${t.title} — ${t.date}${t.flight ? '  ✈ есть данные рейса' : ''}`)
  console.log(`          ${t.note}`)
}

// Самое важное: рейсы и стыковки — ради них и делался блок «день вылета»
const segments = parseSegments(tickets)
console.log(`\nРейсы (${segments.length}):`)
for (const s of segments) {
  const terminal = s.from.terminal ? `терминал ${s.from.terminal}` : 'терминал НЕ УКАЗАН'
  console.log(`  ${s.number}  ${s.from.iata} → ${s.to.iata}  (${terminal})`)
  console.log(`      вылет ${s.departAt?.toISOString() ?? '—'} · в пути ${formatDuration(s.arriveAt - s.departAt) ?? '—'}`)
  if (s.leaveAt) console.log(`      выезжать ${s.leaveAtLocal} (${s.leaveAt.toISOString()})`)
  if (s.checkinClosesAt) console.log(`      регистрация до ${s.checkinClosesLocal}`)
  console.log(`      такси: «${taxiAddress(s.from)}»`)
}

const connections = findConnections(segments)
console.log(`\nСтыковки (${connections.length}):`)
for (const c of connections) {
  console.log(`  ${c.airport.iata}: ${formatDuration(c.gapMs)} · уровень ${c.level.toUpperCase()} · раздельные брони: ${c.separateTickets ? 'да' : 'нет'}`)
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
