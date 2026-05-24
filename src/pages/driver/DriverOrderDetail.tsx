import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapPin, Phone, Package, ChevronRight, ArrowLeft, CheckCircle } from 'lucide-react'
import api from '../../lib/api'
import { getSocket } from '../../lib/socket'

const STATUS_LABELS: Record<string, string> = {
  accepted:   '已接單，前往取件',
  pickup:     '取件中',
  delivering: '配送中',
  completed:  '已完成',
}

const NEXT_ACTION: Record<string, { label: string; next: string }> = {
  accepted:   { label: '出發取件', next: 'pickup' },
  pickup:     { label: '確認已取件，開始配送', next: 'delivering' },
  delivering: { label: '確認已送達', next: 'completed' },
}

export default function DriverOrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [order, setOrder]     = useState<any>(null)
  const [updating, setUpdating] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/drivers/me/current')
      .then(r => {
        const current = r.data
        if (current && current.id !== id) {
          navigate(`/driver/order/${current.id}`, { replace: true })
          return
        }
        setOrder(current)
        setLoading(false)
      })
      .catch(() => setLoading(false))

    const socket = getSocket()
    const handler = (updated: any) => {
      if (updated.id === id) setOrder(updated)
    }
    socket.on('order:update', handler)
    return () => { socket.off('order:update', handler) }
  }, [id])

  const updateStatus = async () => {
    if (!order || !NEXT_ACTION[order.status]) return
    setUpdating(true)
    try {
      const { data } = await api.patch(`/drivers/orders/${order.id}/status`, { status: NEXT_ACTION[order.status].next })
      setOrder(data)
      if (data.status === 'completed') {
        setTimeout(() => navigate('/driver'), 2000)
      }
    } catch (e: any) {
      alert(e?.response?.data?.error || '更新失敗')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-paper-400">載入中…</div>

  if (!order) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-paper-500">無進行中訂單</p>
      <button onClick={() => navigate('/driver')} className="btn-primary">返回接單列表</button>
    </div>
  )

  return (
    <div className="min-h-screen bg-paper-50 animate-fade-in">
      <div className="bg-black px-4 pt-8 pb-6">
        <div className="max-w-xl mx-auto">
          <button onClick={() => navigate('/driver')} className="mb-4 flex items-center gap-1 text-white/60 hover:text-white text-sm transition-colors">
            <ArrowLeft size={16} /> 接單列表
          </button>
          <div className="text-white/50 text-xs mb-1">訂單編號</div>
          <h1 className="text-2xl font-black text-white mb-2">{order.id}</h1>
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold ${
            order.status === 'completed' ? 'bg-emerald-500 text-white' : 'bg-white/15 text-white'
          }`}>
            {order.status === 'completed' && <CheckCircle size={14} />}
            {STATUS_LABELS[order.status] ?? order.status}
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-4">
        {/* Addresses */}
        <div className="bg-white rounded-2xl border border-paper-200 shadow-card p-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-paper-900 rounded-xl flex items-center justify-center flex-shrink-0">
              <MapPin size={14} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-paper-400 mb-0.5">取件地址</div>
              <div className="font-semibold text-paper-900 text-sm">{order.pickup_address}</div>
              {order.pickup_phone && (
                <a href={`tel:${order.pickup_phone}`} className="flex items-center gap-1 text-xs text-indigo-600 mt-1">
                  <Phone size={11} /> {order.pickup_phone}
                </a>
              )}
            </div>
          </div>
          <div className="h-px bg-paper-100" />
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <MapPin size={14} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-paper-400 mb-0.5">送達地址</div>
              <div className="font-semibold text-paper-900 text-sm">{order.delivery_address}</div>
              {order.delivery_phone && (
                <a href={`tel:${order.delivery_phone}`} className="flex items-center gap-1 text-xs text-indigo-600 mt-1">
                  <Phone size={11} /> {order.delivery_phone}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Item info */}
        {order.item_content && (
          <div className="bg-white rounded-2xl border border-paper-200 shadow-card p-4 flex items-start gap-3">
            <Package size={18} className="text-paper-500 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs text-paper-400 mb-0.5">物品內容</div>
              <div className="text-sm font-medium text-paper-900">{order.item_content}</div>
              {order.item_note && <div className="text-xs text-paper-400 mt-1">{order.item_note}</div>}
            </div>
          </div>
        )}

        {/* Fee */}
        <div className="bg-white rounded-2xl border border-paper-200 shadow-card p-4 flex items-center justify-between">
          <span className="text-paper-500 text-sm">本單收入</span>
          <span className="font-black text-xl text-paper-900">NT${order.total_fee}</span>
        </div>

        {/* Action button */}
        {NEXT_ACTION[order.status] && (
          <button
            onClick={updateStatus}
            disabled={updating}
            className="w-full btn-primary text-base py-4"
          >
            {updating ? '更新中…' : NEXT_ACTION[order.status].label} <ChevronRight size={16} />
          </button>
        )}

        {order.status === 'completed' && (
          <div className="text-center py-4">
            <CheckCircle size={40} className="text-emerald-500 mx-auto mb-2" />
            <p className="font-bold text-paper-900">訂單完成！</p>
            <p className="text-paper-400 text-sm mt-1">即將返回接單頁面…</p>
          </div>
        )}
      </div>
    </div>
  )
}
