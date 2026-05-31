// Central map provider config. Uses Mapbox when VITE_MAPBOX_TOKEN is set,
// otherwise falls back to the free OSM/Nominatim/OSRM stack (dev only).

export type LatLng = [number, number]

const TOKEN: string = ((import.meta as any).env?.VITE_MAPBOX_TOKEN as string) || ''
export const hasMapbox = !!TOKEN
export const MAPBOX_TOKEN = TOKEN

// ── Tile layer props (spread into react-leaflet <TileLayer {...mapTile} />) ─────
export const mapTile = TOKEN
  ? {
      url: `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${TOKEN}`,
      attribution: '© Mapbox © OpenStreetMap',
      tileSize: 512,
      zoomOffset: -1,
      maxZoom: 20,
    }
  : {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }

// ── Geocoding (cached) ──────────────────────────────────────────────────────────
const geocodeCache: Record<string, LatLng | null> = {}

export async function geocode(address: string): Promise<LatLng | null> {
  if (!address) return null
  if (address in geocodeCache) return geocodeCache[address]
  let coord: LatLng | null = null
  if (TOKEN) {
    try {
      const r = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json` +
        `?access_token=${TOKEN}&limit=1&country=tw&language=zh-Hant`,
      )
      const d = await r.json()
      const c = d?.features?.[0]?.center // [lng, lat]
      if (Array.isArray(c) && c.length === 2) coord = [c[1], c[0]]
    } catch { /* fall through */ }
  }
  if (!coord) {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=tw`,
        { headers: { 'Accept-Language': 'zh-TW' } },
      )
      const d = await r.json()
      if (d[0]) coord = [parseFloat(d[0].lat), parseFloat(d[0].lon)]
    } catch { /* fall through */ }
  }
  geocodeCache[address] = coord
  return coord
}

// ── Address autocomplete suggestions (shape kept Nominatim-compatible) ──────────
export interface AddressSuggestion { place_id: number; display_name: string; lat: string; lon: string }

export async function geocodeSuggest(q: string): Promise<AddressSuggestion[]> {
  if (q.trim().length < 3) return []
  if (TOKEN) {
    try {
      const r = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
        `?access_token=${TOKEN}&limit=5&country=tw&language=zh-Hant`,
      )
      const d = await r.json()
      if (Array.isArray(d?.features)) {
        return d.features.map((f: any, i: number) => ({
          place_id: i,
          display_name: f.place_name as string,
          lat: String(f.center?.[1] ?? ''),
          lon: String(f.center?.[0] ?? ''),
        }))
      }
    } catch { /* fall through */ }
  }
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=tw&accept-language=zh-TW`,
    )
    return await r.json()
  } catch { return [] }
}

// ── Driving route + ETA (Mapbox Directions → OSRM fallback) ────────────────────
export interface RouteResult { coords: LatLng[]; durationSec: number }

export async function routeWithEta(from: LatLng, to: LatLng): Promise<RouteResult | null> {
  if (TOKEN) {
    try {
      const r = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${from[1]},${from[0]};${to[1]},${to[0]}` +
        `?geometries=geojson&overview=full&access_token=${TOKEN}`,
      )
      const d = await r.json()
      const route = d?.routes?.[0]
      if (route?.geometry?.coordinates) {
        return {
          coords: route.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as LatLng),
          durationSec: Math.round(route.duration),
        }
      }
    } catch { /* fall through */ }
  }
  try {
    const r = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`,
    )
    const d = await r.json()
    if (d.code === 'Ok' && d.routes?.[0]) {
      const route = d.routes[0]
      return {
        coords: route.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as LatLng),
        durationSec: Math.round(route.duration),
      }
    }
  } catch { /* fall through */ }
  return null
}
