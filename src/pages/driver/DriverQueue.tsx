import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  MapPin, Package, Zap, Clock, Truck, Star,
  ChevronRight, TrendingUp, Power, RefreshCw, X, Phone,
} from 'lucide-react'
import api from '../../lib/api'
import { getSocket } from '../../lib/socket'

// ── Leaflet icons ────────────────────────────────────────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl
const driverIcon = L.divIcon({
  className: '',
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#16a34a;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4)"></div>`,
  iconAnchor: [8, 8],
  iconSize: [16, 16],
})

// ── Constants ────────────────────────────────────────────────────────────────
const SPEED_LABELS: Record<string, string> = {
  standard: '標準件', express: '快速件', priority: '優先件', urgent: '急件',
}
const SPEED_ICONS: Record<string, typeof Truck> = {
  standard: Truck, express: Zap, priority: Star, urgent: Clock,
}
const COUNTDOWN_SEC = 15

// ── Countdown ring SVG ───────────────────────────────────────────────────────
function CountdownRing({ seconds, total }: { seconds: number; total: number }) {
  const r = 28
  const circ = 2 * Math.PI * r
  const progress = (seconds / total) * circ
  const color = seconds > 8 ? '#16a34a' : seconds > 4 ? '#d97706' : '#dc2626'
  return (
    <div className="relative flex items-center justify-center" style={{ width: 72, height: 72 }}>
      <svg width="72" height="72" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="36" cy="36" r={r} fill="none" stroke="#e5e7eb" strokeWidth="4" />
        <circle
          cx="36" cy="36" r={r} fill="none"
          stroke={color} strokeWidth="4"
          strokeDasharray={`${progress} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray .9s linear, stroke .3s' }}
        />
      </svg>
      <span
        className="absolute font-black text-xl"
        style={{ color, transition: 'color .3s' }}
      >
        {seconds}
      </span>
    </div>
  )
}

// ── Incoming order modal ─────────────────────────────────────────────────────
function IncomingOrderModal({
  order,
  onAccept,
  onSkip,
  accepting,
}: {
  order: any
  onAccept: () => void
  onSkip: () => void
  accepting: boolean
}) {
  const [seconds, setSeconds] = useState(COUNTDOWN_SEC)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setSeconds(COUNTDOWN_SEC)
    intervalRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) { onSkip(); return 0 }
        return s - 1
      })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [order.id])

  const Icon = SPEED_ICONS[order.speed_tier] ?? Truck

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(2px)' }}>
      <div className="w-full max-w-md bg-white rounded-t-3xl px-5 pt-5 pb-8 shadow-2xl animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">新任務</div>
            <div className="font-black text-xl text-gray-900 mt-0.5">NT${order.total_fee}</div>
          </div>
          <CountdownRing seconds={seconds} total={COUNTDOWN_SEC} />
        </div>

        {/* Speed badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className="flex items-center gap-1.5 bg-gray-100 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-700">
            <Icon size={12} />{SPEED_LABELS[order.speed_tier] ?? order.speed_tier}
          </span>
          {order.distance && (
            <span className="text-xs text-gray-400">{order.distance} km · {order.duration} 分鐘</span>
          )}
        </div>

        {/* Route */}
        <div className="bg-gray-50 rounded-2xl p-4 mb-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex-shrink-0 flex flex-col items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-600 ring-2 ring-green-200" />
              <div className="w-0.5 h-6 bg-gray-300" />
              <div className="w-3 h-3 rounded-sm bg-red-600 ring-2 ring-red-200" />
            </div>
            <div className="flex-1 space-y-3 min-w-0">
              <div>
                <div className="text-xs text-gray-400 font-medium">取件地點</div>
                <div className="text-sm font-semibold text-gray-900 leading-snug truncate">{order.pickup_address}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 font-medium">送達地點</div>
                <div className="text-sm font-semibold text-gray-900 leading-snug truncate">{order.delivery_address}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact info */}
        {order.pickup_phone && (
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-5">
            <Phone size={12} />
            <span>取件聯絡：{order.pickup_phone}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onSkip}
            disabled={accepting}
            className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl px-5 py-4 transition-colors disabled:opacity-50"
          >
            <X size={16} />
            略過
          </button>
          <button
            onClick={onAccept}
            disabled={accepting}
            className="flex-1 flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-700 text-white font-bold rounded-2xl py-4 transition-colors disabled:opacity-50"
          >
            {accepting ? '接單中…' : '接單'}
            {!accepting && <ChevronRight size={16} />}
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
  const incomingQueueRef = useRef<any[]>([])  // orders waiting to be shown

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

  // Show next queued incoming order
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
      // Queue or immediately show incoming
      setIncomingOrder((current: any) => {
        if (!current) { return order }
        incomingQueueRef.current.push(order)
        return current
      })
    }
    socket.on('order:new', handler)
    return () => { socket.off('order:new', handler) }
  }, [online])

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

  // Accept directly from list (fallback if popup was missed)
  const acceptFromList = async (orderId: string) => {
    try {
      await api.patch(`/drivers/orders/${orderId}/accept`)
      navigate(`/driver/order/${orderId}`)
    } catch {
      alert('接單失敗，可能已被他人接走')
      setOrders(prev => prev.filter(o => o.id !== orderId))
    }
  }

  const mapCenter: [number, number] = driverPos ?? [24.1477, 120.6736]

  return (
    <div className="relative w-full h-screen overflow-hidden">

      {/* ── Full-screen map ── */}
      <div className="absolute inset-0">
        <MapContainer
          center={mapCenter}
          zoom={14}
          zoomControl={false}
          attributionControl={false}
          style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {driverPos && (
            <Marker position={driverPos} icon={driverIcon}>
              <Popup>您的位置</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* ── Top bar ── */}
      <div className="absolute top-0 left-0 right-0 z-[1000] pt-8 px-4">
        <div className="flex items-center justify-between">
          <div className="bg-white rounded-2xl px-4 py-2.5 shadow-md flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${online ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
            <span className="font-bold text-sm text-gray-900">{online ? '上線中' : '已下線'}</span>
          </div>
          <div className="flex gap-2">
            <Link to="/driver/earnings"
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md">
              <TrendingUp size={18} className="text-gray-700" />
            </Link>
            <button
              onClick={toggleOnline}
              className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-colors ${online ? 'bg-gray-900 text-white' : 'bg-white text-gray-700'}`}>
              <Power size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Bottom sheet ── */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000]">

        {/* Offline */}
        {!online && (
          <div className="mx-4 mb-6 bg-white rounded-3xl shadow-xl p-6 text-center">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Power size={28} className="text-gray-400" />
            </div>
            <div className="font-bold text-lg text-gray-900">目前已下線</div>
            <div className="text-gray-400 text-sm mt-1">點擊右上角電源按鈕開始接單。</div>
          </div>
        )}

        {/* Online, no orders */}
        {online && orders.length === 0 && (
          <div className="mx-4 mb-6 bg-white rounded-3xl shadow-xl p-6 text-center">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Truck size={28} className="text-gray-400" />
            </div>
            <div className="font-bold text-lg text-gray-900">目前沒有新任務</div>
            <div className="text-gray-400 text-sm mt-1">請保持上線，系統有新任務時會顯示在這裡。</div>
            <button onClick={refresh} disabled={refreshing}
              className="mt-4 flex items-center gap-2 mx-auto bg-gray-900 text-white rounded-2xl px-5 py-2.5 text-sm font-semibold">
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              重新整理任務
            </button>
          </div>
        )}

        {/* Online with orders list */}
        {online && orders.length > 0 && (
          <div className="bg-white rounded-t-3xl shadow-[0_-4px_24px_rgba(0,0,0,.12)] max-h-[65vh] overflow-y-auto">
            <div className="sticky top-0 bg-white rounded-t-3xl z-10">
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3" />
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Package size={16} className="text-gray-500" />
                  <span className="font-bold text-gray-900">{orders.length} 筆可接訂單</span>
                </div>
                <button onClick={refresh} disabled={refreshing} className="p-2 rounded-xl text-gray-400 hover:text-gray-700">
                  <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            <div className="px-4 py-3 space-y-3 pb-8">
              {orders.map(order => {
                const Icon = SPEED_ICONS[order.speed_tier] ?? Truck
                return (
                  <div key={order.id} className="border border-gray-100 rounded-2xl p-4 bg-white shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-400">{order.id}</span>
                        <span className="bg-gray-100 rounded-lg px-2 py-0.5 text-xs font-semibold text-gray-700 flex items-center gap-1">
                          <Icon size={11} />{SPEED_LABELS[order.speed_tier] ?? order.speed_tier}
                        </span>
                      </div>
                      <span className="font-black text-xl text-gray-900">NT${order.total_fee}</span>
                    </div>

                    <div className="flex items-start gap-3 mb-4">
                      <div className="mt-0.5 flex-shrink-0 flex flex-col items-center gap-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-600 ring-2 ring-green-200" />
                        <div className="w-0.5 h-5 bg-gray-200" />
                        <div className="w-2.5 h-2.5 rounded-sm bg-red-600 ring-2 ring-red-200" />
                      </div>
                      <div className="flex-1 space-y-2.5 min-w-0">
                        <div>
                          <div className="text-xs text-gray-400">取件地址</div>
                          <div className="text-sm font-medium text-gray-900 truncate">{order.pickup_address}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400">送達地址</div>
                          <div className="text-sm font-medium text-gray-900 truncate">{order.delivery_address}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex gap-2 text-xs text-gray-400">
                        {order.distance && <span>{order.distance} km</span>}
                        {order.duration && <span>· {order.duration} 分鐘</span>}
                      </div>
                      <button
                        onClick={() => acceptFromList(order.id)}
                        className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-700 text-white rounded-xl px-4 py-2 text-sm font-bold transition-colors">
                        接單 <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Incoming order modal (on top of everything) ── */}
      {incomingOrder && (
        <IncomingOrderModal
          order={incomingOrder}
          onAccept={handleAccept}
          onSkip={handleSkip}
          accepting={accepting}
        />
      )}
    </div>
  )
}
