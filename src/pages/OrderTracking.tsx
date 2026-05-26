import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  MapPin, Phone, Clock, CheckCircle, Circle, Package,
  Navigation, Star, MessageCircle, AlertCircle, Loader2, X,
} from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../lib/api'
import { getSocket } from '../lib/socket'
import type { OrderStatus } from '../types'

// ── Leaflet setup ─────────────────────────────────────────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const mkDivIcon = (color: string, label: string) =>
  L.divIcon({
    className: '',
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px">
      <div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>
      <div style="background:${color};color:#fff;font-size:9px;font-weight:700;padding:1px 4px;border-radius:3px;white-space:nowrap">${label}</div>
    </div>`,
    iconAnchor: [6, 6],
    iconSize: [12, 12],
  })

const driverMapIcon = L.divIcon({
  className: '',
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#1a1a1a;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.5)"></div>`,
  iconAnchor: [8, 8],
  iconSize: [16, 16],
})

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'pending',    label: '等待媒合' },
  { status: 'matching',   label: '媒合中' },
  { status: 'accepted',   label: '已接單' },
  { status: 'pickup',     label: '取件中' },
  { status: 'delivering', label: '配送中' },
  { status: 'completed',  label: '已送達' },
]
const STATUS_INDEX: Record<OrderStatus, number> = {
  pending: 0, matching: 1, accepted: 2, pickup: 3, delivering: 4, completed: 5, cancelled: -1,
}
const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: '等待媒合', matching: '媒合中', accepted: '已接單',
  pickup: '取件中', delivering: '配送中', completed: '已送達', cancelled: '已取消',
}
const STATUS_COLOR: Record<OrderStatus, string> = {
  pending: 'badge-gray', matching: 'badge-blue', accepted: 'badge-yellow',
  pickup: 'badge-yellow', delivering: 'badge-blue', completed: 'badge-green', cancelled: 'badge-red',
}
const STATUS_DESC: Record<OrderStatus, string> = {
  pending: '訂單已建立，等待媒合夥伴',
  matching: '正在媒合附近的夥伴，請稍候',
  accepted: '夥伴正在前往取件地點',
  pickup: '夥伴已抵達取件地點，正在取件',
  delivering: '夥伴正在配送中，即將到達',
  completed: '配送完成，感謝您的使用',
  cancelled: '訂單已取消',
}

// ── Types ────────────────────────────────────────────────────────────────────
interface Order {
  id: string; status: OrderStatus; service_type: string
  pickup_address: string; delivery_address: string
  distance: number; duration: number; total_fee: number
  driver_name?: string; driver_phone?: string; driver_rating?: number
  driver_id?: string
  created_at: string; rated: number; item_content: string
  photo_url?: string
}
interface DriverPos { driverId: string; lat: number; lng: number }

// ── Geocode (Nominatim, cached) ───────────────────────────────────────────────
const geocodeCache: Record<string, [number, number]> = {}
async function geocode(address: string): Promise<[number, number] | null> {
  if (geocodeCache[address]) return geocodeCache[address]
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=tw`,
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

// ── OSRM route ────────────────────────────────────────────────────────────────
async function fetchRoute(
  from: [number, number],
  to: [number, number],
): Promise<{ coords: [number, number][]; durationSec: number } | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`
    const res = await fetch(url)
    const json = await res.json()
    if (json.code !== 'Ok') return null
    const route = json.routes[0]
    const coords: [number, number][] = route.geometry.coordinates.map(([lng, lat]: number[]) => [lat, lng])
    return { coords, durationSec: Math.round(route.duration) }
  } catch {
    return null
  }
}

// ── Map auto-fit ──────────────────────────────────────────────────────────────
function MapFit({ positions }: { positions: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (positions.length === 0) return
    if (positions.length === 1) { map.setView(positions[0], 15); return }
    map.fitBounds(L.latLngBounds(positions), { padding: [48, 48] })
  }, [JSON.stringify(positions)])
  return null
}

// ── ETA string ────────────────────────────────────────────────────────────────
function etaString(sec: number): string {
  if (sec < 60) return '不到 1 分鐘'
  const m = Math.round(sec / 60)
  return `約 ${m} 分鐘`
}

// ── Live tracking map section ─────────────────────────────────────────────────
function LiveTrackingMap({
  order,
  driverPos,
}: {
  order: Order
  driverPos: DriverPos | null
}) {
  const [pickupPos, setPickupPos]     = useState<[number, number] | null>(null)
  const [deliveryPos, setDeliveryPos] = useState<[number, number] | null>(null)
  const [route1, setRoute1]           = useState<[number, number][]>([])  // driver → pickup
  const [route2, setRoute2]           = useState<[number, number][]>([])  // pickup → delivery
  const [eta, setEta]                 = useState<number | null>(null)      // seconds

  // Geocode addresses
  useEffect(() => {
    geocode(order.pickup_address).then(p => p && setPickupPos(p))
    geocode(order.delivery_address).then(p => p && setDeliveryPos(p))
  }, [order.pickup_address, order.delivery_address])

  // Fetch pickup→delivery route once
  useEffect(() => {
    if (!pickupPos || !deliveryPos) return
    fetchRoute(pickupPos, deliveryPos).then(r => { if (r) setRoute2(r.coords) })
  }, [pickupPos, deliveryPos])

  // Fetch driver→next route + ETA whenever driver moves
  const lastRouteReqRef = useRef(0)
  useEffect(() => {
    if (!driverPos) return
    const dPos: [number, number] = [driverPos.lat, driverPos.lng]
    const dest = ['accepted', 'pickup'].includes(order.status) ? pickupPos : deliveryPos
    if (!dest) return

    const now = Date.now()
    if (now - lastRouteReqRef.current < 15000) return  // throttle: at most once per 15s
    lastRouteReqRef.current = now

    fetchRoute(dPos, dest).then(r => {
      if (r) {
        setRoute1(r.coords)
        setEta(r.durationSec)
      }
    })
  }, [driverPos?.lat, driverPos?.lng, order.status, pickupPos, deliveryPos])

  // Countdown ETA each second — empty deps so only one interval is ever created
  useEffect(() => {
    const t = setInterval(() => setEta(s => (s !== null && s > 0 ? s - 1 : s)), 1000)
    return () => clearInterval(t)
  }, [])

  const dPos: [number, number] | null = driverPos ? [driverPos.lat, driverPos.lng] : null

  const mapPositions: [number, number][] = [
    ...(dPos ? [dPos] : []),
    ...(pickupPos ? [pickupPos] : []),
    ...(deliveryPos ? [deliveryPos] : []),
  ]
  const defaultCenter: [number, number] = dPos ?? pickupPos ?? [25.0330, 121.5654]

  return (
    <div className="card p-0 overflow-hidden">
      {/* ETA banner */}
      {eta !== null && (
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <div className="text-xs font-semibold text-paper-500 uppercase tracking-wider">即時追蹤</div>
          <div className="flex items-center gap-1.5 bg-gray-900 text-white text-xs font-bold px-3 py-1 rounded-full">
            <Clock size={11} />
            {['accepted', 'pickup'].includes(order.status) ? '抵達取件地點' : '送達'}
            &nbsp;{etaString(eta)}
          </div>
        </div>
      )}
      {eta === null && (
        <div className="px-4 pt-4 pb-2 text-xs font-semibold text-paper-500 uppercase tracking-wider">即時追蹤</div>
      )}

      <div style={{ height: 280 }}>
        <MapContainer
          center={defaultCenter}
          zoom={13}
          zoomControl={false}
          attributionControl={false}
          style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapFit positions={mapPositions} />

          {/* Routes */}
          {route1.length > 1 && (
            <Polyline positions={route1} color="#1a1a1a" weight={4} opacity={0.85} dashArray="8 4" />
          )}
          {route2.length > 1 && (
            <Polyline positions={route2} color="#6b7280" weight={3} opacity={0.5} />
          )}

          {/* Markers */}
          {dPos && (
            <Marker position={dPos} icon={driverMapIcon}>
              <Popup>{order.driver_name || '任務夥伴'}</Popup>
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

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-3 border-t border-paper-100 text-xs text-paper-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-gray-900" />夥伴位置
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-green-600" />取件地點
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-red-600" />送達地點
        </span>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function OrderTracking() {
  const [params]                        = useSearchParams()
  const isNew                           = params.get('new') === '1'
  const focusId                         = params.get('id')
  const [orders, setOrders]             = useState<Order[]>([])
  const [selectedId, setSelectedId]     = useState<string | null>(focusId || null)
  const [loading, setLoading]           = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [cancelError, setCancelError]   = useState('')
  const [msgToast, setMsgToast]         = useState(false)
  const [driverPos, setDriverPos]       = useState<DriverPos | null>(null)
  const socketRef                       = useRef(getSocket())

  const fetchOrders = useCallback(async () => {
    try {
      const { data } = await api.get('/orders')
      setOrders(data)
      if (!selectedId && data.length > 0) setSelectedId(data[0].id)
    } catch { /* unauthenticated */ } finally { setLoading(false) }
  }, [selectedId])

  useEffect(() => {
    fetchOrders()
    const sock = socketRef.current
    sock.on('order:update', (updated: Order) => {
      setOrders(prev => {
        const exists = prev.find(o => o.id === updated.id)
        return exists ? prev.map(o => o.id === updated.id ? updated : o) : [updated, ...prev]
      })
    })
    sock.on('driver:locationUpdate', (pos: DriverPos) => setDriverPos(pos))
    return () => { sock.off('order:update'); sock.off('driver:locationUpdate') }
  }, [])

  const cancelOrder = async (id: string) => {
    setCancellingId(id)
    try {
      await api.put(`/orders/${id}/cancel`)
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'cancelled' } : o))
    } catch (e: any) {
      setCancelError(e?.response?.data?.error || '取消失敗')
      setTimeout(() => setCancelError(''), 3000)
    } finally { setCancellingId(null) }
  }

  const order       = orders.find(o => o.id === selectedId)
  const currentStep = order ? STATUS_INDEX[order.status] : -1
  const activeOrders = orders.filter(o => !['completed', 'cancelled'].includes(o.status))
  const recentDone   = orders.filter(o => ['completed', 'cancelled'].includes(o.status)).slice(0, 3)
  const displayOrders = [...activeOrders, ...recentDone]

  const showLiveMap = Boolean(
    order?.driver_id &&
    ['accepted', 'pickup', 'delivering'].includes(order?.status ?? '') &&
    driverPos && driverPos.driverId === order?.driver_id
  )

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loader2 size={28} className="animate-spin text-paper-400" />
    </div>
  )

  return (
    <div className="animate-fade-in max-w-5xl mx-auto px-4 py-6 md:py-10">
      <h1 className="text-2xl font-bold mb-6">訂單追蹤</h1>

      {orders.length === 0 ? (
        <div className="text-center py-20">
          <Package size={40} className="text-paper-300 mx-auto mb-3" />
          <div className="text-paper-500">目前沒有訂單</div>
          <Link to="/order" className="btn-primary mt-4 inline-flex">立即下單</Link>
        </div>
      ) : (
        <div className="md:grid md:grid-cols-3 md:gap-6">

          {/* ── Order list ── */}
          <div className="md:col-span-1 mb-4 md:mb-0">
            <div className="space-y-2">
              {displayOrders.map(o => (
                <button key={o.id} onClick={() => setSelectedId(o.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all
                    ${selectedId === o.id ? 'border-paper-900 bg-indigo-50' : 'border-paper-200 bg-white hover:border-paper-400'}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-sm">{o.id}</span>
                    <span className={STATUS_COLOR[o.status]}>{STATUS_LABEL[o.status]}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-paper-500 mb-1">
                    <div className="w-2 h-2 rounded-full bg-green-600 flex-shrink-0" />
                    <span className="truncate">{o.pickup_address}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-paper-500">
                    <div className="w-2 h-2 rounded-sm bg-red-600 flex-shrink-0" />
                    <span className="truncate">{o.delivery_address}</span>
                  </div>
                  <div className="text-paper-400 text-xs mt-2">
                    {new Date(o.created_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                    {' · '}NT${o.total_fee}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Detail ── */}
          {order && (
            <div className="md:col-span-2 space-y-4">

              {/* New order banner */}
              {isNew && selectedId === focusId && (
                <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                  <CheckCircle size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-sm">訂單已建立！</div>
                    <div className="text-paper-500 text-xs mt-0.5">正在為您媒合附近的任務夥伴，請稍候。</div>
                  </div>
                </div>
              )}

              {/* Live tracking map */}
              {showLiveMap && (
                <LiveTrackingMap order={order} driverPos={driverPos} />
              )}

              {/* Status card */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-xs text-paper-400 mb-0.5">訂單 {order.id}</div>
                    <h2 className="font-bold text-base">{STATUS_LABEL[order.status]}</h2>
                    <p className="text-paper-500 text-xs mt-0.5">{STATUS_DESC[order.status]}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={STATUS_COLOR[order.status]}>{STATUS_LABEL[order.status]}</span>
                    {['pending', 'matching'].includes(order.status) && (
                      <button onClick={() => cancelOrder(order.id)} disabled={cancellingId === order.id}
                        className="p-1.5 rounded-lg text-paper-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        {cancellingId === order.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                      </button>
                    )}
                  </div>
                </div>

                {cancelError && order.id === selectedId && (
                  <div className="text-red-500 text-xs bg-red-50 rounded-lg px-3 py-1.5">{cancelError}</div>
                )}

                {order.status === 'cancelled' ? (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle size={16} /> 訂單已取消
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-paper-100" />
                    {STATUS_STEPS.map((s, i) => {
                      const done    = i <= currentStep
                      const current = i === currentStep
                      return (
                        <div key={s.status} className="relative flex items-center gap-4 pb-4 last:pb-0">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center z-10 flex-shrink-0
                            ${done ? 'bg-paper-900' : 'bg-paper-100 border-2 border-paper-300'}`}>
                            {done ? <CheckCircle size={14} className="text-white" /> : <Circle size={14} className="text-paper-500" />}
                          </div>
                          <span className={`text-sm font-medium ${current ? 'text-paper-900' : done ? 'text-paper-600' : 'text-paper-400'}`}>
                            {s.label}
                            {current && order.status !== 'completed' && (
                              <span className="ml-2 text-xs text-paper-400 animate-pulse-soft">進行中</span>
                            )}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Driver card */}
              {order.driver_name ? (
                <div className="card">
                  <div className="text-paper-500 text-xs font-semibold mb-3 uppercase tracking-wider">任務夥伴</div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center">
                        <span className="text-white font-black text-lg">{order.driver_name[0]}</span>
                      </div>
                      <div>
                        <div className="font-bold">{order.driver_name}</div>
                        <div className="flex items-center gap-1 text-yellow-400 text-sm mt-0.5">
                          <Star size={12} className="fill-yellow-400" />
                          <span>{typeof order.driver_rating === 'number' ? order.driver_rating.toFixed(1) : '–'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {order.driver_phone && (
                        <a href={`tel:${order.driver_phone}`}
                          className="p-3 bg-paper-100 hover:bg-paper-200 rounded-2xl transition-colors">
                          <Phone size={18} />
                        </a>
                      )}
                      <div className="relative">
                        <button
                          onClick={() => {
                            if (order.driver_phone) { window.location.href = `sms:${order.driver_phone}` }
                            else { setMsgToast(true); setTimeout(() => setMsgToast(false), 2500) }
                          }}
                          className="p-3 bg-paper-100 hover:bg-paper-200 rounded-2xl transition-colors">
                          <MessageCircle size={18} />
                        </button>
                        {msgToast && (
                          <div className="absolute right-0 top-full mt-2 bg-paper-900 text-white text-xs px-3 py-2 rounded-xl whitespace-nowrap z-10">
                            聯絡功能即將推出
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : order.status !== 'cancelled' && order.status !== 'completed' && (
                <div className="card flex items-center gap-3">
                  <AlertCircle size={20} className="text-yellow-400 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-sm">尋找任務夥伴中</div>
                    <div className="text-paper-500 text-xs mt-0.5">預計 1–3 分鐘內完成媒合</div>
                  </div>
                  <Loader2 size={16} className="animate-spin text-paper-400 ml-auto" />
                </div>
              )}

              {/* Proof photo */}
              {order.photo_url && (
                <div className="card">
                  <div className="text-paper-500 text-xs font-semibold mb-3 uppercase tracking-wider">送達照片</div>
                  <img src={order.photo_url} alt="送達照片" className="rounded-xl w-full object-cover max-h-56" />
                </div>
              )}

              {/* Route info */}
              <div className="card space-y-3">
                <div className="text-paper-500 text-xs font-semibold uppercase tracking-wider">路線資訊</div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex-shrink-0 flex flex-col items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-green-600 ring-2 ring-green-100" />
                    <div className="w-0.5 h-6 bg-gray-200" />
                    <div className="w-3 h-3 rounded-sm bg-red-600 ring-2 ring-red-100" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="text-xs text-paper-500">取件地址</div>
                      <div className="text-sm font-medium mt-0.5">{order.pickup_address}</div>
                    </div>
                    <div>
                      <div className="text-xs text-paper-500">送達地址</div>
                      <div className="text-sm font-medium mt-0.5">{order.delivery_address}</div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 pt-2 border-t border-paper-100">
                  <div className="flex items-center gap-1.5 text-sm text-paper-500">
                    <MapPin size={14} /><span>{order.distance} 公里</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-paper-500">
                    <Clock size={14} /><span>{order.duration} 分鐘</span>
                  </div>
                  <div className="ml-auto font-bold">NT${order.total_fee}</div>
                </div>
              </div>

              {/* Rate prompt */}
              {order.status === 'completed' && !order.rated && (
                <Link to={`/history?rate=${order.id}`}
                  className="card flex items-center gap-3 hover:border-paper-400 transition-colors cursor-pointer">
                  <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center">
                    <Star size={18} className="text-yellow-500" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">為此次任務評分</div>
                    <div className="text-paper-500 text-xs mt-0.5">您的評價幫助我們提升服務品質</div>
                  </div>
                  <span className="text-paper-400 text-sm">前往 →</span>
                </Link>
              )}

            </div>
          )}
        </div>
      )}
    </div>
  )
}
