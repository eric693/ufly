import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Webhook, Plus, Trash2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp, RefreshCw, Copy, Check, Loader2 } from 'lucide-react'
import api from '../../lib/api'
import { useI18n } from '../../contexts/I18nContext'

interface Endpoint {
  id: string; url: string; events: string; active: boolean
  delivery_count: number; createdAt: string
}
interface Delivery {
  id: string; event: string; statusCode: number | null
  deliveredAt: string | null; createdAt: string
}

export default function EnterpriseWebhooks() {
  const { t }                            = useI18n()
  const [endpoints, setEndpoints]        = useState<Endpoint[]>([])
  const [loading, setLoading]            = useState(true)
  const [adding, setAdding]              = useState(false)
  const [newUrl, setNewUrl]              = useState('')
  const [newEvents, setNewEvents]        = useState('order.status_changed')
  const [submitting, setSubmitting]      = useState(false)
  const [expandedId, setExpandedId]      = useState<string | null>(null)
  const [deliveries, setDeliveries]      = useState<Record<string, Delivery[]>>({})
  const [secret, setSecret]              = useState<{ id: string; value: string } | null>(null)
  const [copied, setCopied]              = useState(false)
  const [error, setError]                = useState('')

  useEffect(() => {
    api.get('/webhooks/mine')
      .then(r => setEndpoints(r.data))
      .catch(() => setError('無法載入 Webhook 列表'))
      .finally(() => setLoading(false))
  }, [])

  async function addEndpoint() {
    if (!newUrl.trim()) { setError('請填寫 URL'); return }
    setSubmitting(true); setError('')
    try {
      const { data } = await api.post('/webhooks/mine', { url: newUrl.trim(), events: newEvents })
      setSecret({ id: data.id, value: data.secret })
      setEndpoints(prev => [{ ...data, delivery_count: 0 }, ...prev])
      setNewUrl(''); setAdding(false)
    } catch (e: any) {
      setError(e?.response?.data?.error || '新增失敗')
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleActive(ep: Endpoint) {
    try {
      await api.patch(`/webhooks/mine/${ep.id}`, { active: !ep.active })
      setEndpoints(prev => prev.map(e => e.id === ep.id ? { ...e, active: !e.active } : e))
    } catch { alert('操作失敗') }
  }

  async function deleteEndpoint(id: string) {
    if (!confirm('確定要刪除此 Webhook 嗎？')) return
    await api.delete(`/webhooks/mine/${id}`).catch(() => {})
    setEndpoints(prev => prev.filter(e => e.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  async function rotateSecret(id: string) {
    if (!confirm('重新產生金鑰將使舊金鑰失效，確定繼續？')) return
    const { data } = await api.post(`/webhooks/mine/${id}/rotate-secret`)
    setSecret({ id, value: data.secret })
  }

  async function loadDeliveries(id: string) {
    if (deliveries[id]) return
    const { data } = await api.get(`/webhooks/mine/${id}/deliveries`)
    setDeliveries(prev => ({ ...prev, [id]: data }))
  }

  function copySecret() {
    if (!secret) return
    navigator.clipboard.writeText(secret.value).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) return (
    <div className="flex items-center justify-center h-48"><Loader2 size={28} className="animate-spin text-paper-400" /></div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/profile" className="p-2 hover:bg-paper-100 rounded-xl transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{t.webhook.title}</h1>
          <p className="text-paper-500 text-sm mt-0.5">{t.webhook.hint}</p>
        </div>
        <button onClick={() => { setAdding(v => !v); setError('') }}
          className="flex items-center gap-1.5 btn-primary py-2 text-sm">
          <Plus size={14} /> {t.webhook.add}
        </button>
      </div>

      {/* New endpoint form */}
      {adding && (
        <div className="card mb-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-paper-500 mb-1">{t.webhook.url}</label>
            <input value={newUrl} onChange={e => setNewUrl(e.target.value)}
              placeholder="https://your-server.com/webhook"
              className="input w-full font-mono text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-paper-500 mb-1">{t.webhook.events}</label>
            <select value={newEvents} onChange={e => setNewEvents(e.target.value)} className="input w-full text-sm">
              <option value="order.status_changed">order.status_changed</option>
              <option value="order.created">order.created</option>
              <option value="order.created,order.status_changed">全部事件</option>
            </select>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button onClick={addEndpoint} disabled={submitting}
              className="btn-primary flex-1 py-2 text-sm">
              {submitting ? <Loader2 size={14} className="animate-spin mx-auto" /> : t.common.confirm}
            </button>
            <button onClick={() => setAdding(false)} className="btn-secondary flex-1 py-2 text-sm">{t.common.cancel}</button>
          </div>
        </div>
      )}

      {/* Secret reveal */}
      {secret && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
          <div className="text-amber-800 text-sm font-semibold mb-2">⚠ 請立即複製簽名金鑰（離開後不再顯示）</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs font-mono break-all">
              {secret.value}
            </code>
            <button onClick={copySecret} className="p-2 rounded-xl hover:bg-amber-100 transition-colors">
              {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} className="text-amber-700" />}
            </button>
          </div>
          <button onClick={() => setSecret(null)} className="mt-2 text-xs text-amber-600 hover:underline">
            已複製，關閉
          </button>
        </div>
      )}

      {endpoints.length === 0 && !adding && (
        <div className="card text-center py-12">
          <Webhook size={32} className="text-paper-300 mx-auto mb-2" />
          <p className="text-paper-500">{t.webhook.noEndpoints}</p>
        </div>
      )}

      <div className="space-y-3">
        {endpoints.map(ep => (
          <div key={ep.id} className="card overflow-hidden p-0">
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm text-paper-900 truncate">{ep.url}</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs bg-paper-100 text-paper-600 px-2 py-0.5 rounded-lg font-mono">{ep.events}</span>
                    <span className={`text-xs font-medium ${ep.active ? 'text-emerald-600' : 'text-paper-400'}`}>
                      {ep.active ? t.webhook.active : t.webhook.inactive}
                    </span>
                    <span className="text-xs text-paper-400">{ep.delivery_count} 次傳送</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => toggleActive(ep)} className="p-1.5 rounded-xl hover:bg-paper-100 transition-colors text-paper-500">
                    {ep.active ? <ToggleRight size={18} className="text-emerald-500" /> : <ToggleLeft size={18} />}
                  </button>
                  <button onClick={() => rotateSecret(ep.id)} className="p-1.5 rounded-xl hover:bg-paper-100 transition-colors text-paper-500" title="重新產生金鑰">
                    <RefreshCw size={14} />
                  </button>
                  <button onClick={() => deleteEndpoint(ep.id)} className="p-1.5 rounded-xl hover:bg-red-50 transition-colors text-paper-500 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                  <button
                    onClick={() => {
                      if (expandedId === ep.id) { setExpandedId(null) }
                      else { setExpandedId(ep.id); loadDeliveries(ep.id) }
                    }}
                    className="p-1.5 rounded-xl hover:bg-paper-100 transition-colors text-paper-500">
                    {expandedId === ep.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Delivery logs */}
            {expandedId === ep.id && (
              <div className="border-t border-paper-100">
                <div className="px-4 py-2 text-xs font-semibold text-paper-500 uppercase tracking-wider bg-paper-50">
                  {t.webhook.deliveries}
                </div>
                {!deliveries[ep.id] ? (
                  <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-paper-400" /></div>
                ) : deliveries[ep.id].length === 0 ? (
                  <div className="px-4 py-4 text-sm text-paper-400">尚無傳送記錄</div>
                ) : (
                  <div className="divide-y divide-paper-100 max-h-60 overflow-y-auto">
                    {deliveries[ep.id].map(d => (
                      <div key={d.id} className="px-4 py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-mono text-paper-600">{d.event}</span>
                          <span className="ml-2 text-paper-400">{new Date(d.createdAt).toLocaleString('zh-TW')}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full font-medium ${
                          d.statusCode && d.statusCode >= 200 && d.statusCode < 300
                            ? 'bg-emerald-100 text-emerald-700'
                            : d.statusCode
                            ? 'bg-red-100 text-red-700'
                            : 'bg-paper-100 text-paper-500'
                        }`}>
                          {d.statusCode ?? '待送'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
