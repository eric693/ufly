import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, RotateCcw, Star, SlidersHorizontal, MapPin, Package, Loader2, X, AlertTriangle } from 'lucide-react'
import RatingModal from '../components/RatingModal'
import api from '../lib/api'
import type { OrderStatus } from '../types'

const SERVICE_LABEL: Record<string, string> = {
  document: '文件急送', delivery: '物品配送', purchase: '即時代購',
  errand: '即時代辦', business: '商務急件', custom: '客製任務',
  key: '鑰匙急送', ticket: '票券文件', gift: '禮品配送', designated: '指定送達',
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
  delivery_address: string; total_fee: number; created_at: string
  driver_name?: string; driver_rating?: number; rated: number
}

export default function OrderHistory() {
  const [searchParams]              = useSearchParams()
  const [orders, setOrders]         = useState<Order[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState<'all' | 'active' | 'completed'>('all')
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null)

  useEffect(() => {
    api.get('/orders').then(r => { setOrders(r.data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  // Auto-open rating modal if ?rate=ORDER_ID
  useEffect(() => {
    const rateId = searchParams.get('rate')
    if (rateId && orders.length) {
      const o = orders.find(x => x.id === rateId && x.status === 'completed' && !x.rated)
      if (o) setRatingOrder(o)
    }
  }, [searchParams, orders])

  const filtered = orders.filter(o => {
    if (filter === 'active')    return !['completed','cancelled'].includes(o.status)
    if (filter === 'completed') return ['completed','cancelled'].includes(o.status)
    if (search) return o.id.toLowerCase().includes(search.toLowerCase()) || o.delivery_address.includes(search)
    return true
  })

  const recent = filtered[0]
  const rest = filtered.slice(1)

  const handleRated = (orderId: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, rated: 1 } : o))
    setRatingOrder(null)
  }

  const cancelOrder = async (orderId: string) => {
    if (!confirm('確定要取消訂單？')) return
    try {
      await api.put(`/orders/${orderId}/cancel`)
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' as OrderStatus } : o))
    } catch (e: any) {
      alert(e?.response?.data?.error || '取消失敗')
    }
  }

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loader2 size={28} className="animate-spin text-paper-400" />
    </div>
  )

  return (
    <div className="animate-fade-in max-w-2xl mx-auto px-4 py-6 md:py-10">
      <RatingModal
        open={!!ratingOrder}
        onClose={() => setRatingOrder(null)}
        orderId={ratingOrder?.id}
        driverName={ratingOrder?.driver_name}
        onSubmitted={handleRated}
      />

      <h1 className="text-2xl font-black text-paper-900 mb-6">活動</h1>

      {orders.length === 0 ? (
        <div className="text-center py-20">
          <Package size={40} className="text-paper-300 mx-auto mb-3" />
          <div className="text-paper-500 mb-4">還沒有任何訂單</div>
          <Link to="/order" className="btn-primary inline-flex">立即下單</Link>
        </div>
      ) : (
        <>
          {recent && (
            <div className="mb-6">
              <div className="text-xs font-semibold text-paper-500 uppercase tracking-wider mb-3">過去</div>
              <div className="bg-white rounded-2xl border border-paper-200 shadow-card overflow-hidden">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-100 h-28 relative">
                  <svg viewBox="0 0 300 80" className="w-full h-full absolute inset-0 opacity-50">
                    <path d="M 30 60 C 80 60, 100 20, 150 20 S 220 25, 270 20"
                      fill="none" stroke="#4F46E5" strokeWidth="3" strokeDasharray="6,3" strokeLinecap="round"/>
                    <circle cx="30" cy="60" r="6" fill="#4F46E5"/>
                    <rect x="264" y="14" width="12" height="12" rx="2" fill="#4F46E5"/>
                  </svg>
                  <div className="absolute bottom-2 right-3">
                    <span className={STATUS_COLOR[recent.status]}>{STATUS_LABEL[recent.status]}</span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="font-bold text-paper-900 mb-0.5">{SERVICE_LABEL[recent.service_type] || '配送任務'}</div>
                  <div className="text-paper-500 text-sm">
                    {new Date(recent.created_at).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })} · NT${recent.total_fee}
                  </div>
                  <div className="flex gap-2 mt-3">
                    {recent.status === 'completed' && !recent.rated && (
                      <button
                        onClick={() => setRatingOrder(recent)}
                        className="flex items-center gap-1.5 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200 rounded-2xl px-4 py-2 text-sm font-medium transition-colors">
                        <Star size={13} /> 評分
                      </button>
                    )}
                    {['pending', 'matching'].includes(recent.status) && (
                      <button
                        onClick={() => cancelOrder(recent.id)}
                        className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-2xl px-4 py-2 text-sm font-medium transition-colors">
                        <X size={13} /> 取消
                      </button>
                    )}
                    <Link to="/order" className="flex items-center gap-1.5 bg-paper-100 hover:bg-paper-200 text-paper-800 rounded-2xl px-4 py-2 text-sm font-medium transition-colors">
                      <RotateCcw size={13} /> 重新預訂
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search + filter */}
          <div className="flex gap-2 mb-4">
            <div className="flex items-center gap-2 bg-white border border-paper-200 rounded-xl px-3 py-2 flex-1 shadow-card">
              <Search size={15} className="text-paper-400" />
              <input className="bg-transparent text-sm placeholder-paper-400 text-paper-900 outline-none flex-1"
                placeholder="搜尋訂單…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button className="flex items-center gap-1.5 bg-white border border-paper-200 rounded-xl px-3 py-2 text-sm text-paper-600 shadow-card">
              <SlidersHorizontal size={15} />
            </button>
          </div>
          <div className="flex gap-2 mb-4">
            {(['all','active','completed'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors
                  ${filter === f ? 'bg-paper-900 text-white' : 'bg-white border border-paper-200 text-paper-600 hover:bg-paper-100'}`}>
                {f === 'all' ? '全部' : f === 'active' ? '進行中' : '已完成'}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {rest.map(o => (
              <div key={o.id} className="bg-white rounded-2xl border border-paper-200 shadow-card p-4 flex items-center gap-3">
                <div className="w-14 h-14 bg-paper-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Package size={22} className="text-paper-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-sm">{SERVICE_LABEL[o.service_type] || '任務'}</span>
                    <span className={STATUS_COLOR[o.status]}>{STATUS_LABEL[o.status]}</span>
                  </div>
                  <div className="text-paper-500 text-xs flex items-center gap-1 truncate">
                    <MapPin size={10} /> {o.delivery_address}
                  </div>
                  <div className="text-paper-400 text-xs mt-0.5">
                    {new Date(o.created_at).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })} · NT${o.total_fee}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  {o.status === 'completed' && !o.rated && (
                    <button onClick={() => setRatingOrder(o)}
                      className="flex items-center gap-1 bg-yellow-50 border border-yellow-200 hover:bg-yellow-100 rounded-xl px-2.5 py-1.5 text-xs font-medium text-yellow-700 transition-colors">
                      <Star size={11} /> 評分
                    </button>
                  )}
                  {o.status === 'completed' && (
                    <Link to={`/dispute?order=${o.id}`}
                      className="flex items-center gap-1 bg-paper-50 border border-paper-200 hover:bg-paper-100 rounded-xl px-2.5 py-1.5 text-xs font-medium text-paper-600 transition-colors">
                      <AlertTriangle size={11} /> 申訴
                    </Link>
                  )}
                  {['pending', 'matching'].includes(o.status) && (
                    <button onClick={() => cancelOrder(o.id)}
                      className="flex items-center gap-1 bg-red-50 border border-red-200 hover:bg-red-100 rounded-xl px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors">
                      <X size={11} /> 取消
                    </button>
                  )}
                  <Link to="/order" className="flex items-center gap-1 bg-paper-100 hover:bg-paper-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-paper-700 transition-colors">
                    <RotateCcw size={11} /> 重訂
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
