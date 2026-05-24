import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, SlidersHorizontal, Package, Clock, ArrowRight } from 'lucide-react'
import { MOCK_ORDERS } from '../data/mockData'
import type { OrderStatus } from '../types'

const FILTERS: { label: string; value: OrderStatus | 'all' }[] = [
  { label: '全部',   value: 'all' },
  { label: '進行中', value: 'delivering' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' },
]

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending:    '等待媒合', matching: '媒合中', accepted: '已接單',
  pickup:     '取件中',   delivering: '配送中', completed: '已送達', cancelled: '已取消',
}
const STATUS_COLOR: Record<OrderStatus, string> = {
  pending: 'badge-gray', matching: 'badge-blue', accepted: 'badge-yellow',
  pickup: 'badge-yellow', delivering: 'badge-blue', completed: 'badge-green', cancelled: 'badge-red',
}

export default function OrderHistory() {
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')
  const [search, setSearch] = useState('')

  const filtered = MOCK_ORDERS.filter(o => {
    if (filter !== 'all') {
      if (filter === 'delivering' && !['pending','matching','accepted','pickup','delivering'].includes(o.status)) return false
      if (filter !== 'delivering' && o.status !== filter) return false
    }
    if (search && !o.id.toLowerCase().includes(search.toLowerCase()) &&
        !o.delivery.address.includes(search)) return false
    return true
  })

  return (
    <div className="animate-fade-in max-w-2xl mx-auto px-4 py-6 md:py-10">
      <h1 className="text-2xl font-bold mb-6">歷史紀錄</h1>

      {/* Search */}
      <div className="input-group flex items-center mb-4">
        <Search size={16} className="text-surface-300 ml-4" />
        <input
          className="input-field"
          placeholder="搜尋訂單編號或地址"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button className="p-3 text-surface-300 hover:text-white">
          <SlidersHorizontal size={16} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0
              ${filter === f.value
                ? 'bg-white text-black'
                : 'bg-surface-700 text-surface-200 hover:bg-surface-600'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Orders */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="card text-center py-12 text-surface-400">
            <Package size={40} className="mx-auto mb-3 opacity-50" />
            <div className="text-sm">沒有符合的訂單</div>
          </div>
        ) : filtered.map(order => (
          <Link key={order.id} to="/tracking"
            className="card-hover block">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{order.id}</span>
                  <span className={STATUS_COLOR[order.status]}>{STATUS_LABEL[order.status]}</span>
                </div>
                <div className="text-surface-300 text-xs truncate">{order.pickup.address}</div>
                <div className="flex items-center gap-1 text-surface-400 text-xs mt-0.5">
                  <ArrowRight size={10} />
                  <span className="truncate">{order.delivery.address}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-bold text-white">NT${order.totalFee}</div>
                <div className="flex items-center gap-1 text-surface-400 text-xs mt-1 justify-end">
                  <Clock size={10} />
                  <span>{new Date(order.createdAt).toLocaleDateString('zh-TW')}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
