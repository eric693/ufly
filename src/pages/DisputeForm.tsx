import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { AlertTriangle, ChevronLeft, CheckCircle, Loader2 } from 'lucide-react'
import api from '../lib/api'
import { useI18n } from '../contexts/I18nContext'

const REASONS = ['費用爭議', '物品損壞', '服務品質', '配送延誤', '其他']
const REASON_KEYS = ['fee', 'damage', 'quality', 'delay', 'other'] as const

export default function DisputeForm() {
  const [params]       = useSearchParams()
  const orderId        = params.get('order') || ''
  const { t }          = useI18n()
  const [manualOrderId, setManualOrderId] = useState('')
  const effectiveOrderId = orderId || manualOrderId
  const [reason, setReason]       = useState('')
  const [description, setDesc]    = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]  = useState(false)
  const [error, setError]          = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!reason) { setError('請選擇爭議原因'); return }
    if (description.trim().length < 20) { setError('說明至少需要 20 個字'); return }
    setSubmitting(true)
    setError('')
    try {
      await api.post('/disputes', { order_id: effectiveOrderId, reason, description: description.trim() })
      setSubmitted(true)
    } catch (e: any) {
      setError(e?.response?.data?.error || '提交失敗，請稍後再試')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <CheckCircle size={48} className="text-emerald-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">{t.dispute.title}</h2>
        <p className="text-paper-500 mb-6">{t.dispute.successMsg}</p>
        <Link to="/history" className="btn-primary">{t.common.back}</Link>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/history" className="p-2 hover:bg-paper-100 rounded-xl transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold">{t.dispute.title}</h1>
          {orderId && <p className="text-paper-500 text-sm mt-0.5">訂單 {orderId}</p>}
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {/* Order ID (if not pre-filled) */}
        {!params.get('order') && (
          <div className="card">
            <label className="block text-sm font-semibold mb-2">訂單編號</label>
            <input
              value={manualOrderId}
              onChange={e => setManualOrderId(e.target.value)}
              placeholder="輸入訂單編號"
              className="input w-full"
            />
          </div>
        )}

        {/* Reason */}
        <div className="card">
          <label className="block text-sm font-semibold mb-3">{t.dispute.reason}</label>
          <div className="grid grid-cols-1 gap-2">
            {REASONS.map((r, i) => (
              <button
                key={r} type="button"
                onClick={() => setReason(r)}
                className={`flex items-center gap-3 p-3 rounded-2xl border text-sm font-medium text-left transition-all
                  ${reason === r
                    ? 'border-paper-900 bg-paper-900 text-white'
                    : 'border-paper-200 hover:border-paper-400 text-paper-700'
                  }`}
              >
                <AlertTriangle size={14} className={reason === r ? 'text-white' : 'text-paper-400'} />
                {t.dispute.reasons[REASON_KEYS[i]]}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="card">
          <label className="block text-sm font-semibold mb-2">{t.dispute.description}</label>
          <textarea
            value={description}
            onChange={e => setDesc(e.target.value)}
            placeholder={t.dispute.placeholder}
            rows={5}
            maxLength={1000}
            className="input w-full resize-none"
          />
          <div className="text-right text-xs text-paper-400 mt-1">{description.length} / 1000</div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-3 text-sm">{error}</div>
        )}

        <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
          {submitting ? <Loader2 size={16} className="animate-spin mx-auto" /> : t.dispute.submit}
        </button>
      </form>
    </div>
  )
}
