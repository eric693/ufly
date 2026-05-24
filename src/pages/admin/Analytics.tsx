import { useState, useEffect } from 'react'
import { TrendingUp, Package, Clock, ArrowUpRight, Loader2 } from 'lucide-react'
import api from '../../lib/api'

const SERVICE_LABEL: Record<string, string> = {
  document: '文件急送', delivery: '物品配送', purchase: '即時代購',
  errand: '即時代辦', business: '商務急件', custom: '客製任務',
  key: '鑰匙急送', ticket: '票券文件', gift: '禮品配送', designated: '指定送達',
}
const SERVICE_COLORS = ['#ffffff', '#3b82f6', '#a855f7', '#f59e0b', '#64748b', '#22c55e', '#ef4444']

function BarChart({
  data, labels, color = '#ffffff', height = 120,
  formatValue = (v: number) => String(v),
}: {
  data: number[]; labels: string[]; color?: string; height?: number
  formatValue?: (v: number) => string
}) {
  const max = Math.max(...data, 1)
  const [hovered, setHovered] = useState<number | null>(null)
  return (
    <div className="relative" style={{ height }}>
      <div className="flex items-end gap-1 h-full">
        {data.map((v, i) => {
          const barH = (v / max) * (height - 24)
          const isHov = hovered === i
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative"
              onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
              {isHov && (
                <div className="absolute -top-7 bg-surface-600 text-white text-xs px-2 py-1 rounded-lg
                                whitespace-nowrap z-10 pointer-events-none left-1/2 -translate-x-1/2">
                  {formatValue(v)}
                </div>
              )}
              <div className="w-full rounded-t-md transition-all duration-150"
                style={{ height: barH, background: isHov ? color : color + 'aa', minHeight: v > 0 ? 3 : 0 }} />
            </div>
          )
        })}
      </div>
      <div className="flex gap-1 mt-1">
        {labels.map((l, i) => (
          <div key={i} className="flex-1 text-center text-gray-400 text-[10px]"
            style={{ display: labels.length > 12 && i % 3 !== 0 ? 'none' : 'block' }}>
            {l}
          </div>
        ))}
      </div>
    </div>
  )
}

function LineChart({ data, color = '#ffffff', height = 100 }: { data: number[]; color?: string; height?: number }) {
  if (data.length < 2) return null
  const max = Math.max(...data, 1); const min = Math.min(...data); const range = max - min || 1
  const w = 600; const h = height
  const points = data.map((v, i) => ({ x: (i / (data.length - 1)) * w, y: h - ((v - min) / range) * (h - 10) - 5 }))
  const polyline = points.map(p => `${p.x},${p.y}`).join(' ')
  const area = `M${points[0].x},${h} ` + points.map(p => `L${p.x},${p.y}`).join(' ') + ` L${points[points.length-1].x},${h} Z`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#lineGrad)" />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />)}
    </svg>
  )
}

type Period = '7d' | '30d' | '90d'
const PERIOD_DAYS: Record<Period, number> = { '7d': 7, '30d': 30, '90d': 90 }

interface DayData { date: string; label: string; revenue: number; orders: number }
interface ServiceData { service_type: string; count: number; pct: number }

export default function Analytics() {
  const [period, setPeriod]         = useState<Period>('7d')
  const [daily, setDaily]           = useState<DayData[]>([])
  const [hourly, setHourly]         = useState<number[]>(Array(24).fill(0))
  const [services, setServices]     = useState<ServiceData[]>([])
  const [loadingDaily, setLoadingDaily] = useState(true)
  const [loadingOther, setLoadingOther] = useState(true)

  useEffect(() => {
    setLoadingDaily(true)
    api.get(`/admin/analytics/daily?days=${PERIOD_DAYS[period]}`)
      .then(r => setDaily(r.data))
      .catch(() => {})
      .finally(() => setLoadingDaily(false))
  }, [period])

  useEffect(() => {
    Promise.all([
      api.get('/admin/analytics/hourly'),
      api.get('/admin/analytics/services'),
    ]).then(([h, s]) => {
      setHourly(h.data)
      setServices(s.data)
    }).catch(() => {}).finally(() => setLoadingOther(false))
  }, [])

  const revenues    = daily.map(d => d.revenue)
  const orders      = daily.map(d => d.orders)
  const labels      = daily.map(d => d.label)
  const totalRevenue = revenues.reduce((a, b) => a + b, 0)
  const totalOrders  = orders.reduce((a, b) => a + b, 0)
  const peakHour     = hourly.indexOf(Math.max(...hourly))

  const serviceDist = services.map((s, i) => ({
    label: SERVICE_LABEL[s.service_type] || s.service_type,
    pct: s.pct,
    color: SERVICE_COLORS[i % SERVICE_COLORS.length],
    count: s.count,
  }))
  const totalServicePct = serviceDist.reduce((a, b) => a + b.pct, 0)
  if (totalServicePct < 100 && serviceDist.length > 0) {
    serviceDist[serviceDist.length - 1].pct += 100 - totalServicePct
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">數據分析</h1>
        <div className="flex gap-1 bg-surface-800 border border-surface-700 rounded-xl p-1">
          {(['7d', '30d', '90d'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${period === p ? 'bg-surface-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              {p === '7d' ? '近7天' : p === '30d' ? '近30天' : '近90天'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: '總營收',   value: `NT$${totalRevenue.toLocaleString()}`,                                   change: '', icon: TrendingUp,   color: 'text-white bg-white/8' },
          { label: '總訂單',   value: `${totalOrders} 筆`,                                                     change: '', icon: Package,       color: 'text-blue-400 bg-blue-400/10' },
          { label: '平均客單', value: totalOrders ? `NT$${Math.round(totalRevenue / totalOrders)}` : 'NT$—',   change: '', icon: ArrowUpRight,  color: 'text-purple-400 bg-purple-400/10' },
          { label: '尖峰時段', value: hourly.some(v => v > 0) ? `${peakHour}:00` : '—',                       change: '', icon: Clock,         color: 'text-orange-400 bg-orange-400/10' },
        ].map(c => (
          <div key={c.label} className="bg-surface-800 border border-surface-700 rounded-2xl p-4">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${c.color}`}>
              <c.icon size={16} />
            </div>
            <div className="text-xl font-black">{c.value}</div>
            <div className="text-gray-400 text-xs mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-sm">每日營收趨勢</h2>
              <div className="text-gray-400 text-xs mt-0.5">NT${totalRevenue.toLocaleString()} / {period === '7d' ? '本週' : period === '30d' ? '近30天' : '近90天'}</div>
            </div>
          </div>
          {loadingDaily ? (
            <div className="flex items-center justify-center h-28"><Loader2 size={20} className="animate-spin text-gray-500" /></div>
          ) : (
            <>
              <LineChart data={revenues} color="#22c55e" height={100} />
              <div className="flex gap-1 mt-2">
                {labels.map((l, i) => (
                  <div key={i} className="flex-1 text-center text-gray-400 text-[10px]"
                    style={{ display: labels.length > 12 && i % Math.ceil(labels.length / 10) !== 0 ? 'none' : 'block' }}>
                    {l}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-sm">每日訂單量</h2>
              <div className="text-gray-400 text-xs mt-0.5">{totalOrders} 筆</div>
            </div>
          </div>
          {loadingDaily ? (
            <div className="flex items-center justify-center h-32"><Loader2 size={20} className="animate-spin text-gray-500" /></div>
          ) : (
            <BarChart data={orders} labels={labels} color="#3b82f6" height={130} formatValue={v => `${v} 筆`} />
          )}
        </div>

        <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5">
          <div className="mb-4">
            <h2 className="font-bold text-sm">24 小時訂單分布</h2>
            <div className="text-gray-400 text-xs mt-0.5">
              {hourly.some(v => v > 0) ? `尖峰時段：${peakHour}:00–${peakHour + 1}:00` : '暫無資料'}
            </div>
          </div>
          {loadingOther ? (
            <div className="flex items-center justify-center h-28"><Loader2 size={20} className="animate-spin text-gray-500" /></div>
          ) : (
            <BarChart data={hourly} labels={Array.from({length: 24}, (_, i) => `${i}`)}
              color="#a855f7" height={120} formatValue={v => `${v} 筆`} />
          )}
        </div>

        <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5">
          <h2 className="font-bold text-sm mb-4">服務類型分布</h2>
          {loadingOther ? (
            <div className="flex items-center justify-center h-28"><Loader2 size={20} className="animate-spin text-gray-500" /></div>
          ) : serviceDist.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-8">暫無訂單資料</div>
          ) : (
            <>
              <div className="flex rounded-full overflow-hidden h-4 mb-5">
                {serviceDist.map(s => (
                  <div key={s.label} className="transition-all" style={{ width: `${s.pct}%`, background: s.color }} title={`${s.label} ${s.pct}%`} />
                ))}
              </div>
              <div className="space-y-2.5">
                {serviceDist.map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                      <span className="text-sm text-gray-300">{s.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-surface-700 rounded-full h-1.5 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: s.color }} />
                      </div>
                      <span className="text-sm font-semibold w-8 text-right">{s.pct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
