function text(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function coordinates(value) {
  const lat = Number(value?.lat)
  const lon = Number(value?.lon)
  return Number.isFinite(lat) && Number.isFinite(lon)
    && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
    ? { lat, lon }
    : null
}

export function normalizeRouteStart(raw) {
  const point = coordinates(raw)
  if (!point || !text(raw?.name)) return null
  const allowedTypes = new Set(['hotel', 'station', 'custom'])
  return {
    type: allowedTypes.has(raw.type) ? raw.type : 'custom',
    name: text(raw.name),
    address: text(raw.address) || null,
    ...point,
  }
}

export function normalizePoiAnalysis(raw) {
  if (!raw || typeof raw !== 'object') return null
  const highlights = (Array.isArray(raw.highlights) ? raw.highlights : [])
    .map(text)
    .filter(Boolean)
    .slice(0, 8)
  const analysis = {
    whyVisit: text(raw.whyVisit),
    highlights,
    practicalTip: text(raw.practicalTip),
    booking: text(raw.booking),
    bestTime: text(raw.bestTime),
    sourceUrl: /^https?:\/\//i.test(text(raw.sourceUrl)) ? text(raw.sourceUrl) : null,
    sourceTitle: text(raw.sourceTitle) || null,
    checkedAt: text(raw.checkedAt) || null,
  }
  return Object.values(analysis).some((value) => Array.isArray(value) ? value.length : Boolean(value))
    ? analysis
    : null
}

export function normalizeRouteSources(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .map((source) => ({
      title: text(source?.title) || 'Официальный источник',
      url: /^https?:\/\//i.test(text(source?.url)) ? text(source.url) : null,
    }))
    .filter((source) => source.url)
    .slice(0, 12)
}

export function routeStartLabel(start) {
  if (!start) return null
  const labels = { hotel: 'Отель', station: 'Вокзал', custom: 'Точка старта' }
  return `${labels[start.type] || labels.custom}: ${start.name}`
}

/**
 * Это не оценка красоты текста, а прозрачный минимальный порог: маршрут
 * нельзя называть подробно проработанным, если у него нет старта, логики
 * порядка или практических сведений по каждой остановке.
 */
export function analyzeRouteQuality(day, pois = []) {
  const start = normalizeRouteStart(day?.routeStart)
  const detailed = pois.filter((poi) => {
    const analysis = normalizePoiAnalysis(poi?.analysis)
    return text(poi?.description).length >= 100
      && Number(poi?.durationMin) > 0
      && text(analysis?.whyVisit).length >= 60
      && analysis?.highlights?.length >= 2
      && text(analysis?.practicalTip).length >= 40
      && Boolean(analysis?.sourceUrl)
  }).length
  const hasRationale = text(day?.routeRationale).length >= 80
  const ready = Boolean(start) && pois.length >= 2 && detailed === pois.length && hasRationale

  return {
    ready,
    start,
    detailed,
    total: pois.length,
    hasRationale,
  }
}
