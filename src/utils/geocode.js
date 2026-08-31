// Free OpenStreetMap Nominatim geocoding — no API key, be polite with rate limits (personal use only).
export async function searchPlace(query) {
  if (!query || query.trim().length < 2) return []
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'ru' },
  })
  if (!res.ok) throw new Error('Geocoding failed')
  const data = await res.json()
  return data.map((item) => ({
    name: item.display_name,
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
  }))
}
