import { useState, useEffect } from 'react'
import { Search, Plus, Phone, Star, MapPin, TrendingUp, Loader2, X, Trash2, Edit2, Check, AlertCircle } from 'lucide-react'
import api from '../../lib/api'

const STATUS_LABEL: Record<string, string> = { online: '在線', busy: '任務中', offline: '離線' }
const STATUS_CLASS: Record<string, string> = {
  online: 'admin-badge-green', busy: 'admin-badge-yellow', offline: 'admin-badge-gray',
}

type DriverForm = { name: string; phone: string; area: string; email: string }
const EMPTY_FORM: DriverForm = { name: '', phone: '', area: '', email: '' }

export default function AdminDrivers() {
  const [drivers, setDrivers]   = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState<'all' | 'online' | 'busy' | 'offline'>('all')
  const [updating, setUpdating] = useState<string | null>(null)

  // modal state
  const [modal, setModal]       = useState<'add' | 'edit' | null>(null)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [form, setForm]         = useState<DriverForm>(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = () => {
    setLoading(true); setError('')
    api.get('/admin/drivers')
      .then(r => setDrivers(r.data || []))
      .catch((e: any) => setError(e?.response?.data?.error || '載入失敗，請重試'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const filtered = drivers.filter(d => {
    if (filter !== 'all' && d.status !== filter) return false
    if (search && !d.name.includes(search) && !(d.phone || '').includes(search) && !(d.area || '').includes(search)) return false
    return true
  })

  const counts = {
    online:  drivers.filter(d => d.status === 'online').length,
    busy:    drivers.filter(d => d.status === 'busy').length,
    offline: drivers.filter(d => d.status === 'offline').length,
  }

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id)
    try {
      await api.put(`/admin/drivers/${id}/status`, { status })
      setDrivers(prev => prev.map(d => d.id === id ? { ...d, status } : d))
    } catch (e: any) {
      alert(e?.response?.data?.error || '更新失敗')
    } finally { setUpdating(null) }
  }

  const openAdd = () => { setForm(EMPTY_FORM); setModal('add') }
  const openEdit = (d: any) => { setForm({ name: d.name, phone: d.phone || '', area: d.area || '', email: d.email || '' }); setEditTarget(d); setModal('edit') }
  const closeModal = () => { setModal(null); setEditTarget(null) }

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (modal === 'add') {
        const { data } = await api.post('/admin/drivers', form)
        setDrivers(prev => [data, ...prev])
      } else if (modal === 'edit' && editTarget) {
        const { data } = await api.put(`/admin/drivers/${editTarget.id}`, form)
        setDrivers(prev => prev.map(d => d.id === editTarget.id ? data : d))
      }
      closeModal()
    } catch (e: any) {
      alert(e?.response?.data?.error || '儲存失敗，Email 或電話可能已重複')
    } finally { setSaving(false) }
  }

  const deleteDriver = async (id: string) => {
    if (!confirm('確定要刪除此夥伴？')) return
    setDeleting(id)
    try {
      await api.delete(`/admin/drivers/${id}`)
      setDrivers(prev => prev.filter(d => d.id !== id))
    } catch { /* ignore */ } finally { setDeleting(null) }
  }

  return (
    <div className="animate-fade-in space-y-5">
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
          <AlertCircle size={15} className="flex-shrink-0" /> {error}
        </div>
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">夥伴管理</h1>
        <button onClick={openAdd} className="btn-primary py-2 text-sm flex items-center gap-1.5">
          <Plus size={16} /> 新增夥伴
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(['online', 'busy', 'offline'] as const).map(s => (
          <div key={s} className="bg-surface-800 border border-surface-700 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className={s === 'online' ? 'status-online' : s === 'busy' ? 'status-busy' : 'status-offline'} />
              <span className="text-gray-300 text-sm">{STATUS_LABEL[s]}</span>
            </div>
            <div className="text-2xl font-black">{counts[s]}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-surface-800 border border-surface-700 rounded-xl px-3 py-2 flex-1">
          <Search size={16} className="text-gray-400" />
          <input className="bg-transparent text-sm placeholder-gray-500 text-white outline-none flex-1"
            placeholder="搜尋姓名、電話、區域..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'online', 'busy', 'offline'] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors
                ${filter === s ? 'bg-white text-black' : 'bg-surface-800 border border-surface-700 text-gray-300 hover:text-white'}`}>
              {s === 'all' ? '全部' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center"><Loader2 size={24} className="animate-spin text-gray-400 mx-auto" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(d => (
            <div key={d.id} className="bg-surface-800 border border-surface-700 rounded-2xl p-4 space-y-3 hover:border-surface-500 transition-colors">
              <div className="flex items-start justify-between">
                <div className="relative">
                  <div className="w-12 h-12 bg-surface-700 rounded-2xl flex items-center justify-center text-lg font-bold border border-surface-600">{d.name[0]}</div>
                  <div className={`absolute -bottom-0.5 -right-0.5 ${d.status === 'online' ? 'status-online' : d.status === 'busy' ? 'status-busy' : 'status-offline'}`} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={STATUS_CLASS[d.status] || 'admin-badge-gray'}>{STATUS_LABEL[d.status]}</span>
                  <button onClick={() => openEdit(d)} className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-surface-600 transition-colors">
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => deleteDriver(d.id)} disabled={deleting === d.id} className="p-1 rounded-lg text-gray-500 hover:text-red-400 hover:bg-surface-600 transition-colors disabled:opacity-40">
                    {deleting === d.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                </div>
              </div>
              <div>
                <div className="font-bold">{d.name}</div>
                <div className="flex items-center gap-1 text-gray-400 text-xs mt-0.5"><MapPin size={11} /> {d.area || '未設定'}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-surface-700 rounded-xl p-2.5">
                  <div className="flex items-center gap-1 text-yellow-400 text-xs mb-0.5"><Star size={10} className="fill-yellow-400" /> 評分</div>
                  <div className="font-bold text-sm">{d.rating?.toFixed(1)}</div>
                </div>
                <div className="bg-surface-700 rounded-xl p-2.5">
                  <div className="flex items-center gap-1 text-white text-xs mb-0.5"><TrendingUp size={10} /> 完成</div>
                  <div className="font-bold text-sm">{d.total_trips}</div>
                </div>
              </div>
              <div className="flex gap-2">
                {d.phone && (
                  <a href={`tel:${d.phone}`} className="flex-1 flex items-center justify-center gap-1.5 bg-surface-700 hover:bg-surface-600 rounded-xl py-2 text-xs text-gray-300 hover:text-white transition-colors">
                    <Phone size={13} /> 聯絡
                  </a>
                )}
                <select value={d.status} disabled={updating === d.id}
                  onChange={e => updateStatus(d.id, e.target.value)}
                  className="flex-1 bg-surface-700 hover:bg-surface-600 border-0 rounded-xl py-2 text-xs text-gray-300 outline-none cursor-pointer">
                  <option value="online">在線</option>
                  <option value="busy">任務中</option>
                  <option value="offline">離線</option>
                </select>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500 text-sm">無符合夥伴</div>
          )}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={closeModal} />
          <div className="relative w-full max-w-sm bg-surface-900 border border-surface-700 rounded-3xl p-6 shadow-2xl mx-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg">{modal === 'add' ? '新增夥伴' : '編輯夥伴'}</h3>
              <button onClick={closeModal} className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-surface-700 transition-colors"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">姓名 *</label>
                <input
                  className="w-full bg-surface-800 border border-surface-600 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-white transition-colors"
                  placeholder="例：王小明"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">電話</label>
                <input
                  className="w-full bg-surface-800 border border-surface-600 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-white transition-colors"
                  placeholder="0912-345-678"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">服務區域</label>
                <input
                  className="w-full bg-surface-800 border border-surface-600 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-white transition-colors"
                  placeholder="例：信義區"
                  value={form.area}
                  onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Google / LINE Email（供 OAuth 登入）</label>
                <input
                  type="email"
                  className="w-full bg-surface-800 border border-surface-600 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-white transition-colors"
                  placeholder="例：driver@gmail.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl bg-surface-700 hover:bg-surface-600 text-sm font-medium transition-colors">取消</button>
              <button
                onClick={save}
                disabled={saving || !form.name.trim()}
                className="flex-1 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-gray-200 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {modal === 'add' ? '新增' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
