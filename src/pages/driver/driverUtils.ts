// Shared helpers for the driver app. Geocoding + routing go through the central
// map provider (Mapbox when VITE_MAPBOX_TOKEN is set, OSM/OSRM fallback).
import { geocode as providerGeocode, routeWithEta, type LatLng } from '../../lib/mapConfig'

export type { LatLng }

// Re-export the provider geocode so existing imports keep working
export const geocode = providerGeocode

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

// ── Driving route polyline as [lat,lng][] (empty on failure) ──────────────────
export async function fetchRoute(waypoints: LatLng[]): Promise<LatLng[]> {
  const pts = waypoints.filter(Boolean)
  if (pts.length < 2) return []
  const r = await routeWithEta(pts[0], pts[pts.length - 1])
  return r?.coords ?? []
}

// ── Open external turn-by-turn navigation (Google Maps deep-link) ─────────────
export function openNavigation(address: string, pos: LatLng | null) {
  const dest = pos ? `${pos[0]},${pos[1]}` : encodeURIComponent(address || '')
  if (!dest) return
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`, '_blank')
}
