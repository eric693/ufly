import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { MapPin, Package, Zap, Clock, Truck, Star, Wifi, WifiOff, ChevronRight, TrendingUp } from 'lucide-react'
import api from '../../lib/api'
import { getSocket } from '../../lib/socket'

const SPEED_LABELS: Record<string, string> = { standard: '標準件', express: '快速件', priority: '優先件', urgent: '急件' }
const SPEED_ICONS: Record<string, typeof Truck> = { standard: Truck, express: Zap, priority: Star, urgent: Clock }

export default function DriverQueue() {
  const navigate = useNavigate()
  const [online, setOnline]   = useState(false)
  const [orders, setOrders]   = useState<any[]>([])
  const [accepting, setAccepting] = useState<string | null>(null)

  useEffect(() => {
    if (!online) return
    api.get('/drivers/me/queue').then(r => setOrders(r.data)).catch(() => {})

    const socket = getSocket()
    const handler = (order: any) => setOrders(prev => [order, ...prev.filter(o => o.id !== order.id)])
    socket.on('order:new', handler)
    return () => { socket.off('order:new', handler) }
  }, [online])

  const toggleOnline = async () => {
    const next = !online
    await api.put('/drivers/me/status', { status: next ? 'online' : 'offline' }).catch(() => {})
    setOnline(next)
    if (!next) setOrders([])
  }

  const accept = async (orderId: string) => {
    setAccepting(orderId)
    try {
      await api.patch(`/drivers/orders/${orderId}/accept`)
      navigate(`/driver/order/${orderId}`)
    } catch {
      alert('接單失敗，可能已被他人接走')
      setOrders(prev => prev.filter(o => o.id !== orderId))
    } finally {
      setAccepting(null)
    }
  }

  return (
    <div className="min-h-screen bg-paper-50">
      {/* Header */}
      <div className="bg-black px-4 pt-8 pb-6">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-black text-white">Ufly 司機端</h1>
              <p className="text-white/50 text-sm">接單系統</p>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/driver/earnings" className="flex items-center gap-1 px-3 py-2 rounded-2xl bg-white/10 text-white/70 text-sm font-semibold hover:bg-white/20 transition-colors">
                <TrendingUp size={14} /> 收益
              </Link>
              <button
                onClick={toggleOnline}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-sm transition-all ${
                  online ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/60'
                }`}
              >
                {online ? <Wifi size={16} /> : <WifiOff size={16} />}
                {online ? '上線中' : '已下線'}
              </button>
            </div>
          </div>
          <div className="bg-white/10 rounded-2xl px-4 py-3 flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-400 animate-pulse' : 'bg-white/30'}`} />
            <span className="text-white/70 text-sm">
              {online ? `目前有 ${orders.length} 筆訂單可接` : '上線後開始接收訂單'}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6">
        {!online && (
          <div className="text-center py-16">
            <WifiOff size={40} className="text-paper-300 mx-auto mb-3" />
            <p className="text-paper-500 font-medium">點擊右上角「上線」開始接單</p>
          </div>
        )}

        {online && orders.length === 0 && (
          <div className="text-center py-16">
            <Package size={40} className="text-paper-300 mx-auto mb-3 animate-pulse" />
            <p className="text-paper-500 font-medium">等待新訂單中…</p>
          </div>
        )}

        <div className="space-y-3">
          {orders.map(order => {
            const Icon = SPEED_ICONS[order.speed_tier] ?? Truck
            return (
              <div key={order.id} className="bg-white rounded-2xl border border-paper-200 shadow-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-paper-500">{order.id}</span>
                    <span className="flex items-center gap-1 bg-paper-100 rounded-lg px-2 py-0.5 text-xs font-semibold text-paper-700">
                      <Icon size={11} /> {SPEED_LABELS[order.speed_tier]}
                    </span>
                  </div>
                  <span className="font-black text-lg text-paper-900">NT${order.total_fee}</span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 bg-paper-900 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                      <MapPin size={11} className="text-white" />
                    </div>
                    <div>
                      <div className="text-xs text-paper-400">取件地址</div>
                      <div className="text-sm font-medium text-paper-900">{order.pickup_address}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                      <MapPin size={11} className="text-white" />
                    </div>
                    <div>
                      <div className="text-xs text-paper-400">送達地址</div>
                      <div className="text-sm font-medium text-paper-900">{order.delivery_address}</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-paper-400">{order.distance} km · 預估 {order.duration} 分鐘</div>
                  <button
                    onClick={() => accept(order.id)}
                    disabled={accepting === order.id}
                    className="flex items-center gap-1.5 bg-paper-900 hover:bg-paper-700 disabled:opacity-60 text-white rounded-xl px-4 py-2 text-sm font-bold transition-colors"
                  >
                    {accepting === order.id ? '接單中…' : '接單'} <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
