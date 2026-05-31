import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Phone, MessageSquare, Camera, Loader2, ChevronLeft, Navigation, Menu } from 'lucide-react'
import api from '../../lib/api'
import { getSocket } from '../../lib/socket'
import { geocode, haversineKm, etaMinutes, distLabel, advanceLabel, fetchRoute, openNavigation, LatLng } from './driverUtils'
import { mapTile } from '../../lib/mapConfig'
import { useWakeLock } from '../../hooks/useWakeLock'

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

// ── Per-status flow config ─────────────────────────────────────────────────────
type DestKey = 'pickup' | 'delivery'
const FLOW: Record<string, {
  title: string; destKey: DestKey; navLabel: string; actionLabel: string; next: string
}> = {
  accepted:   { title: '任務已接受', destKey: 'pickup',   navLabel: '導航到取件地', actionLabel: '我已到達取件點', next: 'pickup' },
  pickup:     { title: '前往取件',   destKey: 'pickup',   navLabel: '導航到取件地', actionLabel: '確認取件並出發', next: 'delivering' },
  delivering: { title: '前往送達',   destKey: 'delivery', navLabel: '導航到送達地', actionLabel: '我已到達送達點', next: 'completed' },
}

// ── Map auto-fit helper ───────────────────────────────────────────────────────
function MapFit({ positions }: { positions: LatLng[] }) {
  const map = useMap()
  useEffect(() => {
    if (positions.length === 0) return
    if (positions.length === 1) { map.setView(positions[0], 15); return }
    map.fitBounds(L.latLngBounds(positions), { padding: [70, 70] })
  }, [JSON.stringify(positions)])
  return null
}

// ── Stat cell ─────────────────────────────────────────────────────────────────
function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex-1 px-3 py-2.5">
      <div className="text-[11px] text-white/45 font-medium mb-1">{label}</div>
      <div className={`font-black leading-none text-lg ${accent ? 'text-yellow-400' : 'text-white'}`}>{value}</div>
    </div>
  )
}

// ── Route row ─────────────────────────────────────────────────────────────────
function RouteStop({
  dotColor, label, address, phone,
}: { dotColor: string; label: string; address: string; phone?: string }) {
  return (
    <div className="flex items-center gap-3 bg-white/[0.06] rounded-2xl px-4 py-3.5">
      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: dotColor }} />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-white/45 font-medium">{label}</div>
        <div className="text-[15px] font-bold text-white truncate">{address}</div>
      </div>
      {phone && (
        <div className="flex gap-2 flex-shrink-0">
          <a href={`tel:${phone}`} className="w-9 h-9 rounded-xl border border-white/15 flex items-center justify-center text-white/70 active:bg-white/10">
            <Phone size={15} />
          </a>
          <a href={`sms:${phone}`} className="w-9 h-9 rounded-xl border border-white/15 flex items-center justify-center text-white/70 active:bg-white/10">
            <MessageSquare size={15} />
          </a>
        </div>
      )}
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

  const [driverPos, setDriverPos]     = useState<LatLng | null>(null)
  const [pickupPos, setPickupPos]     = useState<LatLng | null>(null)
  const [deliveryPos, setDeliveryPos] = useState<LatLng | null>(null)
  const [routeLine, setRouteLine]     = useState<LatLng[]>([])
  const [distToNext, setDistToNext]   = useState<number | null>(null)

  // Keep screen awake while a delivery is active so GPS keeps flowing
  useWakeLock(!!order && !['completed', 'cancelled'].includes(order.status))

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
      if (updated.status === 'cancelled') { navigate('/driver', { replace: true }); return }
      setOrder(updated)
    }
    socket.on('order:update', handler)
    return () => { socket.off('order:update', handler) }
  }, [id])

  // Resolve pickup/delivery coords — prefer server-stored coords, else geocode
  useEffect(() => {
    if (!order) return
    if (order.pickup_lat != null && order.pickup_lng != null) setPickupPos([order.pickup_lat, order.pickup_lng])
    else if (order.pickup_address) geocode(order.pickup_address).then(p => p && setPickupPos(p))
    if (order.delivery_lat != null && order.delivery_lng != null) setDeliveryPos([order.delivery_lat, order.delivery_lng])
    else if (order.delivery_address) geocode(order.delivery_address).then(p => p && setDeliveryPos(p))
  }, [order?.id])

  // GPS broadcast + update driver position
  useEffect(() => {
    if (!order || ['completed', 'cancelled'].includes(order.status)) return
    if (!navigator.geolocation) return
    const socket = getSocket()
    const watchId = navigator.geolocation.watchPosition(
      pos => {
        const coord: LatLng = [pos.coords.latitude, pos.coords.longitude]
        setDriverPos(coord)
        socket.emit('driver:location', { lat: coord[0], lng: coord[1] })
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [order?.status])

  const flow = order ? FLOW[order.status] : undefined
  const destPos = flow ? (flow.destKey === 'pickup' ? pickupPos : deliveryPos) : null

  // Distance to current waypoint
  useEffect(() => {
    if (!driverPos || !destPos) { setDistToNext(null); return }
    setDistToNext(haversineKm(driverPos, destPos))
  }, [driverPos, destPos])

  // Road-following route to current waypoint (green line)
  useEffect(() => {
    let alive = true
    if (!driverPos || !destPos) { setRouteLine([]); return }
    fetchRoute([driverPos, destPos]).then(line => {
      if (!alive) return
      setRouteLine(line.length ? line : [driverPos, destPos])
    })
    return () => { alive = false }
  }, [driverPos, destPos])

  const updateStatus = useCallback(async () => {
    if (!order || !FLOW[order.status] || updating) return
    setUpdating(true)
    try {
      const { data } = await api.patch(`/drivers/orders/${order.id}/status`, { status: FLOW[order.status].next })
      setOrder(data)
      if (data.status === 'completed') setTimeout(() => navigate('/driver'), 2000)
    } catch (e: any) {
      setUpdateError(e?.response?.data?.error || '更新失敗')
      setTimeout(() => setUpdateError(''), 3000)
    } finally {
      setUpdating(false)
    }
  }, [order, updating, navigate])

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
    <div className="min-h-screen flex items-center justify-center bg-black">
      <Loader2 size={28} className="animate-spin text-white/40" />
    </div>
  )
  if (!order) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-black">
      <p className="text-white/50">無進行中訂單</p>
      <button onClick={() => navigate('/driver')} className="bg-yellow-400 text-black font-bold rounded-2xl px-5 py-3">返回接單列表</button>
    </div>
  )

  const mapPositions: LatLng[] = [
    ...(driverPos ? [driverPos] : []),
    ...(pickupPos ? [pickupPos] : []),
    ...(deliveryPos ? [deliveryPos] : []),
  ]
  const defaultCenter: LatLng = driverPos ?? pickupPos ?? [24.1477, 120.6736]
  const isDone = order.status === 'completed'
  const distLbl = distToNext != null ? distLabel(distToNext) : (order.distance ? `${order.distance} km` : '—')
  const etaLbl  = distToNext != null ? `${etaMinutes(distToNext)} 分` : `${order.duration || '—'} 分`
  const distStatLabel = flow?.destKey === 'delivery' ? '距離送達地' : '距離取件地'

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">

      {/* ── Full-screen Map ── */}
      <div className="absolute inset-0">
        <MapContainer
          center={defaultCenter}
          zoom={14}
          zoomControl={false}
          style={{ height: '100%', width: '100%' }}
          attributionControl={false}>
          <TileLayer {...mapTile} />
          <MapFit positions={mapPositions} />
          {routeLine.length > 1 && (
            <Polyline positions={routeLine} pathOptions={{ color: '#22c55e', weight: 6, opacity: 0.9 }} />
          )}
          {driverPos && <Marker position={driverPos} icon={driverIcon}><Popup>您的位置</Popup></Marker>}
          {pickupPos && (
            <Marker position={pickupPos} icon={mkDivIcon('#22c55e', '取件')}>
              <Popup>{order.pickup_address}</Popup>
            </Marker>
          )}
          {deliveryPos && (
            <Marker position={deliveryPos} icon={mkDivIcon('#3b82f6', '送達')}>
              <Popup>{order.delivery_address}</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* ── Top Bar ── */}
      <div className="absolute top-0 left-0 right-0 z-[1000]">
        <div className="flex items-center justify-between p-4 pt-8">
          <button onClick={() => navigate('/driver')}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md">
            <ChevronLeft size={20} className="text-gray-900" />
          </button>
          {distToNext != null && !isDone && (
            <div className="bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md">
              <Navigation size={13} className="inline mr-1.5 -mt-0.5" />
              {distLbl}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom sheet ── */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000] px-3 pb-[68px]">
        <div className="rounded-3xl shadow-2xl overflow-hidden" style={{ background: '#1c1c1e' }}>

          {/* Header */}
          <div className="flex items-start justify-between px-5 pt-5 pb-3">
            <div>
              <div className="text-xl font-black text-white">{flow?.title ?? (isDone ? '配送完成' : order.status)}</div>
              <div className="text-[13px] text-white/40 mt-1">訂單：{order.id}</div>
            </div>
            <div className="text-2xl font-black text-green-400">${order.total_fee}</div>
          </div>

          {/* Stats */}
          <div className="mx-5 mb-4 flex rounded-2xl bg-white/[0.06] divide-x divide-white/10">
            <Stat label={distStatLabel} value={distLbl} />
            <Stat label="預估到達" value={etaLbl} />
            <Stat label="代墊金額" value={advanceLabel(order.advance_amount)} accent={order.advance_amount > 0} />
          </div>

          {/* Route */}
          <div className="mx-5 mb-4 space-y-2.5">
            <RouteStop dotColor="#22c55e" label="取件地點" address={order.pickup_address} phone={order.pickup_phone} />
            <RouteStop dotColor="#3b82f6" label="送達地點" address={order.delivery_address} phone={order.delivery_phone} />
          </div>

          {/* Proof photo (during delivering) */}
          {order.status === 'delivering' && (
            <div className="mx-5 mb-4">
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={e => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
              {photoUrl || order.photo_url ? (
                <img src={photoUrl || order.photo_url} alt="送達照片" className="w-full rounded-2xl max-h-40 object-cover" />
              ) : (
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 border border-dashed border-white/20 rounded-2xl py-3 text-white/50 active:bg-white/5 text-sm">
                  {uploading ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
                  {uploading ? '上傳中' : '拍攝送達照片（選填）'}
                </button>
              )}
            </div>
          )}

          {updateError && (
            <div className="mx-5 mb-3 bg-red-500/15 border border-red-500/30 text-red-300 text-sm rounded-xl px-4 py-2.5">{updateError}</div>
          )}

          {/* Actions */}
          <div className="px-5 pb-5">
            {flow ? (
              <div className="flex gap-3">
                <button onClick={() => openNavigation(flow.destKey === 'pickup' ? order.pickup_address : order.delivery_address, destPos)}
                  className="flex-1 rounded-2xl py-4 font-bold text-[15px] text-white bg-blue-600 active:bg-blue-500 transition-colors flex items-center justify-center gap-2">
                  <Navigation size={16} />{flow.navLabel}
                </button>
                <button onClick={updateStatus} disabled={updating}
                  className="flex-1 rounded-2xl py-4 font-black text-[15px] text-black bg-yellow-400 active:bg-yellow-300 transition-colors disabled:opacity-60">
                  {updating ? '處理中…' : flow.actionLabel}
                </button>
              </div>
            ) : isDone ? (
              <div className="text-center py-3">
                <div className="text-xl font-black text-white">配送完成 🎉</div>
                <p className="text-white/40 text-sm mt-1">即將返回接單頁面</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Bottom status bar ── */}
      <div className="absolute bottom-0 left-0 right-0 z-[1100] bg-black px-5 py-4 flex items-center justify-center">
        <span className="text-white font-bold text-[15px]">配送進行中</span>
        <button onClick={() => navigate('/driver/earnings')}
          className="absolute right-4 flex flex-col items-center gap-0.5 text-white/70">
          <Menu size={20} />
          <span className="text-[10px] font-medium">選單</span>
        </button>
      </div>
    </div>
  )
}
