// Расширение .js обязательно: тесты гоняются голым node, который, в отличие
// от Vite, не достраивает расширения сам.
import { db } from '../db.js'

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

async function base64ToBlob(dataUrl) {
  const res = await fetch(dataUrl)
  return res.blob()
}

async function makePayload({ trips, days, pois, tickets, packingItems, budgetEntries }) {
  const ticketsSerialized = await Promise.all(
    tickets.map(async (t) => ({
      ...t,
      fileData: t.fileBlob ? await blobToBase64(t.fileBlob) : null,
      fileBlob: undefined,
    }))
  )

  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    trips,
    days,
    pois,
    tickets: ticketsSerialized,
    packingItems,
    budgetEntries,
  }
}

function downloadPayload(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportAllData() {
  const payload = await makePayload({
    trips: await db.trips.toArray(),
    days: await db.days.toArray(),
    pois: await db.pois.toArray(),
    tickets: await db.tickets.toArray(),
    packingItems: await db.packingItems.toArray(),
    budgetEntries: await db.budgetEntries.toArray(),
  })

  downloadPayload(payload, `travel-planner-backup-${new Date().toISOString().slice(0, 10)}.json`)
}

/** Собирает переносимый бэкап только одной поездки и всех её данных. */
export async function buildTripBackup(tripId) {
  const trip = await db.trips.get(tripId)
  if (!trip) fail('Поездка не найдена — возможно, она уже была удалена.')

  const [days, pois, tickets, packingItems, budgetEntries] = await Promise.all([
    db.days.where('tripId').equals(tripId).toArray(),
    db.pois.where('tripId').equals(tripId).toArray(),
    db.tickets.where('tripId').equals(tripId).toArray(),
    db.packingItems.where('tripId').equals(tripId).toArray(),
    db.budgetEntries.where('tripId').equals(tripId).toArray(),
  ])

  return makePayload({ trips: [trip], days, pois, tickets, packingItems, budgetEntries })
}

export async function exportTripData(tripId, title = 'trip') {
  const payload = await buildTripBackup(tripId)
  const safeTitle = String(title)
    .trim()
    .replace(/[^\p{L}\p{N}._-]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'trip'

  downloadPayload(payload, `travel-planner-${safeTitle}-${new Date().toISOString().slice(0, 10)}.json`)
}

function fail(message) {
  const err = new Error(message)
  err.userFacing = true
  throw err
}

/**
 * Чтение и проверка файла бэкапа.
 *
 * Раньше импорт просто делал JSON.parse и клал что получилось в базу. Любой
 * другой JSON — например, план от агента — уходил в таблицы как попало.
 */
export async function readBackup(file) {
  let payload
  try {
    payload = JSON.parse(await file.text())
  } catch {
    fail('Файл не читается как JSON. Это точно бэкап, сделанный кнопкой «Экспорт»?')
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    fail('В файле не тот формат — ожидался бэкап приложения.')
  }
  if (!Array.isArray(payload.trips)) {
    // Частая путаница: план агента тоже JSON и тоже про поездку.
    if (payload.trip) {
      fail('Это план от агента, а не бэкап. Его вставляют кнопкой «Вставить план от агента».')
    }
    fail('В файле нет списка поездок — на бэкап это не похоже.')
  }

  return payload
}

const ROW_TABLES = [
  ['days', () => db.days, 'дней'],
  ['pois', () => db.pois, 'точек'],
  ['tickets', () => db.tickets, 'билетов'],
  ['packingItems', () => db.packingItems, 'вещей'],
  ['budgetEntries', () => db.budgetEntries, 'трат'],
]

function rows(value) {
  return Array.isArray(value) ? value.filter((r) => r && typeof r === 'object') : []
}

/**
 * Что именно случится с базой, если применить этот бэкап.
 *
 * Импорт кладёт записи по их собственным id (bulkPut), поэтому опасность не
 * только в поездках с совпавшим id. Точка или билет с чужого устройства
 * может встать на место записи, принадлежащей совсем другой поездке, — и
 * та тихо испортится. Поэтому считаются оба случая:
 *
 *   replacedTrips — поездки, которые заменятся целиком (это ожидаемо);
 *   touchedTrips  — чужие поездки, у которых перезапишутся отдельные записи
 *                   (это и есть незаметная потеря данных).
 */
export async function analyzeBackup(payload) {
  const incomingTrips = rows(payload.trips)
  const incomingTripIds = new Set(incomingTrips.map((t) => t.id).filter((id) => id != null))

  const existingTrips = await db.trips.bulkGet(incomingTrips.map((t) => t.id ?? -1))

  const replacedTrips = []
  let newTrips = 0
  incomingTrips.forEach((trip, i) => {
    const existing = existingTrips[i]
    if (existing) replacedTrips.push({ id: existing.id, title: existing.title, incomingTitle: trip.title })
    else newTrips++
  })

  // Побочные столкновения по id, сгруппированные по пострадавшей поездке
  const collisionsByTrip = new Map()
  const counts = {}

  for (const [key, table] of ROW_TABLES) {
    const incoming = rows(payload[key])
    counts[key] = incoming.length
    if (!incoming.length) continue

    const existing = await table().bulkGet(incoming.map((r) => r.id ?? -1))
    for (const row of existing) {
      // Запись принадлежит поездке, которая и так заменяется целиком —
      // это не потеря, а ожидаемая часть восстановления бэкапа.
      if (!row || incomingTripIds.has(row.tripId)) continue
      collisionsByTrip.set(row.tripId, (collisionsByTrip.get(row.tripId) || 0) + 1)
    }
  }

  const touchedTrips = []
  for (const [tripId, rowCount] of collisionsByTrip) {
    const trip = await db.trips.get(tripId)
    touchedTrips.push({ id: tripId, title: trip?.title || 'без названия', rows: rowCount })
  }
  touchedTrips.sort((a, b) => b.rows - a.rows)

  return {
    incoming: { trips: incomingTrips.length, ...counts },
    exportedAt: typeof payload.exportedAt === 'string' ? payload.exportedAt : null,
    newTrips,
    replacedTrips,
    touchedTrips,
  }
}

export async function importAllData(payload) {
  const ticketsWithBlobs = await Promise.all(
    (payload.tickets || []).map(async (t) => ({
      ...t,
      fileBlob: t.fileData ? await base64ToBlob(t.fileData) : null,
      fileData: undefined,
    }))
  )

  await db.transaction(
    'rw',
    db.trips,
    db.days,
    db.pois,
    db.tickets,
    db.packingItems,
    db.budgetEntries,
    async () => {
      await Promise.all([
        db.trips.bulkPut(payload.trips || []),
        db.days.bulkPut(payload.days || []),
        db.pois.bulkPut(payload.pois || []),
        db.tickets.bulkPut(ticketsWithBlobs),
        db.packingItems.bulkPut(payload.packingItems || []),
        db.budgetEntries.bulkPut(payload.budgetEntries || []),
      ])
    }
  )
}
