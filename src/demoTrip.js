import { db } from './db.js'

export const FLORENCE_DEMO_KEY = 'florence-city-guide-v2'
export const FLORENCE_DEMO_TITLE = 'Флоренция: маршрут от вокзала'
const LEGACY_KEY = 'florence-walking-demo-v1'
const LEGACY_TITLE = 'Проверка прогулки: Флоренция'
const INSTALL_FLAG = `travel-planner:${FLORENCE_DEMO_KEY}:installed`

const DAY_GUIDE = {
  routeStart: {
    type: 'station',
    name: 'Firenze Santa Maria Novella',
    address: 'Piazza della Stazione, Firenze',
    lat: 43.7765,
    lon: 11.2479,
  },
  routeSummary: 'Первый день во Флоренции без бессмысленных зигзагов: от вокзала маршрут постепенно проходит через религиозный и гражданский центры города, затем — в Уффици и к Арно.',
  routeRationale: 'Начало у Санта-Мария-Новелла использует раннее открытие комплекса и не заставляет возвращаться к вокзалу. Затем путь идёт на восток к Дуомо, после чего почти по прямой спускается к площади Синьории, Уффици и Понте-Веккьо. Уффици поставлена после обеда как единственная длинная музейная остановка; её время нужно привязать к купленному билету.',
  breakSuggestion: 'После площади Синьории оставьте 45–60 минут на обед до Уффици. Не добавляйте в этот же день Питти и Боболи: после большой галереи это превратит прогулку в забег.',
  walkingDistanceKm: 2.4,
  walkingDurationMin: 35,
  researchedAt: '03.09.2026',
  routeSources: [
    { title: 'Официальный маршрут Visit Tuscany', url: 'https://www.visittuscany.com/en/itineraries/florence-urban-itinerary/' },
    { title: 'Комплекс Дуомо', url: 'https://tickets.duomo.firenze.it/en/support/faq' },
    { title: 'Галерея Уффици', url: 'https://www.uffizi.it/en/visit' },
  ],
}

const FLORENCE_POIS = [
  {
    name: 'Санта-Мария-Новелла',
    description: 'Не просто церковь у вокзала, а цельный доминиканский комплекс с базиликой, зелёным клуатром и Испанской капеллой. Это спокойное и содержательное введение во флорентийское искусство до выхода к самым людным площадям.',
    lat: 43.7746, lon: 11.2494, visitTime: '09:00', durationMin: 60,
    analysis: {
      whyVisit: 'Здесь удобно увидеть, как флорентийская живопись и архитектура переходили от Средневековья к Возрождению, ещё до встречи с главными городскими символами.',
      highlights: ['«Троица» Мазаччо — один из ключевых опытов линейной перспективы', 'Распятия Джотто и Брунеллески, фрески капеллы Торнабуони', 'Зелёный клуатр и Испанская капелла входят в единый маршрут комплекса'],
      practicalTip: 'Вход находится со стороны площади. Расписание меняется по дням недели и из-за богослужений; проверьте его утром, последний вход бывает раньше закрытия.',
      bestTime: 'К открытию: комплекс ещё не переполнен, а после него удобно продолжить к Дуомо.',
      booking: 'Обычный билет можно купить на месте; на даты с изменённым расписанием заранее сверьтесь с официальным сайтом.',
      sourceTitle: 'Santa Maria Novella — официальный сайт', sourceUrl: 'https://www.smn.it/en/visit/', checkedAt: '03.09.2026',
    },
  },
  {
    name: 'Площадь Дуомо',
    description: 'Смотрите на ансамбль целиком: собор Санта-Мария-дель-Фьоре, купол Брунеллески, кампанилу Джотто и баптистерий образуют не одну точку, а несколько разных впечатлений. Для первого дня разумнее выбрать один подъём, а не пытаться войти повсюду.',
    lat: 43.7731, lon: 11.2560, visitTime: '10:30', durationMin: 90,
    analysis: {
      whyVisit: 'Это наглядный рассказ о городских амбициях Флоренции: инженерный прорыв купола, мраморные фасады и отдельные эпохи ансамбля считываются прямо на площади.',
      highlights: ['Обойдите собор, чтобы увидеть различие фасада и конструкции купола', 'Сравните рельефы кампанилы и бронзовые двери баптистерия', 'Если поднимаетесь, выберите либо купол, либо колокольню — оба подъёма в один день избыточны'],
      practicalTip: 'В собор вход свободный, но очередь может быть большой. Для купола обязательна бронь времени, а для колокольни действуют отдельные правила выбранного пропуска.',
      bestTime: 'До полудня, пока площадь немного спокойнее и остаётся запас до музейного времени.',
      booking: 'Время для подъёма на купол бронируется обязательно на официальной билетной площадке Opera del Duomo.',
      sourceTitle: 'Opera del Duomo — официальная справка', sourceUrl: 'https://tickets.duomo.firenze.it/en/support/faq', checkedAt: '03.09.2026',
    },
  },
  {
    name: 'Площадь Синьории',
    description: 'Гражданский центр Флоренции читается как музей под открытым небом: Палаццо Веккьо показывает власть коммуны, Лоджия деи Ланци — публичную скульптуру, а копия «Давида» отмечает место, где стоял оригинал Микеланджело.',
    lat: 43.7697, lon: 11.2556, visitTime: '12:30', durationMin: 45,
    analysis: {
      whyVisit: 'После религиозного центра здесь становится понятна политическая Флоренция: кто управлял городом и почему искусство занимало важное место в публичном пространстве.',
      highlights: ['Фасад и башня Палаццо Веккьо', 'Персей Челлини и скульптуры в Лоджии деи Ланци', 'Фонтан Нептуна и конный памятник Козимо I'],
      practicalTip: 'Площадь бесплатна и всегда доступна, но днём очень людно. Осматривайте скульптуры со стороны Лоджии, не перекрывая проход к Палаццо Веккьо.',
      bestTime: 'Перед обедом: отсюда удобно сделать паузу, а затем пройти к входу Уффици.',
      booking: 'Для площади билет не нужен. Посещение интерьеров Палаццо Веккьо — отдельная программа и требует дополнительного времени.',
      sourceTitle: 'FeelFlorence — официальный туристический портал', sourceUrl: 'https://www.feelflorence.it/en/points-interest/piazza-della-signoria', checkedAt: '03.09.2026',
    },
  },
  {
    name: 'Галерея Уффици',
    description: 'Большой музей лучше проходить как отобранную историю Ренессанса, а не как попытку увидеть каждый зал. Сосредоточьтесь на Джотто, Боттичелли, Леонардо, Микеланджело и Рафаэле — тогда два с половиной часа останутся насыщенными, но посильными.',
    lat: 43.7687, lon: 11.2559, visitTime: '14:15', durationMin: 150, cost: 'Проверить актуальную цену',
    analysis: {
      whyVisit: 'Уффици связывает увиденную утром архитектуру с живописью её времени и позволяет проследить переход от позднего Средневековья к Высокому Возрождению.',
      highlights: ['Залы Боттичелли: «Весна» и «Рождение Венеры»', 'Ранние работы Леонардо и круг Верроккьо', 'Тондо Дони Микеланджело и портреты Рафаэля'],
      practicalTip: 'Придите к зоне входа за 15–20 минут, учитывая проверку и получение билета. Скачайте официальную схему и заранее отметьте приоритетные залы.',
      bestTime: 'По билету на фиксированное время; маршрут дня нужно сдвигать вокруг этой брони, а не наоборот.',
      booking: 'Покупайте только через официальный сервис, на который ведёт сайт Уффици. Предварительная бронь уменьшает риск потерять время в очереди.',
      sourceTitle: 'Uffizi Galleries — официальный сайт', sourceUrl: 'https://www.uffizi.it/en/visit', checkedAt: '03.09.2026',
    },
  },
  {
    name: 'Понте-Веккьо',
    description: 'Финальная точка работает не ради витрин, а ради городского пейзажа: средневековая конструкция с лавками, коридор Вазари над ними и виды вдоль Арно собирают в одном месте торговую, придворную и инженерную историю города.',
    lat: 43.7680, lon: 11.2531, visitTime: '17:10', durationMin: 30,
    analysis: {
      whyVisit: 'После музейных залов мост возвращает к живому городу и завершает маршрут естественно — у реки, без ещё одного длинного посещения в помещении.',
      highlights: ['Центральные открытые пролёты с видом на Арно', 'Линия коридора Вазари над ювелирными лавками', 'Вид на сам Понте-Веккьо лучше открыть с моста Санта-Тринита'],
      practicalTip: 'На самом мосту тесно; для фотографии отойдите к Понте-Санта-Тринита. Следите за вещами в плотной толпе и не планируйте здесь быстрый переход.',
      bestTime: 'Ближе к вечеру, когда музейная часть дня закончена и можно не спешить.',
      booking: 'Для прогулки по мосту билет не нужен; посещение коридора Вазари является отдельным продуктом с правилами бронирования.',
      sourceTitle: 'FeelFlorence — официальный туристический портал', sourceUrl: 'https://www.feelflorence.it/it/punti-di-interesse/ponte-vecchio-0', checkedAt: '03.09.2026',
    },
  },
]

function readFlag(storage) {
  try { return storage?.getItem(INSTALL_FLAG) === '1' } catch { return false }
}

function writeFlag(storage) {
  try { storage?.setItem(INSTALL_FLAG, '1') } catch { /* localStorage может быть закрыт */ }
}

async function writeGuide(database, tripId, dayId) {
  await database.trips.update(tripId, {
    title: FLORENCE_DEMO_TITLE,
    demoKey: FLORENCE_DEMO_KEY,
    destinationName: 'Флоренция, Италия',
    destinationLat: 43.7696,
    destinationLon: 11.2558,
  })
  await database.days.update(dayId, DAY_GUIDE)
  await database.pois.where('tripId').equals(tripId).delete()
  await database.pois.bulkAdd(FLORENCE_POIS.map((poi, order) => ({
    ...poi, tripId, dayId, order, cost: poi.cost ?? null,
  })))
}

/** Добавляет новый пример или безопасно обновляет только старую демо-поездку. */
export async function ensureFlorenceWalkingDemo(
  database = db,
  storage = typeof window !== 'undefined' ? window.localStorage : null,
) {
  if (readFlag(storage)) return { created: false, reason: 'installed' }

  const existing = await database.trips
    .filter((trip) => [FLORENCE_DEMO_KEY, LEGACY_KEY].includes(trip.demoKey)
      || [FLORENCE_DEMO_TITLE, LEGACY_TITLE].includes(trip.title))
    .first()

  if (existing?.demoKey === FLORENCE_DEMO_KEY || existing?.title === FLORENCE_DEMO_TITLE) {
    writeFlag(storage)
    return { created: false, reason: 'exists', tripId: existing.id }
  }

  if (existing) {
    const [day] = await database.days.where('tripId').equals(existing.id).sortBy('order')
    if (day) {
      await database.transaction('rw', database.trips, database.days, database.pois, async () => {
        await writeGuide(database, existing.id, day.id)
      })
      writeFlag(storage)
      return { created: false, upgraded: true, tripId: existing.id }
    }
  }

  let tripId
  await database.transaction('rw', database.trips, database.days, database.pois, async () => {
    tripId = await database.trips.add({
      title: FLORENCE_DEMO_TITLE,
      startDate: '2026-09-15', endDate: '2026-09-15',
      destinationName: 'Флоренция, Италия', destinationLat: 43.7696, destinationLon: 11.2558,
      demoKey: FLORENCE_DEMO_KEY, createdAt: new Date().toISOString(),
    })
    const dayId = await database.days.add({ tripId, date: '2026-09-15', order: 0, ...DAY_GUIDE })
    await database.pois.bulkAdd(FLORENCE_POIS.map((poi, order) => ({
      ...poi, tripId, dayId, order, cost: poi.cost ?? null,
    })))
  })

  writeFlag(storage)
  return { created: true, tripId }
}
