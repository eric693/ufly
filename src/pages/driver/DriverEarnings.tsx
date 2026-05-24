import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, Star, Package, DollarSign, ChevronLeft, Loader2 } from 'lucide-react'
import api from '../../lib/api'

interface Earnings {
  total_orders: number
  gross: number
  driver_share: number
  avg_rating: number
  rating_count: number
  by_day: Record<string, number>
  recent: { id: string; totalFee: number; createdAt: string; serviceType: string }[]
}

export default function DriverEarnings() {
  const [data, setData] = useState<Earnings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/drivers/me/earnings')
      .then(r => setData(r.data))
      .catch(() => setError('無法載入收益資料'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 size={28} className="animate-spin text-paper-400" />
    </div>
  )
  if (error) return (
    <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>
  )
  if (!data) return null

  // Last 7 days bar chart data
  const days: { date: string; label: string; amount: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const label = `${d.getMonth() + 1}/${d.getDate()}`
    days.push({ date: key, label, amount: data.by_day[key] || 0 })
  }
  const maxAmount = Math.max(...days.map(d => d.amount), 1)

  return (
    <div className="min-h-screen bg-paper-50">
      <div className="bg-white border-b border-paper-200 px-4 py-4 flex items-center gap-3">
        <Link to="/driver" className="p-2 hover:bg-paper-100 rounded-xl transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="font-bold text-lg">我的收益</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-paper-200 p-4">
            <div className="flex items-center gap-2 text-paper-500 text-xs mb-2">
              <DollarSign size={14} /> 累計收益（我的份）
            </div>
            <div className="text-2xl font-bold">NT${data.driver_share.toLocaleString()}</div>
            <div className="text-paper-400 text-xs mt-1">總金額 NT${data.gross.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-2xl border border-paper-200 p-4">
            <div className="flex items-center gap-2 text-paper-500 text-xs mb-2">
              <Package size={14} /> 完成訂單
            </div>
            <div className="text-2xl font-bold">{data.total_orders}</div>
            <div className="text-paper-400 text-xs mt-1">筆</div>
          </div>
          <div className="bg-white rounded-2xl border border-paper-200 p-4">
            <div className="flex items-center gap-2 text-paper-500 text-xs mb-2">
              <Star size={14} /> 平均評分
            </div>
            <div className="text-2xl font-bold">{data.avg_rating.toFixed(1)}</div>
            <div className="text-paper-400 text-xs mt-1">{data.rating_count} 則評價</div>
          </div>
          <div className="bg-white rounded-2xl border border-paper-200 p-4">
            <div className="flex items-center gap-2 text-paper-500 text-xs mb-2">
              <TrendingUp size={14} /> 抽成比例
            </div>
            <div className="text-2xl font-bold">80%</div>
            <div className="text-paper-400 text-xs mt-1">平台抽 20%</div>
          </div>
        </div>

        {/* 7-day bar chart */}
        <div className="bg-white rounded-2xl border border-paper-200 p-4">
          <div className="text-sm font-semibold mb-4">最近 7 天收益</div>
          <div className="flex items-end gap-1.5 h-32">
            {days.map(d => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-indigo-100 rounded-t-md relative" style={{ height: `${Math.round((d.amount / maxAmount) * 100)}%`, minHeight: d.amount > 0 ? 4 : 2 }}>
                  {d.amount > 0 && (
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-indigo-700 font-medium whitespace-nowrap">
                      {d.amount}
                    </div>
                  )}
                </div>
                <div className="text-[10px] text-paper-400">{d.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent orders */}
        {data.recent.length > 0 && (
          <div className="bg-white rounded-2xl border border-paper-200">
            <div className="px-4 pt-4 pb-2 text-sm font-semibold">最近訂單</div>
            <div className="divide-y divide-paper-100">
              {data.recent.map(o => (
                <div key={o.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{o.id}</div>
                    <div className="text-paper-400 text-xs mt-0.5">
                      {new Date(o.createdAt).toLocaleDateString('zh-TW')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-sm">NT${Math.round(o.totalFee * 0.8)}</div>
                    <div className="text-paper-400 text-xs">共 NT${o.totalFee}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
