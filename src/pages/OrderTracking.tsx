import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  MapPin, Phone, Clock, CheckCircle, Circle, Package,
  Navigation, Star, MessageCircle, AlertCircle,
} from 'lucide-react'
import { MOCK_ORDERS } from '../data/mockData'
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
  pending:    '等待媒合',
  matching:   '媒合中',
  accepted:   '已接單',
  pickup:     '取件中',
  delivering: '配送中',
  completed:  '已送達',
  cancelled:  '已取消',
}

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending:    'badge-gray',
  matching:   'badge-blue',
  accepted:   'badge-yellow',
  pickup:     'badge-yellow',
  delivering: 'badge-blue',
  completed:  'badge-green',
  cancelled:  'badge-red',
}

export default function OrderTracking() {
  const [params] = useSearchParams()
  const isNew = params.get('new') === '1'
  const [selectedId, setSelectedId] = useState<string>(
    isNew ? 'UF240001' : MOCK_ORDERS[0].id
  )

  const order = MOCK_ORDERS.find(o => o.id === selectedId) || MOCK_ORDERS[0]
  const currentStep = STATUS_INDEX[order.status]

  return (
    <div className="animate-fade-in max-w-5xl mx-auto px-4 py-6 md:py-10">
      <h1 className="text-2xl font-bold mb-6">訂單追蹤</h1>

      <div className="md:grid md:grid-cols-3 md:gap-6">
        {/* Order list (desktop sidebar / mobile top) */}
        <div className="md:col-span-1 mb-4 md:mb-0">
          <div className="space-y-2">
            {MOCK_ORDERS.filter(o => o.status !== 'completed').concat(
              MOCK_ORDERS.filter(o => o.status === 'completed').slice(0, 2)
            ).map(o => (
              <button
                key={o.id}
                onClick={() => setSelectedId(o.id)}
                className={`w-full text-left p-4 rounded-2xl border transition-all
                  ${selectedId === o.id
                    ? 'border-white bg-white/8'
                    : 'border-surface-600 bg-surface-700 hover:border-surface-500'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">{o.id}</span>
                  <span className={STATUS_COLOR[o.status]}>{STATUS_LABEL[o.status]}</span>
                </div>
                <div className="text-surface-300 text-xs truncate">{o.delivery.address}</div>
                <div className="text-surface-400 text-xs mt-1">
                  {new Date(o.createdAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div className="md:col-span-2 space-y-4">
          {isNew && (
            <div className="flex items-start gap-3 bg-white/8 border border-white/20 rounded-2xl p-4">
              <CheckCircle size={20} className="text-white flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-gray-300 text-sm">訂單已建立！</div>
                <div className="text-surface-300 text-xs mt-0.5">正在為您媒合附近的任務夥伴，請稍候。</div>
              </div>
            </div>
          )}

          {/* Status timeline */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">訂單 {order.id}</h2>
              <span className={STATUS_COLOR[order.status]}>{STATUS_LABEL[order.status]}</span>
            </div>

            <div className="relative">
              <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-surface-600" />
              {STATUS_STEPS.map((s, i) => {
                const done    = i <= currentStep
                const current = i === currentStep
                return (
                  <div key={s.status} className="relative flex items-center gap-4 pb-5 last:pb-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center z-10 flex-shrink-0
                      ${done
                        ? 'bg-white'
                        : 'bg-surface-600 border-2 border-surface-500'}`}>
                      {done
                        ? <CheckCircle size={14} className="text-white" />
                        : <Circle size={14} className="text-surface-400" />}
                    </div>
                    <span className={`text-sm font-medium ${current ? 'text-white' : done ? 'text-surface-200' : 'text-surface-500'}`}>
                      {s.label}
                      {current && <span className="ml-2 text-white text-xs animate-pulse-soft">進行中</span>}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Driver card */}
          {order.driver ? (
            <div className="card">
              <div className="text-surface-300 text-xs font-semibold mb-3 uppercase tracking-wider">任務夥伴</div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                    <Navigation size={22} className="text-white" />
                  </div>
                  <div>
                    <div className="font-bold">{order.driver.name}</div>
                    <div className="flex items-center gap-1 text-yellow-400 text-sm mt-0.5">
                      <Star size={12} className="fill-yellow-400" />
                      <span>{order.driver.rating}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a href={`tel:${order.driver.phone}`}
                    className="p-3 bg-surface-600 hover:bg-surface-500 rounded-2xl transition-colors">
                    <Phone size={18} />
                  </a>
                  <button className="p-3 bg-surface-600 hover:bg-surface-500 rounded-2xl transition-colors">
                    <MessageCircle size={18} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card flex items-center gap-3">
              <AlertCircle size={20} className="text-yellow-400 flex-shrink-0" />
              <div>
                <div className="font-semibold text-sm">尋找任務夥伴中</div>
                <div className="text-surface-300 text-xs mt-0.5">預計 1–3 分鐘內完成媒合</div>
              </div>
            </div>
          )}

          {/* Route card */}
          <div className="card space-y-3">
            <div className="text-surface-300 text-xs font-semibold uppercase tracking-wider">路線資訊</div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Navigation size={12} className="text-white" />
              </div>
              <div>
                <div className="text-xs text-surface-400">取件地址</div>
                <div className="text-sm font-medium mt-0.5">{order.pickup.address}</div>
              </div>
            </div>
            <div className="ml-3 border-l-2 border-dashed border-surface-600 h-4" />
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-surface-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin size={12} className="text-white" />
              </div>
              <div>
                <div className="text-xs text-surface-400">送達地址</div>
                <div className="text-sm font-medium mt-0.5">{order.delivery.address}</div>
              </div>
            </div>
            <div className="flex gap-4 pt-2">
              <div className="flex items-center gap-1.5 text-sm text-surface-300">
                <Package size={14} />
                <span>{order.distance} 公里</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-surface-300">
                <Clock size={14} />
                <span>{order.duration} 分鐘</span>
              </div>
              <div className="ml-auto font-bold text-white">NT${order.totalFee}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
