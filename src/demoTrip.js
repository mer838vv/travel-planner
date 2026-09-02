import { db } from './db.js'

export const FLORENCE_DEMO_KEY = 'florence-walking-demo-v1'
export const FLORENCE_DEMO_TITLE = 'Проверка прогулки: Флоренция'
const INSTALL_FLAG = `travel-planner:${FLORENCE_DEMO_KEY}:installed`

const FLORENCE_POIS = [
  {
    name: 'Собор Санта-Мария-дель-Фьоре',
    description: 'Главный собор Флоренции со знаменитым куполом Брунеллески. На подъём к куполу лучше бронировать время заранее.',
    lat: 43.7731,
    lon: 11.2560,
    visitTime: '09:00',
    durationMin: 90,
  },
  {
    name: 'Площадь Синьории',
    description: 'Исторический центр городской жизни: Палаццо Веккьо, Лоджия Ланци и скульптуры под открытым небом.',
    lat: 43.7697,
    lon: 11.2556,
    visitTime: '11:00',
    durationMin: 45,
  },
  {
    name: 'Галерея Уффици',
    description: 'Одна из главных художественных галерей Италии с работами Боттичелли, Леонардо и Рафаэля. Нужен билет на время.',
    lat: 43.7687,
    lon: 11.2559,
    visitTime: '12:00',
    durationMin: 150,
  },
  {
    name: 'Понте-Веккьо',
    description: 'Средневековый мост с ювелирными лавками и видами на Арно. Удобная короткая остановка по пути на другой берег.',
    lat: 43.7680,
    lon: 11.2531,
    visitTime: '15:00',
    durationMin: 30,
  },
  {
    name: 'Палаццо Питти',
    description: 'Бывшая резиденция Медичи с дворцовыми музеями. Рядом находятся сады Боболи — для них стоит оставить отдельное время.',
    lat: 43.7652,
    lon: 11.2500,
    visitTime: '15:45',
    durationMin: 120,
  },
]

function readFlag(storage) {
  try {
    return storage?.getItem(INSTALL_FLAG) === '1'
  } catch {
    return false
  }
}

function writeFlag(storage) {
  try {
    storage?.setItem(INSTALL_FLAG, '1')
  } catch {
    // Приватный режим может запрещать localStorage. Сама поездка уже сохранена.
  }
}

/**
 * Один раз добавляет на устройство понятный пример новой пешеходной функции.
 * Пользовательские поездки не меняются, а удалённый пример не появляется снова.
 */
export async function ensureFlorenceWalkingDemo(
  database = db,
  storage = typeof window !== 'undefined' ? window.localStorage : null,
) {
  if (readFlag(storage)) return { created: false, reason: 'installed' }

  const existing = await database.trips
    .filter((trip) => trip.demoKey === FLORENCE_DEMO_KEY || trip.title === FLORENCE_DEMO_TITLE)
    .first()

  if (existing) {
    writeFlag(storage)
    return { created: false, reason: 'exists', tripId: existing.id }
  }

  let tripId
  await database.transaction('rw', database.trips, database.days, database.pois, async () => {
    tripId = await database.trips.add({
      title: FLORENCE_DEMO_TITLE,
      startDate: '2026-09-15',
      endDate: '2026-09-15',
      destinationName: 'Флоренция, Италия',
      destinationLat: 43.7696,
      destinationLon: 11.2558,
      demoKey: FLORENCE_DEMO_KEY,
      createdAt: new Date().toISOString(),
    })

    const dayId = await database.days.add({ tripId, date: '2026-09-15', order: 0 })
    await database.pois.bulkAdd(FLORENCE_POIS.map((poi, order) => ({
      ...poi,
      tripId,
      dayId,
      order,
      cost: null,
    })))
  })

  writeFlag(storage)
  return { created: true, tripId }
}
