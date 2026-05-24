import { useState, useEffect } from 'react'
import { Search, User, Phone, Clock, Package, Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import api from '../../lib/api'

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [search, setSearch]       = useState('')

  const load = () => {
    setLoading(true); setError('')
    api.get('/admin/customers')
      .then(r => setCustomers(r.data || []))
      .catch((e: any) => setError(e?.response?.data?.error || '載入失敗，請重試'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = customers.filter(c =>
    !search ||
    (c.name || '').includes(search) ||
    (c.email || '').includes(search) ||
    (c.phone || '').includes(search)
  )

  return (
    <div className="animate-fade-in space-y-5">
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
          <AlertCircle size={15} className="flex-shrink-0" /> {error}
        </div>
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">客戶管理</h1>
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm">共 {customers.length} 位客戶</span>
          <button onClick={load} className="flex items-center gap-1.5 bg-surface-800 border border-surface-700 rounded-xl px-3 py-2 text-sm text-gray-300 hover:text-white transition-colors">
            <RefreshCw size={14} /> 重新整理
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-surface-800 border border-surface-700 rounded-xl px-3 py-2 max-w-md">
        <Search size={16} className="text-gray-400" />
        <input
          className="bg-transparent text-sm placeholder-gray-500 text-white outline-none flex-1"
          placeholder="搜尋姓名、Email、電話..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="py-16 text-center"><Loader2 size={24} className="animate-spin text-gray-400 mx-auto" /></div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="bg-surface-800 border border-surface-700 rounded-2xl overflow-hidden hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-700">
                  {['客戶', 'Email / 電話', '訂單數', '加入時間', '累計消費'].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-gray-400 text-xs font-semibold uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-surface-700/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-surface-700 rounded-xl flex items-center justify-center font-semibold text-sm">
                          {(c.name || '?')[0]}
                        </div>
                        <span className="font-medium text-sm">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-sm text-gray-300">{c.email || '—'}</div>
                      {c.phone && <div className="text-xs text-gray-500 mt-0.5">{c.phone}</div>}
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-semibold text-sm">{c.total_orders ?? 0}</span>
                      <span className="text-gray-400 text-sm"> 筆</span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-300">
                      {new Date(c.created_at).toLocaleDateString('zh-TW')}
                    </td>
                    <td className="px-5 py-4 font-semibold text-white text-sm">—</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-12 text-gray-500">無客戶資料</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <div className="md:hidden bg-surface-800 border border-surface-700 rounded-2xl divide-y divide-surface-700">
            {filtered.map(c => (
              <div key={c.id} className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-surface-700 rounded-2xl flex items-center justify-center font-bold">
                  {(c.name || '?')[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{c.name}</div>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                    {c.email && <span className="flex items-center gap-1"><User size={10} /> {c.email}</span>}
                    {c.phone && <span className="flex items-center gap-1"><Phone size={10} /> {c.phone}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-white text-sm flex items-center gap-1 justify-end">
                    <Package size={12} /> {c.total_orders ?? 0} 筆
                  </div>
                  <div className="text-gray-400 text-xs flex items-center gap-1 justify-end mt-0.5">
                    <Clock size={9} /> {new Date(c.created_at).toLocaleDateString('zh-TW')}
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="py-12 text-center text-gray-500 text-sm">無客戶資料</div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
