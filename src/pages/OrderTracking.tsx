import { useState, useEffect, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  MapPin, Phone, Clock, CheckCircle, Circle, Package,
  Navigation, Star, MessageCircle, AlertCircle, Loader2, X,
} from 'lucide-react'
import api from '../lib/api'
import { getSocket } from '../lib/socket'
import type { OrderStatus } from '../types'

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

interface Order {
  id: string; status: OrderStatus; service_type: string
  pickup_address: string; delivery_address: string
  distance: number; duration: number; total_fee: number
  driver_name?: string; driver_phone?: string; driver_rating?: number
  created_at: string; rated: number; item_content: string
}

export default function OrderTracking() {
  const [params]                      = useSearchParams()
  const isNew                         = params.get('new') === '1'
  const focusId                       = params.get('id')
  const [orders, setOrders]           = useState<Order[]>([])
  const [selectedId, setSelectedId]   = useState<string | null>(focusId || null)
  const [loading, setLoading]         = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [msgToast, setMsgToast]       = useState(false)
  const socketRef                     = useRef(getSocket())

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/orders')
      setOrders(data)
      if (!selectedId && data.length > 0) setSelectedId(data[0].id)
    } catch { /* unauthenticated — empty state */ } finally { setLoading(false) }
  }

  useEffect(() => {
    fetchOrders()
    const sock = socketRef.current
    sock.on('order:update', (updated: Order) => {
      setOrders(prev => {
        const exists = prev.find(o => o.id === updated.id)
        return exists ? prev.map(o => o.id === updated.id ? updated : o) : [updated, ...prev]
      })
    })
    return () => { sock.off('order:update') }
  }, [])

  const cancelOrder = async (id: string) => {
    setCancellingId(id)
    try {
      await api.put(`/orders/${id}/cancel`)
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'cancelled' } : o))
    } catch (e: any) { alert(e?.response?.data?.error || '取消失敗') }
    finally { setCancellingId(null) }
  }

  const order = orders.find(o => o.id === selectedId)
  const currentStep = order ? STATUS_INDEX[order.status] : -1
  const activeOrders = orders.filter(o => !['completed', 'cancelled'].includes(o.status))
  const recentDone = orders.filter(o => ['completed', 'cancelled'].includes(o.status)).slice(0, 3)
  const displayOrders = [...activeOrders, ...recentDone]

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
          {/* Order list */}
          <div className="md:col-span-1 mb-4 md:mb-0">
            <div className="space-y-2">
              {displayOrders.map(o => (
                <button key={o.id} onClick={() => setSelectedId(o.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all
                    ${selectedId === o.id ? 'border-paper-900 bg-indigo-50' : 'border-paper-200 bg-white hover:border-paper-400'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">{o.id}</span>
                    <span className={STATUS_COLOR[o.status]}>{STATUS_LABEL[o.status]}</span>
                  </div>
                  <div className="text-paper-500 text-xs truncate">{o.delivery_address}</div>
                  <div className="text-paper-400 text-xs mt-1">
                    {new Date(o.created_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                    {' · '}NT${o.total_fee}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Detail */}
          {order && (
            <div className="md:col-span-2 space-y-4">
              {isNew && selectedId === focusId && (
                <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                  <CheckCircle size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-sm">訂單已建立！</div>
                    <div className="text-paper-500 text-xs mt-0.5">正在為您媒合附近的任務夥伴，請稍候。</div>
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold">訂單 {order.id}</h2>
                  <div className="flex items-center gap-2">
                    <span className={STATUS_COLOR[order.status]}>{STATUS_LABEL[order.status]}</span>
                    {['pending','matching'].includes(order.status) && (
                      <button onClick={() => cancelOrder(order.id)} disabled={cancellingId === order.id}
                        className="p-1.5 rounded-lg text-paper-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        {cancellingId === order.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                      </button>
                    )}
                  </div>
                </div>
                {order.status === 'cancelled' ? (
                  <div className="flex items-center gap-2 text-red-400 text-sm"><AlertCircle size={16} /> 訂單已取消</div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-paper-100" />
                    {STATUS_STEPS.map((s, i) => {
                      const done = i <= currentStep
                      const current = i === currentStep
                      return (
                        <div key={s.status} className="relative flex items-center gap-4 pb-5 last:pb-0">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center z-10 flex-shrink-0
                            ${done ? 'bg-paper-900' : 'bg-paper-100 border-2 border-paper-300'}`}>
                            {done ? <CheckCircle size={14} className="text-white" /> : <Circle size={14} className="text-paper-500" />}
                          </div>
                          <span className={`text-sm font-medium ${current ? 'text-paper-900' : done ? 'text-paper-600' : 'text-paper-400'}`}>
                            {s.label}
                            {current && order.status !== 'completed' && <span className="ml-2 text-xs animate-pulse-soft">進行中</span>}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Driver */}
              {order.driver_name ? (
                <div className="card">
                  <div className="text-paper-500 text-xs font-semibold mb-3 uppercase tracking-wider">任務夥伴</div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-paper-100 rounded-2xl flex items-center justify-center">
                        <Navigation size={22} className="text-paper-900" />
                      </div>
                      <div>
                        <div className="font-bold">{order.driver_name}</div>
                        <div className="flex items-center gap-1 text-yellow-400 text-sm mt-0.5">
                          <Star size={12} className="fill-yellow-400" />
                          <span>{order.driver_rating?.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {order.driver_phone && (
                        <a href={`tel:${order.driver_phone}`} className="p-3 bg-paper-100 hover:bg-paper-200 rounded-2xl transition-colors">
                          <Phone size={18} />
                        </a>
                      )}
                      <div className="relative">
                        <button
                          onClick={() => {
                            if (order.driver_phone) {
                              window.location.href = `sms:${order.driver_phone}`
                            } else {
                              setMsgToast(true)
                              setTimeout(() => setMsgToast(false), 2500)
                            }
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

              {/* Route */}
              <div className="card space-y-3">
                <div className="text-paper-500 text-xs font-semibold uppercase tracking-wider">路線資訊</div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Navigation size={12} className="text-paper-900" />
                  </div>
                  <div>
                    <div className="text-xs text-paper-500">取件地址</div>
                    <div className="text-sm font-medium mt-0.5">{order.pickup_address}</div>
                  </div>
                </div>
                <div className="ml-3 border-l-2 border-dashed border-paper-200 h-4" />
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin size={12} className="text-amber-600" />
                  </div>
                  <div>
                    <div className="text-xs text-paper-500">送達地址</div>
                    <div className="text-sm font-medium mt-0.5">{order.delivery_address}</div>
                  </div>
                </div>
                <div className="flex gap-4 pt-2">
                  <div className="flex items-center gap-1.5 text-sm text-paper-500"><Package size={14} /><span>{order.distance} 公里</span></div>
                  <div className="flex items-center gap-1.5 text-sm text-paper-500"><Clock size={14} /><span>{order.duration} 分鐘</span></div>
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
