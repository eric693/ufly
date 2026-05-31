import axios from 'axios'

export interface Coord { lat: number; lng: number }

// ── Caches (process-lifetime; only successful lookups cached so nulls retry) ────
const geocodeCache = new Map<string, Coord>()

const MAPBOX_TOKEN = () => process.env.MAPBOX_TOKEN || process.env.VITE_MAPBOX_TOKEN || ''
const GOOGLE_KEY   = () => process.env.GOOGLE_MAPS_API_KEY || ''

// ── Geocoding ──────────────────────────────────────────────────────────────────
async function mapboxGeocode(address: string): Promise<Coord | null> {
  const token = MAPBOX_TOKEN()
  if (!token) return null
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json`
    const { data } = await axios.get(url, {
      params: { access_token: token, limit: 1, country: 'tw', language: 'zh-Hant' },
      timeout: 6000,
    })
    const c = data?.features?.[0]?.center // [lng, lat]
    if (Array.isArray(c) && c.length === 2) return { lat: c[1], lng: c[0] }
  } catch { /* fall through */ }
  return null
}

async function nominatimGeocode(address: string): Promise<Coord | null> {
  try {
    const { data } = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: address, format: 'json', limit: 1, countrycodes: 'tw' },
      headers: { 'User-Agent': 'Ufly-Backend/1.0' },
      timeout: 6000,
    })
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch { /* fall through */ }
  return null
}

/** Geocode an address to coordinates. Mapbox (if token) → Nominatim. Cached. */
export async function geocode(address: string): Promise<Coord | null> {
  if (!address) return null
  if (geocodeCache.has(address)) return geocodeCache.get(address)!
  const coord = (await mapboxGeocode(address)) ?? (await nominatimGeocode(address))
  if (coord) geocodeCache.set(address, coord)
  return coord
}

// ── Distance helpers ────────────────────────────────────────────────────────────
function haversine(a: Coord, b: Coord): number {
  const R = 6371
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * 10) / 10
}

async function mapboxDistance(from: Coord, to: Coord): Promise<number | null> {
  const token = MAPBOX_TOKEN()
  if (!token) return null
  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from.lng},${from.lat};${to.lng},${to.lat}`
    const { data } = await axios.get(url, {
      params: { access_token: token, overview: 'false' },
      timeout: 6000,
    })
    const m = data?.routes?.[0]?.distance
    if (typeof m === 'number') return Math.round(m / 100) / 10 // metres → km (1dp)
  } catch { /* fall through */ }
  return null
}

async function osrmDistance(from: Coord, to: Coord): Promise<number | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`
    const { data } = await axios.get(url, { timeout: 6000 })
    if (data?.code === 'Ok' && data.routes?.[0]) return Math.round(data.routes[0].distance / 100) / 10
  } catch { /* fall through */ }
  return null
}

async function googleDistance(origin: string, destination: string): Promise<number | null> {
  const apiKey = GOOGLE_KEY()
  if (!apiKey) return null
  try {
    const { data } = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
      params: { origins: origin, destinations: destination, units: 'metric', key: apiKey },
      timeout: 5000,
    })
    const el = data?.rows?.[0]?.elements?.[0]
    if (el?.status === 'OK' && el.distance?.value) return Math.round(el.distance.value / 100) / 10
  } catch { /* fall through */ }
  return null
}

/**
 * Driving distance (km) between two address strings.
 * Priority: Google Distance Matrix (if key) → Mapbox/OSRM over geocoded coords → haversine → random.
 */
export async function calcDistance(origin: string, destination: string): Promise<number> {
  const gd = await googleDistance(origin, destination)
  if (gd !== null) return gd

  const [fromCoord, toCoord] = await Promise.all([geocode(origin), geocode(destination)])
  if (fromCoord && toCoord) {
    const md = (await mapboxDistance(fromCoord, toCoord)) ?? (await osrmDistance(fromCoord, toCoord))
    if (md !== null) return md
    return haversine(fromCoord, toCoord)
  }

  return Math.round((4 + Math.random() * 14) * 10) / 10
}

export { haversine }
