import { useState } from 'react'
import { Search, SlidersHorizontal, Download, Eye, MapPin, Clock, Package } from 'lucide-react'
import { MOCK_ORDERS } from '../../data/mockData'
import type { OrderStatus } from '../../types'

const ALL_STATUSES: { label: string; value: OrderStatus | 'all' }[] = [
  { label: '全部',   value: 'all' },
  { label: '等待媒合', value: 'pending' },
  { label: '媒合中', value: 'matching' },
  { label: '已接單', value: 'accepted' },
  { label: '配送中', value: 'delivering' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' },
]

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending: 'admin-badge-gray', matching: 'admin-badge-blue', accepted: 'admin-badge-yellow',
  pickup: 'admin-badge-yellow', delivering: 'admin-badge-blue', completed: 'admin-badge-green', cancelled: 'admin-badge-red',
}
const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: '等待媒合', matching: '媒合中', accepted: '已接單',
  pickup: '取件中', delivering: '配送中', completed: '已送達', cancelled: '已取消',
}

export default function AdminOrders() {
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  const filtered = MOCK_ORDERS.filter(o => {
    if (filter !== 'all' && o.status !== filter) return false
    if (search && !o.id.includes(search) && !o.delivery.address.includes(search) &&
        !o.pickup.address.includes(search)) return false
    return true
  })

  const detail = selected ? MOCK_ORDERS.find(o => o.id === selected) : null

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">訂單管理</h1>
        <button className="btn-secondary py-2 text-sm gap-2">
          <Download size={16} /> 匯出
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-surface-800 border border-surface-700
                        rounded-xl px-3 py-2 flex-1">
          <Search size={16} className="text-gray-400" />
          <input
            className="bg-transparent text-sm placeholder-surface-400 text-white outline-none flex-1"
            placeholder="搜尋訂單編號、地址..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 bg-surface-800 border border-surface-700
                           rounded-xl px-3 py-2 text-sm text-gray-300 hover:text-white">
          <SlidersHorizontal size={16} /> 篩選
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {ALL_STATUSES.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors
              ${filter === f.value
                ? 'bg-white text-black'
                : 'bg-surface-800 border border-surface-700 text-gray-300 hover:text-white'}`}
          >
            {f.label}
            {f.value !== 'all' && (
              <span className="ml-1 text-inherit opacity-60">
                {MOCK_ORDERS.filter(o => o.status === f.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className={`${detail ? 'grid lg:grid-cols-5 gap-5' : ''}`}>
        {/* Table */}
        <div className={`${detail ? 'lg:col-span-3' : ''} bg-surface-800 border border-surface-700 rounded-2xl overflow-hidden`}>
          {/* Desktop table */}
          <table className="w-full hidden md:table">
            <thead>
              <tr className="border-b border-surface-700">
                {['訂單編號', '取件地址', '送達地址', '費用', '狀態', '操作'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700">
              {filtered.map(o => (
                <tr key={o.id}
                  className={`hover:bg-surface-700/40 transition-colors cursor-pointer
                    ${selected === o.id ? 'bg-white/5' : ''}`}
                  onClick={() => setSelected(selected === o.id ? null : o.id)}
                >
                  <td className="px-4 py-3 text-sm font-semibold">{o.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-300 max-w-[140px] truncate">{o.pickup.address}</td>
                  <td className="px-4 py-3 text-sm text-gray-300 max-w-[140px] truncate">{o.delivery.address}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-white">NT${o.totalFee}</td>
                  <td className="px-4 py-3"><span className={STATUS_COLOR[o.status]}>{STATUS_LABEL[o.status]}</span></td>
                  <td className="px-4 py-3">
                    <button className="p-1.5 rounded-lg hover:bg-surface-600 text-gray-400 hover:text-white transition-colors">
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile list */}
          <div className="md:hidden divide-y divide-surface-700">
            {filtered.map(o => (
              <div key={o.id}
                className={`p-4 cursor-pointer hover:bg-surface-700/40 transition-colors
                  ${selected === o.id ? 'bg-white/5' : ''}`}
                onClick={() => setSelected(selected === o.id ? null : o.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">{o.id}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-sm">NT${o.totalFee}</span>
                    <span className={STATUS_COLOR[o.status]}>{STATUS_LABEL[o.status]}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-gray-400 text-xs">
                  <MapPin size={10} /> <span className="truncate">{o.pickup.address}</span>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="py-12 text-center text-gray-400">
              <Package size={36} className="mx-auto mb-3 opacity-50" />
              <div className="text-sm">沒有符合的訂單</div>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {detail && (
          <div className="lg:col-span-2 bg-surface-800 border border-surface-700 rounded-2xl p-5 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">訂單詳情</h3>
              <button onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-white text-sm">關閉</button>
            </div>

            <div className="space-y-1">
              {[
                { label: '訂單編號', value: detail.id },
                { label: '狀態',   value: <span className={STATUS_COLOR[detail.status]}>{STATUS_LABEL[detail.status]}</span> },
                { label: '建立時間', value: new Date(detail.createdAt).toLocaleString('zh-TW') },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between py-2 border-b border-surface-700">
                  <span className="text-gray-400 text-sm">{r.label}</span>
                  <span className="text-sm font-medium">{r.value}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">路線</div>
              <div className="flex items-start gap-2">
                <MapPin size={14} className="text-white mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs text-gray-400">取件</div>
                  <div className="text-sm">{detail.pickup.address}</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs text-gray-400">送達</div>
                  <div className="text-sm">{detail.delivery.address}</div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 text-sm">
              <div className="flex items-center gap-1 text-gray-300">
                <Clock size={13} /> {detail.distance} 公里
              </div>
              <div className="flex items-center gap-1 text-gray-300">
                <Package size={13} /> {detail.duration} 分鐘
              </div>
            </div>

            <div className="bg-surface-700 rounded-xl p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">基本費用</span>
                <span>NT${detail.baseFee}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">加價</span>
                <span>NT${detail.totalFee - detail.baseFee}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-surface-600 pt-1 mt-1">
                <span>合計</span>
                <span className="text-white">NT${detail.totalFee}</span>
              </div>
            </div>

            {detail.driver && (
              <div className="flex items-center gap-3 bg-surface-700 rounded-xl p-3">
                <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center font-bold text-white">
                  {detail.driver.name[0]}
                </div>
                <div>
                  <div className="text-sm font-semibold">{detail.driver.name}</div>
                  <div className="text-gray-400 text-xs">{detail.driver.phone}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
