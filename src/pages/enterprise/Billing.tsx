import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, FileText, Printer, Package, CheckCircle, Loader2, Building } from 'lucide-react'
import api from '../../lib/api'
import { useI18n } from '../../contexts/I18nContext'

interface BillingOrder {
  id: string; status: string; user_name: string
  pickup_address: string; delivery_address: string
  total_fee: number; created_at: string
}
interface BillingData {
  enterprise: { id: string; name: string; taxId: string | null; billingAddress: string | null; contactEmail: string | null }
  period: { year: number; month: number }
  order_count: number; completed_count: number; total_amount: number
  orders: BillingOrder[]
}

const STATUS_LABELS: Record<string, string> = {
  pending: '等待中', matching: '媒合中', accepted: '已接單', pickup: '取件中',
  delivering: '配送中', completed: '已送達', cancelled: '已取消',
}

export default function EnterpriseBilling() {
  const { t } = useI18n()
  const now   = new Date()
  const [year, setYear]    = useState(now.getFullYear())
  const [month, setMonth]  = useState(now.getMonth() + 1)
  const [data, setData]    = useState<BillingData | null>(null)
  const [entId, setEntId]  = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]  = useState('')
  const printRef           = useRef<HTMLDivElement>(null)

  // Fetch enterprise info first
  useEffect(() => {
    api.get('/enterprises/mine')
      .then(r => { if (r.data?.id) setEntId(r.data.id) })
      .catch(() => setError('無法取得企業資訊'))
  }, [])

  useEffect(() => {
    if (!entId) return
    setLoading(true)
    api.get(`/enterprises/${entId}/billing?year=${year}&month=${month}`)
      .then(r => setData(r.data))
      .catch(() => setError('無法載入帳單'))
      .finally(() => setLoading(false))
  }, [entId, year, month])

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    const now = new Date()
    if (year === now.getFullYear() && month === now.getMonth() + 1) return
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  function printBilling() {
    window.print()
  }

  if (error) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center text-red-500">{error}</div>
  )

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body > *:not(#billing-print-root) { display: none !important; }
          #billing-print-root { display: block !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div id="billing-print-root" className="max-w-3xl mx-auto px-4 py-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 no-print">
          <Link to="/profile" className="p-2 hover:bg-paper-100 rounded-xl transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{t.billing.title}</h1>
            {data?.enterprise && (
              <div className="flex items-center gap-1.5 text-paper-500 text-sm mt-0.5">
                <Building size={13} /> {data.enterprise.name}
              </div>
            )}
          </div>
          <button onClick={printBilling}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-paper-200 hover:border-paper-400 text-sm font-medium transition-colors">
            <Printer size={14} /> {t.billing.export}
          </button>
        </div>

        {/* Month picker */}
        <div className="flex items-center justify-center gap-4 mb-6 no-print">
          <button onClick={prevMonth} className="p-2 hover:bg-paper-100 rounded-xl transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div className="text-lg font-bold w-32 text-center">
            {year} 年 {month} 月
          </div>
          <button onClick={nextMonth} className="p-2 hover:bg-paper-100 rounded-xl transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Print header (visible in print only) */}
        <div className="hidden print:block mb-6 border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-bold">{data?.enterprise?.name} — 月結帳單</h1>
          <p className="text-gray-600">{year} 年 {month} 月</p>
          {data?.enterprise?.taxId && <p className="text-gray-500 text-sm">統編：{data.enterprise.taxId}</p>}
          {data?.enterprise?.billingAddress && <p className="text-gray-500 text-sm">帳單地址：{data.enterprise.billingAddress}</p>}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 size={28} className="animate-spin text-paper-400" />
          </div>
        ) : data && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="card text-center">
                <div className="flex justify-center mb-2"><Package size={20} className="text-paper-400" /></div>
                <div className="text-2xl font-bold">{data.order_count}</div>
                <div className="text-paper-500 text-xs mt-0.5">{t.billing.totalOrders}</div>
              </div>
              <div className="card text-center">
                <div className="flex justify-center mb-2"><CheckCircle size={20} className="text-emerald-500" /></div>
                <div className="text-2xl font-bold text-emerald-600">{data.completed_count}</div>
                <div className="text-paper-500 text-xs mt-0.5">{t.billing.completedOrders}</div>
              </div>
              <div className="card text-center">
                <div className="flex justify-center mb-2"><FileText size={20} className="text-indigo-500" /></div>
                <div className="text-2xl font-bold">NT${data.total_amount.toLocaleString()}</div>
                <div className="text-paper-500 text-xs mt-0.5">{t.billing.totalAmount}</div>
              </div>
            </div>

            {/* Order table */}
            {data.orders.length === 0 ? (
              <div className="card text-center py-12">
                <FileText size={32} className="text-paper-300 mx-auto mb-2" />
                <p className="text-paper-500">{t.billing.noData}</p>
              </div>
            ) : (
              <div className="card overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-paper-50 border-b border-paper-200">
                      <tr>
                        <th className="text-left px-4 py-3 text-paper-500 font-semibold text-xs uppercase tracking-wider">訂單號</th>
                        <th className="text-left px-4 py-3 text-paper-500 font-semibold text-xs uppercase tracking-wider">員工</th>
                        <th className="text-left px-4 py-3 text-paper-500 font-semibold text-xs uppercase tracking-wider">路線</th>
                        <th className="text-left px-4 py-3 text-paper-500 font-semibold text-xs uppercase tracking-wider">狀態</th>
                        <th className="text-right px-4 py-3 text-paper-500 font-semibold text-xs uppercase tracking-wider">金額</th>
                        <th className="text-right px-4 py-3 text-paper-500 font-semibold text-xs uppercase tracking-wider">日期</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-paper-100">
                      {data.orders.map(o => (
                        <tr key={o.id} className="hover:bg-paper-50 transition-colors">
                          <td className="px-4 py-3 font-mono font-semibold text-xs">{o.id}</td>
                          <td className="px-4 py-3 text-paper-700">{o.user_name}</td>
                          <td className="px-4 py-3 text-paper-500 max-w-[200px]">
                            <div className="truncate text-xs">{o.pickup_address}</div>
                            <div className="truncate text-xs">→ {o.delivery_address}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                              ${o.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                o.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                'bg-paper-100 text-paper-600'}`}>
                              {STATUS_LABELS[o.status] || o.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">NT${o.total_fee}</td>
                          <td className="px-4 py-3 text-right text-paper-400 text-xs">
                            {new Date(o.created_at).toLocaleDateString('zh-TW')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-paper-50 border-t border-paper-200">
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-sm font-bold">合計</td>
                        <td className="px-4 py-3 text-right font-bold">NT${data.total_amount.toLocaleString()}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
