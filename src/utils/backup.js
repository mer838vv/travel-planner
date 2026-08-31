import { db } from '../db'

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

export async function exportAllData() {
  const [trips, days, pois, tickets, packingItems, budgetEntries] = await Promise.all([
    db.trips.toArray(),
    db.days.toArray(),
    db.pois.toArray(),
    db.tickets.toArray(),
    db.packingItems.toArray(),
    db.budgetEntries.toArray(),
  ])

  const ticketsSerialized = await Promise.all(
    tickets.map(async (t) => ({
      ...t,
      fileData: t.fileBlob ? await blobToBase64(t.fileBlob) : null,
      fileBlob: undefined,
    }))
  )

  const payload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    trips,
    days,
    pois,
    tickets: ticketsSerialized,
    packingItems,
    budgetEntries,
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `travel-planner-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importAllData(file) {
  const text = await file.text()
  const payload = JSON.parse(text)

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
