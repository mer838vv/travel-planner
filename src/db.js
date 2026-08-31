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
