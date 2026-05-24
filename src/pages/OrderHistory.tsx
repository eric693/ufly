import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, RotateCcw, Star, SlidersHorizontal, MapPin, Package } from 'lucide-react'
import { MOCK_ORDERS } from '../data/mockData'
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

export default function OrderHistory() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')

  const recent = MOCK_ORDERS[0]
  const rest = MOCK_ORDERS.slice(1).filter(o => {
    if (filter === 'active')    return !['completed','cancelled'].includes(o.status)
    if (filter === 'completed') return o.status === 'completed'
    if (search) return o.id.includes(search) || o.delivery.address.includes(search)
    return true
  })

  return (
    <div className="animate-fade-in max-w-2xl mx-auto px-4 py-6 md:py-10">
      <h1 className="text-2xl font-black text-paper-900 mb-6">活動</h1>

      {/* Most recent — Uber style */}
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
            <div className="font-bold text-paper-900 mb-0.5">{SERVICE_LABEL[recent.service] || '配送任務'}</div>
            <div className="text-paper-500 text-sm">
              {new Date(recent.createdAt).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })} · NT${recent.totalFee}
            </div>
            <div className="flex gap-2 mt-3">
              <button className="flex items-center gap-1.5 bg-paper-100 hover:bg-paper-200 text-paper-800 rounded-2xl px-4 py-2 text-sm font-medium transition-colors">
                <Star size={13} /> 評分
              </button>
              <Link to="/order" className="flex items-center gap-1.5 bg-paper-100 hover:bg-paper-200 text-paper-800 rounded-2xl px-4 py-2 text-sm font-medium transition-colors">
                <RotateCcw size={13} /> 重新預訂
              </Link>
            </div>
          </div>
        </div>
      </div>

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
              ${filter === f ? 'bg-paper-900 text-paper-900' : 'bg-white border border-paper-200 text-paper-600 hover:bg-paper-100'}`}>
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
                <span className="font-semibold text-sm">{SERVICE_LABEL[o.service] || '任務'}</span>
                <span className={STATUS_COLOR[o.status]}>{STATUS_LABEL[o.status]}</span>
              </div>
              <div className="text-paper-500 text-xs flex items-center gap-1 truncate">
                <MapPin size={10} /> {o.delivery.address}
              </div>
              <div className="text-paper-400 text-xs mt-0.5">
                {new Date(o.createdAt).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })} · NT${o.totalFee}
              </div>
            </div>
            <Link to="/order" className="flex items-center gap-1 bg-paper-100 hover:bg-paper-200 rounded-xl px-3 py-1.5 text-xs font-medium text-paper-700 transition-colors flex-shrink-0">
              <RotateCcw size={12} /> 重新預訂
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
