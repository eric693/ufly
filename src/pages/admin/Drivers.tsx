import { useState } from 'react'
import { Search, Plus, Phone, Star, MapPin, TrendingUp } from 'lucide-react'
import { MOCK_DRIVERS } from '../../data/mockData'
import type { Driver } from '../../types'

const STATUS_LABEL = { online: '在線', busy: '任務中', offline: '離線' }
const STATUS_CLASS = {
  online:  'badge-green',
  busy:    'badge-yellow',
  offline: 'badge-gray',
}

export default function AdminDrivers() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | Driver['status']>('all')

  const filtered = MOCK_DRIVERS.filter(d => {
    if (filter !== 'all' && d.status !== filter) return false
    if (search && !d.name.includes(search) && !d.phone.includes(search) && !d.area.includes(search)) return false
    return true
  })

  const counts = {
    online:  MOCK_DRIVERS.filter(d => d.status === 'online').length,
    busy:    MOCK_DRIVERS.filter(d => d.status === 'busy').length,
    offline: MOCK_DRIVERS.filter(d => d.status === 'offline').length,
  }

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">夥伴管理</h1>
        <button className="btn-primary py-2 text-sm">
          <Plus size={16} /> 新增夥伴
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {(['online', 'busy', 'offline'] as const).map(s => (
          <div key={s} className="bg-surface-800 border border-surface-700 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className={s === 'online' ? 'status-online' : s === 'busy' ? 'status-busy' : 'status-offline'} />
              <span className="text-surface-300 text-sm">{STATUS_LABEL[s]}</span>
            </div>
            <div className="text-2xl font-black">{counts[s]}</div>
          </div>
        ))}
      </div>

      {/* Search & filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-surface-800 border border-surface-700 rounded-xl px-3 py-2 flex-1">
          <Search size={16} className="text-surface-400" />
          <input
            className="bg-transparent text-sm placeholder-surface-400 text-white outline-none flex-1"
            placeholder="搜尋姓名、電話、區域..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'online', 'busy', 'offline'] as const).map(s => (
            <button key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors
                ${filter === s
                  ? 'bg-white text-black'
                  : 'bg-surface-800 border border-surface-700 text-surface-300 hover:text-white'}`}>
              {s === 'all' ? '全部' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtered.map(d => (
          <div key={d.id} className="bg-surface-800 border border-surface-700 rounded-2xl p-4 space-y-3
                                     hover:border-surface-500 transition-colors cursor-pointer">
            {/* Avatar + status */}
            <div className="flex items-start justify-between">
              <div className="relative">
                <div className="w-12 h-12 bg-surface-700 rounded-2xl flex items-center justify-center
                                text-lg font-bold border border-surface-600">
                  {d.name[0]}
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5
                  ${d.status === 'online' ? 'status-online' : d.status === 'busy' ? 'status-busy' : 'status-offline'}`} />
              </div>
              <span className={STATUS_CLASS[d.status]}>{STATUS_LABEL[d.status]}</span>
            </div>

            {/* Info */}
            <div>
              <div className="font-bold">{d.name}</div>
              <div className="flex items-center gap-1 text-surface-400 text-xs mt-0.5">
                <MapPin size={11} /> {d.area}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-surface-700 rounded-xl p-2.5">
                <div className="flex items-center gap-1 text-yellow-400 text-xs mb-0.5">
                  <Star size={10} className="fill-yellow-400" /> 評分
                </div>
                <div className="font-bold text-sm">{d.rating}</div>
              </div>
              <div className="bg-surface-700 rounded-xl p-2.5">
                <div className="flex items-center gap-1 text-white text-xs mb-0.5">
                  <TrendingUp size={10} /> 完成
                </div>
                <div className="font-bold text-sm">{d.completedOrders}</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <a href={`tel:${d.phone}`}
                className="flex-1 flex items-center justify-center gap-1.5 bg-surface-700
                           hover:bg-surface-600 rounded-xl py-2 text-xs text-surface-200 hover:text-white transition-colors">
                <Phone size={13} /> 聯絡
              </a>
              <button className="flex-1 bg-surface-700 hover:bg-surface-600 rounded-xl py-2 text-xs
                                 text-surface-200 hover:text-white transition-colors">
                詳情
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
