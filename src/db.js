import Dexie from 'dexie'

export const db = new Dexie('travel-planner')

db.version(1).stores({
  trips: '++id, title, startDate, endDate',
  days: '++id, tripId, date, order',
  pois: '++id, tripId, dayId, order',
  tickets: '++id, tripId, category, date',
  packingItems: '++id, tripId, category',
  budgetEntries: '++id, tripId, date',
})

/**
 * Удаляет поездку вместе со всем, что к ней привязано.
 *
 * Связей на уровне базы у Dexie нет, поэтому чистить нужно руками: иначе
 * дни, точки, билеты, вещи и траты остаются в базе навсегда, растут в
 * размере и попадают в бэкап, ссылаясь на несуществующую поездку.
 *
 * Всё удаление идёт одной транзакцией — прерванное на середине оставило бы
 * поездку без части данных или, наоборот, данные без поездки.
 */
export async function deleteTripCascade(tripId) {
  const removed = { days: 0, pois: 0, tickets: 0, packingItems: 0, budgetEntries: 0 }

  await db.transaction(
    'rw',
    db.trips, db.days, db.pois, db.tickets, db.packingItems, db.budgetEntries,
    async () => {
      removed.days = await db.days.where('tripId').equals(tripId).delete()
      removed.pois = await db.pois.where('tripId').equals(tripId).delete()
      removed.tickets = await db.tickets.where('tripId').equals(tripId).delete()
      removed.packingItems = await db.packingItems.where('tripId').equals(tripId).delete()
      removed.budgetEntries = await db.budgetEntries.where('tripId').equals(tripId).delete()
      await db.trips.delete(tripId)
    }
  )

  return removed
}

export function dateRangeDays(startDate, endDate) {
  const days = []
  const start = new Date(startDate)
  const end = new Date(endDate)
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d).toISOString().slice(0, 10))
  }
  return days
}

export const DEFAULT_PACKING_TEMPLATE = [
  ['Документы', ['Паспорт', 'Билеты', 'Страховка', 'Виза/распечатки броней', 'Наличные и карты']],
  ['Электроника', ['Телефон + зарядка', 'Powerbank', 'Переходник для розетки', 'Наушники']],
  ['Одежда', ['Нижнее бельё', 'Носки', 'Куртка/дождевик', 'Обувь для ходьбы']],
  ['Гигиена', ['Зубная щётка/паста', 'Крем от солнца', 'Лекарства']],
]
