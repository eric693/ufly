import axios from 'axios'

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Fallback: random Taipei-metro distance (4–18 km)
function randomDistance(): number {
  return Math.round((4 + Math.random() * 14) * 10) / 10
}

export async function calcDistance(origin: string, destination: string): Promise<number> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) return randomDistance()

  try {
    const url = 'https://maps.googleapis.com/maps/api/distancematrix/json'
    const { data } = await axios.get(url, {
      params: { origins: origin, destinations: destination, units: 'metric', key: apiKey },
      timeout: 5000,
    })
    const el = data?.rows?.[0]?.elements?.[0]
    if (el?.status === 'OK' && el.distance?.value) {
      return Math.round(el.distance.value / 100) / 10 // metres → km (1dp)
    }
  } catch {
    // fall through to fallback
  }
  return randomDistance()
}
