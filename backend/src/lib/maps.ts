import axios from 'axios'

// Nominatim geocode cache (process-lifetime, keyed by address string)
const geocodeCache = new Map<string, { lat: number; lng: number }>()

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (geocodeCache.has(address)) return geocodeCache.get(address)!
  try {
    const { data } = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: address, format: 'json', limit: 1, countrycodes: 'tw' },
      headers: { 'User-Agent': 'Ufly-Backend/1.0' },
      timeout: 6000,
    })
    if (data?.[0]) {
      const coord = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
      geocodeCache.set(address, coord)
      return coord
    }
  } catch { /* fall through */ }
  return null
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10
}

// OSRM public routing server — free, no API key required
async function osrmDistance(
  from: { lat: number; lng: number },
  to:   { lat: number; lng: number },
): Promise<number | null> {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`
    const { data } = await axios.get(url, { timeout: 6000 })
    if (data?.code === 'Ok' && data.routes?.[0]) {
      return Math.round(data.routes[0].distance / 100) / 10  // metres → km (1dp)
    }
  } catch { /* fall through */ }
  return null
}

// Google Maps Distance Matrix — only used when API key is configured
async function googleDistance(origin: string, destination: string): Promise<number | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) return null
  try {
    const { data } = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
      params: { origins: origin, destinations: destination, units: 'metric', key: apiKey },
      timeout: 5000,
    })
    const el = data?.rows?.[0]?.elements?.[0]
    if (el?.status === 'OK' && el.distance?.value) {
      return Math.round(el.distance.value / 100) / 10
    }
  } catch { /* fall through */ }
  return null
}

/**
 * Calculate driving distance between two address strings.
 * Priority: Google Maps API (if key set) → Nominatim geocode + OSRM → haversine → random fallback
 */
export async function calcDistance(origin: string, destination: string): Promise<number> {
  // 1. Google Maps (most accurate, requires paid API key)
  const gd = await googleDistance(origin, destination)
  if (gd !== null) return gd

  // 2. Free path: geocode with Nominatim, route with OSRM
  const [fromCoord, toCoord] = await Promise.all([
    geocodeAddress(origin),
    geocodeAddress(destination),
  ])
  if (fromCoord && toCoord) {
    const od = await osrmDistance(fromCoord, toCoord)
    if (od !== null) return od
    // Straight-line fallback if OSRM is unreachable
    return haversine(fromCoord.lat, fromCoord.lng, toCoord.lat, toCoord.lng)
  }

  // 3. Random fallback (only if Nominatim is completely unreachable)
  return Math.round((4 + Math.random() * 14) * 10) / 10
}
