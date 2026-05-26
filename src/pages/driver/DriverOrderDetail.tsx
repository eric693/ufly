import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Phone, Camera, Loader2, ChevronLeft, Navigation } from 'lucide-react'
import api from '../../lib/api'
import { getSocket } from '../../lib/socket'

// ── Leaflet icons ────────────────────────────────────────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl
const mkDivIcon = (color: string, label: string) =>
  L.divIcon({
    className: '',
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px">
      <div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>
      <div style="background:${color};color:#fff;font-size:10px;font-weight:700;padding:2px 5px;border-radius:4px;white-space:nowrap">${label}</div>
    </div>`,
    iconAnchor: [7, 7],
    iconSize: [14, 14],
  })

const driverIcon = L.divIcon({
  className: '',
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#1a1a1a;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.5)"></div>`,
  iconAnchor: [9, 9],
  iconSize: [18, 18],
})

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  accepted:   '前往取件中',
  pickup:     '已抵達取件地點',
  delivering: '配送中',
  completed:  '已完成配送',
}
const NEXT_ACTION: Record<string, { label: string; next: string }> = {
  accepted:   { label: '出發取件', next: 'pickup' },
  pickup:     { label: '確認已取件，開始配送', next: 'delivering' },
  delivering: { label: '確認已送達', next: 'completed' },
}
const STATUS_DEST: Record<string, 'pickup' | 'delivery'> = {
  accepted:   'pickup',
  pickup:     'pickup',
  delivering: 'delivery',
}

// ── Geocode helper (Nominatim) ────────────────────────────────────────────────
const geocodeCache: Record<string, [number, number]> = {}
async function geocode(address: string): Promise<[number, number] | null> {
  if (geocodeCache[address]) return geocodeCache[address]
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'zh-TW' } },
    )
    const data = await res.json()
    if (data[0]) {
      const coord: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)]
      geocodeCache[address] = coord
      return coord
    }
  } catch {}
  return null
}

// ── Map auto-fit helper ───────────────────────────────────────────────────────
function MapFit({ positions }: { positions: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (positions.length === 0) return
    if (positions.length === 1) { map.setView(positions[0], 15); return }
    const bounds = L.latLngBounds(positions)
    map.fitBounds(bounds, { padding: [60, 60] })
  }, [JSON.stringify(positions)])
  return null
}

// ── Slide-to-confirm component ───────────────────────────────────────────────
function SlideConfirm({ label, onConfirm, disabled }: { label: string; onConfirm: () => void; disabled: boolean }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [x, setX] = useState(0)
  const startX = useRef(0)
  const confirmed = useRef(false)

  const THUMB = 56
  const getMax = () => (trackRef.current?.clientWidth ?? 280) - THUMB - 8

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return
    confirmed.current = false
    setDragging(true)
    startX.current = e.clientX - x
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return
    const nx = Math.max(0, Math.min(e.clientX - startX.current, getMax()))
    setX(nx)
    if (nx >= getMax() - 4 && !confirmed.current) {
      confirmed.current = true
      setDragging(false)
      onConfirm()
    }
  }
  const onPointerUp = () => {
    if (!confirmed.current) setX(0)
    setDragging(false)
  }

  useEffect(() => { if (!disabled) { setX(0); confirmed.current = false } }, [disabled])

  return (
    <div ref={trackRef}
      className="relative w-full rounded-2xl overflow-hidden select-none"
      style={{ background: '#1a1a1a', height: THUMB + 8 }}>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-white/50 text-sm font-semibold tracking-wide">{label}</span>
      </div>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          position: 'absolute',
          top: 4,
          left: 4 + x,
          width: THUMB,
          height: THUMB,
          background: '#fff',
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: disabled ? 'not-allowed' : 'grab',
          transition: dragging ? 'none' : 'left .25s ease',
          boxShadow: '0 2px 8px rgba(0,0,0,.3)',
          touchAction: 'none',
        }}>
        <ChevronLeft size={20} style={{ transform: 'rotate(180deg)', color: '#1a1a1a' }} />
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DriverOrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [order, setOrder]       = useState<any>(null)
  const [loading, setLoading]   = useState(true)
  const [updating, setUpdating] = useState(false)
  const [updateError, setUpdateError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Map positions
  const [driverPos, setDriverPos]     = useState<[number, number] | null>(null)
  const [pickupPos, setPickupPos]     = useState<[number, number] | null>(null)
  const [deliveryPos, setDeliveryPos] = useState<[number, number] | null>(null)

  // Distance display
  const [distToNext, setDistToNext] = useState<string | null>(null)

  useEffect(() => {
    api.get('/drivers/me/current')
      .then(r => {
        const current = r.data
        if (!current) { navigate('/driver', { replace: true }); return }
        if (current.id !== id) { navigate(`/driver/order/${current.id}`, { replace: true }); return }
        setOrder(current)
        setLoading(false)
      })
      .catch(() => { navigate('/driver', { replace: true }) })

    const socket = getSocket()
    const handler = (updated: any) => {
      if (updated.id !== id) return
      if (updated.status === 'cancelled') {
        // Customer cancelled — go back to queue
        navigate('/driver', { replace: true })
        return
      }
      setOrder(updated)
    }
    socket.on('order:update', handler)
    return () => { socket.off('order:update', handler) }
  }, [id])

  // Geocode addresses when order loads
  useEffect(() => {
    if (!order) return
    if (order.pickup_address)  geocode(order.pickup_address).then(p => p && setPickupPos(p))
    if (order.delivery_address) geocode(order.delivery_address).then(p => p && setDeliveryPos(p))
  }, [order?.id])

  // GPS broadcast + update driver position on map
  useEffect(() => {
    if (!order || ['completed', 'cancelled'].includes(order.status)) return
    if (!navigator.geolocation) return
    const socket = getSocket()
    const watchId = navigator.geolocation.watchPosition(
      pos => {
        const coord: [number, number] = [pos.coords.latitude, pos.coords.longitude]
        setDriverPos(coord)
        socket.emit('driver:location', { lat: coord[0], lng: coord[1] })
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [order?.status])

  // Compute straight-line distance to next waypoint
  useEffect(() => {
    if (!driverPos) { setDistToNext(null); return }
    if (!order) return
    const dest = STATUS_DEST[order.status] === 'pickup' ? pickupPos : deliveryPos
    if (!dest) { setDistToNext(null); return }
    const R = 6371
    const dLat = ((dest[0] - driverPos[0]) * Math.PI) / 180
    const dLng = ((dest[1] - driverPos[1]) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((driverPos[0] * Math.PI) / 180) *
        Math.cos((dest[0] * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2
    const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    setDistToNext(km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`)
  }, [driverPos, pickupPos, deliveryPos, order?.status])

  const updateStatus = useCallback(async () => {
    if (!order || !NEXT_ACTION[order.status] || updating) return
    setUpdating(true)
    try {
      const { data } = await api.patch(`/drivers/orders/${order.id}/status`, { status: NEXT_ACTION[order.status].next })
      setOrder(data)
      if (data.status === 'completed') setTimeout(() => navigate('/driver'), 2000)
    } catch (e: any) {
      setUpdateError(e?.response?.data?.error || '更新失敗')
      setTimeout(() => setUpdateError(''), 3000)
    } finally {
      setUpdating(false)
    }
  }, [order, updating])

  const uploadPhoto = async (file: File) => {
    if (!order) return
    setUploading(true)
    try {
      const form = new FormData(); form.append('photo', file)
      const { data } = await api.post(`/upload/proof/${order.id}`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setPhotoUrl(data.photo_url)
    } catch { alert('上傳失敗，請重試') }
    finally { setUploading(false) }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 size={28} className="animate-spin text-paper-400" />
    </div>
  )

  if (!order) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-paper-500">無進行中訂單</p>
      <button onClick={() => navigate('/driver')} className="btn-primary">返回接單列表</button>
    </div>
  )

  const mapPositions: [number, number][] = [
    ...(driverPos ? [driverPos] : []),
    ...(pickupPos ? [pickupPos] : []),
    ...(deliveryPos ? [deliveryPos] : []),
  ]
  const defaultCenter: [number, number] = driverPos ?? pickupPos ?? [25.0330, 121.5654]
  const destPos = STATUS_DEST[order.status] === 'pickup' ? pickupPos : deliveryPos

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-100">

      {/* ── Full-screen Map ── */}
      <div className="absolute inset-0">
        <MapContainer
          center={defaultCenter}
          zoom={14}
          zoomControl={false}
          style={{ height: '100%', width: '100%' }}
          attributionControl={false}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution=""
          />
          <MapFit positions={mapPositions} />
          {driverPos && (
            <Marker position={driverPos} icon={driverIcon}>
              <Popup>您的位置</Popup>
            </Marker>
          )}
          {pickupPos && (
            <Marker position={pickupPos} icon={mkDivIcon('#16a34a', '取件')}>
              <Popup>{order.pickup_address}</Popup>
            </Marker>
          )}
          {deliveryPos && (
            <Marker position={deliveryPos} icon={mkDivIcon('#dc2626', '送達')}>
              <Popup>{order.delivery_address}</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* ── Top Bar ── */}
      <div className="absolute top-0 left-0 right-0 z-[1000]">
        <div className="flex items-start justify-between p-4 pt-8">
          <button
            onClick={() => navigate('/driver')}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md">
            <ChevronLeft size={20} className="text-gray-900" />
          </button>
          {destPos && driverPos && distToNext && (
            <div className="bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md">
              <Navigation size={13} className="inline mr-1.5 -mt-0.5" />
              {distToNext}
            </div>
          )}
        </div>

        {/* Status banner */}
        <div className="mx-4 mt-1 bg-gray-900/90 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-md">
          <div className="text-white font-bold text-base">{STATUS_LABELS[order.status] ?? order.status}</div>
          {order.status === 'accepted' || order.status === 'pickup' ? (
            <div className="text-white/60 text-xs mt-0.5 truncate">{order.pickup_address}</div>
          ) : order.status === 'delivering' ? (
            <div className="text-white/60 text-xs mt-0.5 truncate">{order.delivery_address}</div>
          ) : null}
        </div>
      </div>

      {/* ── Bottom Sheet ── */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-white rounded-t-3xl shadow-[0_-4px_24px_rgba(0,0,0,.12)]">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-4" />

        <div className="px-5 pb-8 space-y-4">

          {/* Fee & order ID */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-black text-gray-900">NT${order.total_fee}</div>
              <div className="text-xs text-gray-400 mt-0.5">{order.id}</div>
            </div>
            <div className="flex gap-3">
              {order.pickup_phone && (
                <a href={`tel:${order.pickup_phone}`}
                  className="w-11 h-11 bg-gray-100 rounded-2xl flex items-center justify-center">
                  <Phone size={18} className="text-gray-700" />
                </a>
              )}
            </div>
          </div>

          {/* Route */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0 flex flex-col items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-600 border-2 border-white ring-2 ring-green-600" />
                <div className="w-0.5 h-6 bg-gray-200" />
                <div className="w-3 h-3 rounded-sm bg-red-600 border-2 border-white ring-2 ring-red-600" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <div className="text-xs text-gray-400 font-medium">取件地點</div>
                  <div className="text-sm font-semibold text-gray-900 leading-snug">{order.pickup_address}</div>
                  {order.pickup_phone && (
                    <a href={`tel:${order.pickup_phone}`} className="text-xs text-blue-600 flex items-center gap-1 mt-0.5">
                      <Phone size={11} />{order.pickup_phone}
                    </a>
                  )}
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-medium">送達地點</div>
                  <div className="text-sm font-semibold text-gray-900 leading-snug">{order.delivery_address}</div>
                  {order.delivery_phone && (
                    <a href={`tel:${order.delivery_phone}`} className="text-xs text-blue-600 flex items-center gap-1 mt-0.5">
                      <Phone size={11} />{order.delivery_phone}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-3 text-sm text-gray-500">
            {order.duration && (
              <span className="flex items-center gap-1 bg-gray-50 rounded-xl px-3 py-1.5 font-medium">
                {order.duration} 分鐘
              </span>
            )}
            {order.distance && (
              <span className="flex items-center gap-1 bg-gray-50 rounded-xl px-3 py-1.5 font-medium">
                {order.distance} km
              </span>
            )}
            {distToNext && (
              <span className="flex items-center gap-1 bg-green-50 text-green-700 rounded-xl px-3 py-1.5 font-medium">
                導航 {distToNext}
              </span>
            )}
          </div>

          {/* Photo upload */}
          {order.status === 'delivering' && (
            <div>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={e => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
              {photoUrl || order.photo_url ? (
                <img src={photoUrl || order.photo_url} alt="送達照片" className="w-full rounded-2xl max-h-40 object-cover" />
              ) : (
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-2xl py-3 text-gray-400 hover:border-gray-300 transition-colors text-sm">
                  {uploading ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
                  {uploading ? '上傳中' : '拍攝送達照片（選填）'}
                </button>
              )}
            </div>
          )}

          {/* Action */}
          {updateError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-2.5">{updateError}</div>
          )}
          {NEXT_ACTION[order.status] && (
            <SlideConfirm
              label={`滑動${NEXT_ACTION[order.status].label}`}
              onConfirm={updateStatus}
              disabled={updating}
            />
          )}

          {order.status === 'completed' && (
            <div className="text-center py-4">
              <div className="text-xl font-black text-gray-900">配送完成</div>
              <p className="text-gray-400 text-sm mt-1">即將返回接單頁面</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
