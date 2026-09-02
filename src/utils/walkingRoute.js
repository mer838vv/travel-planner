const MAX_POINTS_PER_LINK = 5

function coordinate(point) {
  const lat = Number(point?.lat)
  const lon = Number(point?.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  return `${lat},${lon}`
}

/**
 * Google Maps на мобильном надёжно принимает три промежуточные точки:
 * вместе со стартом и финишем это пять мест в одной ссылке.
 */
export function splitWalkingRoute(points = [], maxPoints = MAX_POINTS_PER_LINK) {
  const valid = points.filter((point) => coordinate(point))
  if (valid.length < 2) return []

  const stages = []
  let start = 0
  while (start < valid.length - 1) {
    const stage = valid.slice(start, start + maxPoints)
    if (stage.length < 2) break
    stages.push(stage)
    start += stage.length - 1
  }
  return stages
}

export function googleMapsWalkingUrl(points = []) {
  const valid = points.filter((point) => coordinate(point))
  if (valid.length < 2) return null

  const params = new URLSearchParams({
    api: '1',
    origin: coordinate(valid[0]),
    destination: coordinate(valid[valid.length - 1]),
    travelmode: 'walking',
  })
  const waypoints = valid.slice(1, -1).map(coordinate)
  if (waypoints.length) params.set('waypoints', waypoints.join('|'))

  return `https://www.google.com/maps/dir/?${params.toString()}`
}

export function visitDurationText(points = []) {
  const minutes = points.reduce((sum, point) => {
    const value = Number(point?.durationMin)
    return sum + (Number.isFinite(value) && value > 0 ? value : 0)
  }, 0)
  if (!minutes) return null
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!hours) return `${rest} мин на посещения`
  if (!rest) return `${hours} ч на посещения`
  return `${hours} ч ${rest} мин на посещения`
}
