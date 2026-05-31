import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Phone, MessageSquare, Power, RefreshCw, Menu, X,
} from 'lucide-react'
import api from '../../lib/api'
import { getSocket } from '../../lib/socket'
import { geocode, haversineKm, etaMinutes, advanceLabel } from './driverUtils'
import { mapTile } from '../../lib/mapConfig'
import { useWakeLock } from '../../hooks/useWakeLock'

// ── Leaflet icons ────────────────────────────────────────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl
const driverIcon = L.divIcon({
  className: '',
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#16a34a;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4)"></div>`,
  iconAnchor: [8, 8],
  iconSize: [16, 16],
})

const COUNTDOWN_SEC = 15

// ── Stat cell ─────────────────────────────────────────────────────────────────
function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex-1 px-3 py-2.5">
      <div className="text-[11px] text-white/45 font-medium mb-1">{label}</div>
      <div className={`font-black leading-none ${accent ? 'text-yellow-400 text-lg' : 'text-white text-lg'}`}>{value}</div>
    </div>
  )
}

// ── Route row (pickup / delivery) ─────────────────────────────────────────────
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
          <a href={`tel:${phone}`} onClick={e => e.stopPropagation()}
            className="w-9 h-9 rounded-xl border border-white/15 flex items-center justify-center text-white/70 active:bg-white/10">
            <Phone size={15} />
          </a>
          <a href={`sms:${phone}`} onClick={e => e.stopPropagation()}
            className="w-9 h-9 rounded-xl border border-white/15 flex items-center justify-center text-white/70 active:bg-white/10">
            <MessageSquare size={15} />
          </a>
        </div>
      )}
    </div>
  )
}

// ── Incoming order sheet ("附近新任務") ─────────────────────────────────────────
function IncomingOrderSheet({
  order, driverPos, onAccept, onSkip, accepting,
}: {
  order: any
  driverPos: [number, number] | null
  onAccept: () => void
  onSkip: () => void
  accepting: boolean
}) {
  const [seconds, setSeconds] = useState(COUNTDOWN_SEC)
  const [pickupDist, setPickupDist] = useState<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Auto-skip countdown
  useEffect(() => {
    setSeconds(COUNTDOWN_SEC)
    intervalRef.current = setInterval(() => {
      setSeconds(s => { if (s <= 1) { onSkip(); return 0 } return s - 1 })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [order.id])

  // Distance driver → pickup (prefer server-stored coords, else geocode)
  useEffect(() => {
    let alive = true
    if (!driverPos) { setPickupDist(null); return }
    if (order.pickup_lat != null && order.pickup_lng != null) {
      setPickupDist(haversineKm(driverPos, [order.pickup_lat, order.pickup_lng]))
      return
    }
    if (!order.pickup_address) { setPickupDist(null); return }
    geocode(order.pickup_address).then(p => {
      if (alive && p) setPickupDist(haversineKm(driverPos, p))
    })
    return () => { alive = false }
  }, [order.id, driverPos])

  const distKm = pickupDist ?? (order.distance || null)
  const distLabel = distKm != null ? `${distKm < 1 ? distKm.toFixed(1) : distKm.toFixed(1)} km` : '—'
  const eta = distKm != null ? `${etaMinutes(distKm)} 分` : `${order.duration || '—'} 分`

  return (
    <div className="absolute left-0 right-0 bottom-0 z-[1200] px-3 pb-3 animate-slide-up">
      <div className="rounded-3xl shadow-2xl overflow-hidden" style={{ background: '#1c1c1e' }}>
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3">
          <div>
            <div className="text-xl font-black text-white">附近新任務</div>
            <div className="text-[13px] text-white/40 mt-1">訂單：{order.id}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-green-400">${order.total_fee}</div>
            <div className="text-[11px] text-white/40 mt-1 tabular-nums">{seconds}s 後消失</div>
          </div>
        </div>

        {/* Stats */}
        <div className="mx-5 mb-4 flex rounded-2xl bg-white/[0.06] divide-x divide-white/10">
          <Stat label="距離取件地" value={distLabel} />
          <Stat label="預估到達" value={eta} />
          <Stat label="代墊金額" value={advanceLabel(order.advance_amount)} accent={order.advance_amount > 0} />
        </div>

        {/* Route */}
        <div className="mx-5 mb-5 space-y-2.5">
          <RouteStop dotColor="#22c55e" label="取件地點" address={order.pickup_address} phone={order.pickup_phone} />
          <RouteStop dotColor="#3b82f6" label="送達地點" address={order.delivery_address} phone={order.delivery_phone} />
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onSkip} disabled={accepting}
            className="w-14 flex items-center justify-center rounded-2xl border border-white/15 text-white/60 active:bg-white/10 disabled:opacity-40">
            <X size={20} />
          </button>
          <button onClick={onAccept} disabled={accepting}
            className="flex-1 rounded-2xl py-4 font-black text-[17px] text-black bg-yellow-400 active:bg-yellow-300 transition-colors disabled:opacity-60">
            {accepting ? '接受中…' : '接受任務'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DriverQueue() {
  const navigate = useNavigate()
  const [online, setOnline]           = useState(false)
  const [orders, setOrders]           = useState<any[]>([])
  const [incomingOrder, setIncomingOrder] = useState<any | null>(null)
  const [accepting, setAccepting]     = useState(false)
  const [driverPos, setDriverPos]     = useState<[number, number] | null>(null)
  const [refreshing, setRefreshing]   = useState(false)
  const geoWatchRef = useRef<number | null>(null)
  const incomingQueueRef = useRef<any[]>([])

  // Keep the screen awake while online so GPS keeps flowing
  useWakeLock(online)

  // If a delivery is already in progress (e.g. page reload), resume it
  useEffect(() => {
    api.get('/drivers/me/current')
      .then(r => { if (r.data?.id) navigate(`/driver/order/${r.data.id}`, { replace: true }) })
      .catch(() => {})
  }, [])

  // GPS for map display
  useEffect(() => {
    if (!navigator.geolocation) return
    geoWatchRef.current = navigator.geolocation.watchPosition(
      pos => setDriverPos([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
    )
    return () => {
      if (geoWatchRef.current != null) navigator.geolocation.clearWatch(geoWatchRef.current)
    }
  }, [])

  const showNextIncoming = useCallback(() => {
    const next = incomingQueueRef.current.shift()
    setIncomingOrder(next ?? null)
  }, [])

  const handleSkip = useCallback(() => {
    setIncomingOrder(null)
    setTimeout(showNextIncoming, 300)
  }, [showNextIncoming])

  const handleAccept = useCallback(async () => {
    if (!incomingOrder || accepting) return
    setAccepting(true)
    try {
      await api.patch(`/drivers/orders/${incomingOrder.id}/accept`)
      navigate(`/driver/order/${incomingOrder.id}`)
    } catch {
      alert('接單失敗，可能已被他人接走')
      setOrders(prev => prev.filter(o => o.id !== incomingOrder.id))
      handleSkip()
    } finally {
      setAccepting(false)
    }
  }, [incomingOrder, accepting, navigate, handleSkip])

  // Socket + queue fetch
  useEffect(() => {
    if (!online) return
    api.get('/drivers/me/queue').then(r => setOrders(r.data)).catch(() => {})

    const socket = getSocket()
    const handler = (order: any) => {
      setOrders(prev => [order, ...prev.filter(o => o.id !== order.id)])
      setIncomingOrder((current: any) => {
        if (!current) { return order }
        incomingQueueRef.current.push(order)
        return current
      })
    }
    // Another driver (or the fallback dispatcher) took this order → drop it
    const takenHandler = ({ id }: { id: string }) => {
      incomingQueueRef.current = incomingQueueRef.current.filter(o => o.id !== id)
      setOrders(prev => prev.filter(o => o.id !== id))
      setIncomingOrder((cur: any) => (cur && cur.id === id ? (incomingQueueRef.current.shift() ?? null) : cur))
    }
    // The fallback dispatcher assigned this order to me → go straight to the task
    const assignedHandler = (order: any) => {
      navigate(`/driver/order/${order.id}`)
    }
    socket.on('order:new', handler)
    socket.on('order:taken', takenHandler)
    socket.on('order:assigned', assignedHandler)
    return () => {
      socket.off('order:new', handler)
      socket.off('order:taken', takenHandler)
      socket.off('order:assigned', assignedHandler)
    }
  }, [online, navigate])

  const toggleOnline = async () => {
    const next = !online
    await api.put('/drivers/me/status', { status: next ? 'online' : 'offline' }).catch(() => {})
    setOnline(next)
    if (!next) {
      setOrders([])
      setIncomingOrder(null)
      incomingQueueRef.current = []
    }
  }

  const refresh = async () => {
    if (!online) return
    setRefreshing(true)
    api.get('/drivers/me/queue')
      .then(r => { setOrders(r.data); setRefreshing(false) })
      .catch(() => setRefreshing(false))
  }

  // If an order is pending but no popup currently shown, surface the first one
  useEffect(() => {
    if (online && !incomingOrder && orders.length > 0) {
      setIncomingOrder(orders[0])
    }
  }, [online, orders, incomingOrder])

  const mapCenter: [number, number] = driverPos ?? [24.1477, 120.6736]

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">

      {/* ── Full-screen map ── */}
      <div className="absolute inset-0">
        <MapContainer
          center={mapCenter}
          zoom={14}
          zoomControl={false}
          attributionControl={false}
          style={{ height: '100%', width: '100%' }}>
          <TileLayer {...mapTile} />
          {driverPos && (
            <Marker position={driverPos} icon={driverIcon}>
              <Popup>您的位置</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* ── Top power button ── */}
      <div className="absolute top-0 left-0 right-0 z-[1000] pt-8 px-4 flex justify-end">
        <button
          onClick={toggleOnline}
          className={`flex items-center gap-2 rounded-full px-4 py-2.5 shadow-lg font-bold text-sm transition-colors ${online ? 'bg-green-500 text-white' : 'bg-white text-gray-700'}`}>
          <Power size={16} />
          {online ? '上線中' : '已下線'}
        </button>
      </div>

      {/* ── Empty states (no incoming sheet) ── */}
      {!incomingOrder && (
        <div className="absolute left-0 right-0 z-[1000]" style={{ bottom: 88 }}>
          {!online && (
            <div className="mx-4 bg-white rounded-3xl shadow-xl p-6 text-center">
              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Power size={28} className="text-gray-400" />
              </div>
              <div className="font-bold text-lg text-gray-900">目前已下線</div>
              <div className="text-gray-400 text-sm mt-1">點擊右上角電源按鈕開始接單。</div>
            </div>
          )}
          {online && orders.length === 0 && (
            <div className="mx-4 bg-white rounded-3xl shadow-xl p-6 text-center">
              <div className="font-bold text-lg text-gray-900">目前沒有新任務</div>
              <div className="text-gray-400 text-sm mt-1">請保持上線，有新任務會自動跳出。</div>
              <button onClick={refresh} disabled={refreshing}
                className="mt-4 flex items-center gap-2 mx-auto bg-gray-900 text-white rounded-2xl px-5 py-2.5 text-sm font-semibold">
                <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
                重新整理
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Incoming order sheet ── */}
      {incomingOrder && (
        <IncomingOrderSheet
          order={incomingOrder}
          driverPos={driverPos}
          onAccept={handleAccept}
          onSkip={handleSkip}
          accepting={accepting}
        />
      )}

      {/* ── Bottom status bar ── */}
      <div className="absolute bottom-0 left-0 right-0 z-[1100] bg-black px-5 py-4 flex items-center justify-between">
        <div className="flex-1 text-center text-white font-bold text-[15px]">
          {online ? '你已上線' : '你已下線'}
        </div>
        <button onClick={() => navigate('/driver/earnings')}
          className="absolute right-4 flex flex-col items-center gap-0.5 text-white/70">
          <Menu size={20} />
          <span className="text-[10px] font-medium">選單</span>
        </button>
      </div>
    </div>
  )
}
