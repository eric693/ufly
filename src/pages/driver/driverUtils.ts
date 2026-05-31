// Shared helpers for the driver app (geocoding, distance, routing, navigation)

export type LatLng = [number, number]

// ── Geocode (Nominatim), cached ───────────────────────────────────────────────
const geocodeCache: Record<string, LatLng> = {}
export async function geocode(address: string): Promise<LatLng | null> {
  if (!address) return null
  if (geocodeCache[address]) return geocodeCache[address]
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'zh-TW' } },
    )
    const data = await res.json()
    if (data[0]) {
      const coord: LatLng = [parseFloat(data[0].lat), parseFloat(data[0].lon)]
      geocodeCache[address] = coord
      return coord
    }
  } catch {}
  return null
}

// ── Straight-line distance in km ──────────────────────────────────────────────
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371
  const dLat = ((b[0] - a[0]) * Math.PI) / 180
  const dLng = ((b[1] - a[1]) * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

// ── Rough ETA in minutes (scooter ~20km/h city, +2min handling) ───────────────
export function etaMinutes(distKm: number): number {
  return Math.max(1, Math.round((distKm / 20) * 60) + 2)
}

// ── Distance label (m / km) ───────────────────────────────────────────────────
export function distLabel(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

// ── 代墊金額 label ─────────────────────────────────────────────────────────────
export function advanceLabel(amount?: number): string {
  return amount && amount > 0 ? `$${amount}` : '無需代墊'
}

// ── Driving route via OSRM (public demo server) ───────────────────────────────
// Returns the road-following polyline as [lat,lng][] (empty on failure).
export async function fetchRoute(waypoints: LatLng[]): Promise<LatLng[]> {
  const pts = waypoints.filter(Boolean)
  if (pts.length < 2) return []
  const coords = pts.map(([lat, lng]) => `${lng},${lat}`).join(';')
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`,
    )
    const data = await res.json()
    const line = data?.routes?.[0]?.geometry?.coordinates
    if (Array.isArray(line)) return line.map((c: number[]) => [c[1], c[0]] as LatLng)
  } catch {}
  return []
}

// ── Open external turn-by-turn navigation ─────────────────────────────────────
export function openNavigation(address: string, pos: LatLng | null) {
  const dest = pos ? `${pos[0]},${pos[1]}` : encodeURIComponent(address || '')
  if (!dest) return
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`, '_blank')
}
