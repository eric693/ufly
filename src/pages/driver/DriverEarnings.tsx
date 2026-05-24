import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp, Star, Package, DollarSign, ChevronLeft, ChevronRight,
  Loader2, Clock, MapPin, Calendar,
} from 'lucide-react'
import api from '../../lib/api'
import { useI18n } from '../../contexts/I18nContext'

interface Trip {
  id: string; totalFee: number; createdAt: string; serviceType: string
  distance: number; duration: number; pickupAddress: string; deliveryAddress: string
}
interface EarningsData {
  total_orders: number; gross: number; driver_share: number
  avg_rating: number; rating_count: number
  by_day: Record<string, number>
  trips: Trip[]
  available_months: string[]  // ['2025-01', '2025-02', ...]
  period: { year: number; month: number | null }
}

const SVC_LABELS: Record<string, string> = { delivery: '配送', errands: '跑腿', moving: '搬運' }

export default function DriverEarnings() {
  const { t } = useI18n()
  const now   = new Date()
  const [year, setYear]    = useState(now.getFullYear())
  const [month, setMonth]  = useState(now.getMonth() + 1)
  const [allTime, setAllTime] = useState(false)
  const [data, setData]    = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]  = useState('')

  const fetchData = useCallback(() => {
    setLoading(true)
    const params = allTime ? '' : `?year=${year}&month=${month}`
    api.get(`/drivers/me/earnings${params}`)
      .then(r => setData(r.data))
      .catch(() => setError('無法載入收益資料'))
      .finally(() => setLoading(false))
  }, [year, month, allTime])

  useEffect(() => { fetchData() }, [fetchData])

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (year === now.getFullYear() && month === now.getMonth() + 1) return
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  if (error) return (
    <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>
  )

  // Chart data: for monthly view show all days of month; for all-time show last 30 days
  const chartDays: { label: string; key: string; amount: number }[] = []
  if (data) {
    if (allTime) {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i)
        const key = d.toISOString().slice(0, 10)
        chartDays.push({ key, label: `${d.getDate()}`, amount: data.by_day[key] || 0 })
      }
    } else {
      const daysInMonth = new Date(year, month, 0).getDate()
      for (let i = 1; i <= daysInMonth; i++) {
        const key = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`
        chartDays.push({ key, label: String(i), amount: data.by_day[key] || 0 })
      }
    }
  }
  const maxAmount = Math.max(...chartDays.map(d => d.amount), 1)

  return (
    <div className="min-h-screen bg-paper-50">
      {/* Header */}
      <div className="bg-white border-b border-paper-200 px-4 py-4 flex items-center gap-3">
        <Link to="/driver" className="p-2 hover:bg-paper-100 rounded-xl transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="font-bold text-lg flex-1">{t.earnings.title}</h1>
        <div className="flex gap-1 bg-paper-100 rounded-xl p-1">
          <button onClick={() => setAllTime(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
              ${!allTime ? 'bg-white shadow-sm text-paper-900' : 'text-paper-500'}`}>
            {t.earnings.monthly}
          </button>
          <button onClick={() => setAllTime(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
              ${allTime ? 'bg-white shadow-sm text-paper-900' : 'text-paper-500'}`}>
            {t.earnings.allTime}
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Month picker */}
        {!allTime && (
          <div className="flex items-center justify-center gap-4">
            <button onClick={prevMonth} className="p-2 hover:bg-paper-100 rounded-xl transition-colors">
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-2 font-bold text-lg">
              <Calendar size={18} className="text-paper-400" />
              {year} 年 {month} 月
            </div>
            <button onClick={nextMonth} className="p-2 hover:bg-paper-100 rounded-xl transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 size={28} className="animate-spin text-paper-400" />
          </div>
        ) : data && (
          <>
            {/* Stats cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl border border-paper-200 p-4">
                <div className="flex items-center gap-2 text-paper-500 text-xs mb-2">
                  <DollarSign size={14} /> {t.earnings.cumulative}
                </div>
                <div className="text-2xl font-bold">NT${data.driver_share.toLocaleString()}</div>
                <div className="text-paper-400 text-xs mt-1">總額 NT${data.gross.toLocaleString()}</div>
              </div>
              <div className="bg-white rounded-2xl border border-paper-200 p-4">
                <div className="flex items-center gap-2 text-paper-500 text-xs mb-2">
                  <Package size={14} /> {t.earnings.completed}
                </div>
                <div className="text-2xl font-bold">{data.total_orders}</div>
                <div className="text-paper-400 text-xs mt-1">筆</div>
              </div>
              <div className="bg-white rounded-2xl border border-paper-200 p-4">
                <div className="flex items-center gap-2 text-paper-500 text-xs mb-2">
                  <Star size={14} /> {t.earnings.rating}
                </div>
                <div className="text-2xl font-bold">{data.avg_rating.toFixed(1)}</div>
                <div className="text-paper-400 text-xs mt-1">{data.rating_count} 則評價</div>
              </div>
              <div className="bg-white rounded-2xl border border-paper-200 p-4">
                <div className="flex items-center gap-2 text-paper-500 text-xs mb-2">
                  <TrendingUp size={14} /> {t.earnings.commission}
                </div>
                <div className="text-2xl font-bold">80%</div>
                <div className="text-paper-400 text-xs mt-1">平台抽 20%</div>
              </div>
            </div>

            {/* Settlement banner */}
            <div className={`rounded-2xl border p-3 flex items-center gap-3 text-sm
              ${allTime || data.total_orders === 0
                ? 'border-paper-200 bg-paper-50 text-paper-400'
                : 'border-indigo-200 bg-indigo-50 text-indigo-700'}`}>
              <DollarSign size={16} />
              <div className="flex-1">
                <span className="font-semibold">{t.earnings.settlement}：</span>
                {allTime || data.total_orders === 0
                  ? t.earnings.unsettled
                  : `NT${data.driver_share.toLocaleString()} ${t.earnings.unsettled}`}
              </div>
              {!allTime && data.total_orders > 0 && (
                <span className="text-xs text-indigo-500">每月 5 日結算</span>
              )}
            </div>

            {/* Bar chart */}
            <div className="bg-white rounded-2xl border border-paper-200 p-4">
              <div className="text-sm font-semibold mb-4">{t.earnings.chart}</div>
              <div className="flex items-end gap-0.5 h-28 overflow-x-auto">
                {chartDays.map(d => (
                  <div key={d.key} className="flex flex-col items-center gap-1 min-w-[14px] flex-1">
                    <div
                      className={`w-full rounded-t-sm transition-all ${d.amount > 0 ? 'bg-indigo-400' : 'bg-paper-100'}`}
                      style={{ height: `${Math.round((d.amount / maxAmount) * 100)}%`, minHeight: d.amount > 0 ? 3 : 2 }}
                    />
                    {chartDays.length <= 14 && (
                      <div className="text-[9px] text-paper-300">{d.label}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Trip list */}
            <div className="bg-white rounded-2xl border border-paper-200">
              <div className="px-4 pt-4 pb-2 text-sm font-semibold">{t.earnings.trips}</div>
              {data.trips.length === 0 ? (
                <div className="px-4 pb-4 text-paper-400 text-sm">{t.earnings.noTrips}</div>
              ) : (
                <div className="divide-y divide-paper-100">
                  {data.trips.map(o => (
                    <div key={o.id} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-semibold text-paper-600">{o.id}</span>
                          <span className="text-xs bg-paper-100 text-paper-600 px-1.5 py-0.5 rounded-md">
                            {SVC_LABELS[o.serviceType] || o.serviceType}
                          </span>
                        </div>
                        <span className="font-bold text-sm">NT${Math.round(o.totalFee * 0.8)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-paper-400 mt-1">
                        <MapPin size={10} />
                        <span className="truncate max-w-[180px]">{o.pickupAddress}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex items-center gap-1 text-xs text-paper-400">
                          <Clock size={10} /> {o.duration} 分鐘
                        </div>
                        <div className="text-xs text-paper-400">{o.distance} km</div>
                        <div className="ml-auto text-xs text-paper-400">
                          {new Date(o.createdAt).toLocaleDateString('zh-TW')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Available months quick links */}
            {data.available_months.length > 1 && (
              <div className="bg-white rounded-2xl border border-paper-200 p-4">
                <div className="text-xs font-semibold text-paper-500 uppercase tracking-wider mb-3">快速跳轉</div>
                <div className="flex flex-wrap gap-2">
                  {data.available_months.slice(0, 12).map(ym => {
                    const [y, m] = ym.split('-').map(Number)
                    const active = !allTime && y === year && m === month
                    return (
                      <button key={ym} onClick={() => { setAllTime(false); setYear(y); setMonth(m) }}
                        className={`text-xs px-2.5 py-1 rounded-xl font-medium transition-colors
                          ${active ? 'bg-paper-900 text-white' : 'bg-paper-100 text-paper-600 hover:bg-paper-200'}`}>
                        {y}/{String(m).padStart(2, '0')}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
