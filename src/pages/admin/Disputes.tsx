import { useState, useEffect } from 'react'
import { AlertTriangle, Loader2, CheckCircle, XCircle, Search, Clock } from 'lucide-react'
import api from '../../lib/api'

interface Dispute {
  id: string
  orderId: string
  reason: string
  description: string
  status: 'open' | 'investigating' | 'resolved' | 'rejected'
  resolution: string | null
  resolvedBy: string | null
  createdAt: string
  updatedAt: string
  order: { id: string; pickupAddress: string; deliveryAddress: string; totalFee: number }
  user: { name: string; email: string; phone: string }
}

const STATUS_COLORS: Record<string, string> = {
  open:          'bg-yellow-100 text-yellow-700',
  investigating: 'bg-blue-100 text-blue-700',
  resolved:      'bg-emerald-100 text-emerald-700',
  rejected:      'bg-red-100 text-red-700',
}
const STATUS_LABELS: Record<string, string> = {
  open: '待處理', investigating: '調查中', resolved: '已解決', rejected: '已駁回',
}

export default function AdminDisputes() {
  const [disputes, setDisputes]   = useState<Dispute[]>([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState<Dispute | null>(null)
  const [filter, setFilter]       = useState('all')
  const [search, setSearch]       = useState('')
  const [resolution, setResolution] = useState('')
  const [updating, setUpdating]   = useState(false)

  useEffect(() => {
    api.get('/disputes/admin/all')
      .then(r => setDisputes(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function resolve(id: string, status: string) {
    if (status === 'resolved' && !resolution.trim()) {
      alert('請填寫處理結果'); return
    }
    setUpdating(true)
    try {
      const { data } = await api.patch(`/disputes/admin/${id}`, { status, resolution: resolution.trim() || null })
      setDisputes(prev => prev.map(d => d.id === id ? { ...d, ...data } : d))
      setSelected(prev => prev ? { ...prev, ...data } : null)
      setResolution('')
    } catch (e: any) {
      alert(e?.response?.data?.error || '操作失敗')
    } finally {
      setUpdating(false)
    }
  }

  const filtered = disputes.filter(d => {
    if (filter !== 'all' && d.status !== filter) return false
    if (search && !d.orderId.includes(search) && !d.user.name.includes(search)) return false
    return true
  })

  if (loading) return (
    <div className="flex items-center justify-center h-64"><Loader2 size={28} className="animate-spin text-gray-400" /></div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">爭議管理</h1>
          <p className="text-gray-400 text-sm mt-1">共 {disputes.length} 筆申訴，{disputes.filter(d => d.status === 'open').length} 筆待處理</p>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="訂單號 / 客戶名稱"
            className="bg-surface-800 border border-surface-700 text-white rounded-xl pl-8 pr-3 py-2 text-sm w-48 placeholder-gray-500 focus:outline-none focus:border-white/30"
          />
        </div>
        {['all', 'open', 'investigating', 'resolved', 'rejected'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors
              ${filter === s ? 'bg-white text-black' : 'bg-surface-800 border border-surface-700 text-gray-300 hover:border-white/30'}`}>
            {s === 'all' ? '全部' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* List */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <AlertTriangle size={32} className="mx-auto mb-2 opacity-30" />
              <p>無符合條件的申訴</p>
            </div>
          )}
          {filtered.map(d => (
            <button key={d.id} onClick={() => { setSelected(d); setResolution(d.resolution || '') }}
              className={`w-full text-left p-4 rounded-2xl border transition-all
                ${selected?.id === d.id ? 'border-white/30 bg-surface-700' : 'border-surface-700 bg-surface-800 hover:border-white/20'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-yellow-400" />
                  <span className="font-semibold text-sm text-white">{d.orderId}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[d.status]}`}>
                  {STATUS_LABELS[d.status]}
                </span>
              </div>
              <div className="text-sm text-gray-300 mb-1">{d.reason}</div>
              <div className="text-xs text-gray-500 flex items-center gap-3">
                <span>{d.user.name}</span>
                <span>{new Date(d.createdAt).toLocaleDateString('zh-TW')}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5 space-y-4 h-fit">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white">申訴詳情</h3>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[selected.status]}`}>
                {STATUS_LABELS[selected.status]}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-400"><Clock size={13} /> {new Date(selected.createdAt).toLocaleString('zh-TW')}</div>
              <div className="text-white font-medium">訂單：{selected.orderId}</div>
              <div className="text-gray-300">客戶：{selected.user.name} {selected.user.phone && `(${selected.user.phone})`}</div>
              <div className="text-gray-400">{selected.user.email}</div>
            </div>

            <div className="border-t border-surface-600 pt-3">
              <div className="text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">原因</div>
              <div className="text-white text-sm">{selected.reason}</div>
            </div>

            <div>
              <div className="text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">說明</div>
              <div className="text-gray-300 text-sm leading-relaxed">{selected.description}</div>
            </div>

            <div>
              <div className="text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">路線</div>
              <div className="text-xs text-gray-400">{selected.order.pickupAddress} → {selected.order.deliveryAddress}</div>
              <div className="text-xs text-gray-300 mt-0.5">NT${selected.order.totalFee}</div>
            </div>

            {['open', 'investigating'].includes(selected.status) && (
              <div className="border-t border-surface-600 pt-3 space-y-3">
                <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">處理結果（解決時必填）</div>
                <textarea
                  value={resolution}
                  onChange={e => setResolution(e.target.value)}
                  placeholder="說明處理方式或補償內容…"
                  rows={3}
                  className="w-full bg-surface-700 border border-surface-600 text-white rounded-xl p-3 text-sm placeholder-gray-500 focus:outline-none focus:border-white/30 resize-none"
                />
                <div className="flex gap-2">
                  <button onClick={() => resolve(selected.id, 'investigating')} disabled={updating}
                    className="flex-1 py-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 text-sm font-medium hover:bg-blue-600/30 transition-colors">
                    調查中
                  </button>
                  <button onClick={() => resolve(selected.id, 'resolved')} disabled={updating}
                    className="flex-1 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium hover:bg-emerald-600/30 transition-colors flex items-center justify-center gap-1">
                    {updating ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />} 解決
                  </button>
                  <button onClick={() => resolve(selected.id, 'rejected')} disabled={updating}
                    className="flex-1 py-2 rounded-xl bg-red-600/20 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-600/30 transition-colors flex items-center justify-center gap-1">
                    {updating ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />} 駁回
                  </button>
                </div>
              </div>
            )}

            {selected.resolution && (
              <div className="border-t border-surface-600 pt-3">
                <div className="text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">處理結果</div>
                <div className="text-gray-300 text-sm">{selected.resolution}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
