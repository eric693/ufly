import { useState } from 'react'
import { TrendingUp, Package, Clock, ArrowUpRight } from 'lucide-react'

// Simple SVG chart components — no extra dependencies

const WEEKLY_REVENUE  = [4200, 5800, 4900, 6100, 5400, 6840, 7200]
const WEEKLY_ORDERS   = [28,   36,   31,   42,   38,   47,   51  ]
const WEEKLY_LABELS   = ['週一','週二','週三','週四','週五','週六','週日']

const HOURLY_ORDERS   = [2,1,0,0,1,3,8,14,18,22,19,16,21,24,20,17,22,19,14,11,8,6,4,3]
const HOUR_LABELS     = Array.from({ length: 24 }, (_, i) => `${i}`)

const SERVICE_DIST = [
  { label: '文件急送', pct: 34, color: '#ffffff' },
  { label: '物品配送', pct: 28, color: '#3b82f6' },
  { label: '即時代購', pct: 16, color: '#a855f7' },
  { label: '商務急件', pct: 12, color: '#f59e0b' },
  { label: '其他',     pct: 10, color: '#64748b' },
]

function BarChart({
  data, labels, color = '#ffffff', height = 120,
  formatValue = (v: number) => String(v),
}: {
  data: number[]
  labels: string[]
  color?: string
  height?: number
  formatValue?: (v: number) => string
}) {
  const max = Math.max(...data)
  const [hovered, setHovered] = useState<number | null>(null)

  return (
    <div className="relative" style={{ height }}>
      <div className="flex items-end gap-1 h-full">
        {data.map((v, i) => {
          const barH = max > 0 ? (v / max) * (height - 24) : 0
          const isHov = hovered === i
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}>
              {isHov && (
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-surface-600 text-white
                                text-xs px-2 py-1 rounded-lg whitespace-nowrap z-10 pointer-events-none"
                  style={{ left: `${(i / data.length) * 100 + 50 / data.length}%` }}>
                  {formatValue(v)}
                </div>
              )}
              <div
                className="w-full rounded-t-md transition-all duration-150"
                style={{
                  height: barH,
                  background: isHov ? color : color + 'aa',
                  minHeight: v > 0 ? 3 : 0,
                }}
              />
            </div>
          )
        })}
      </div>
      {/* X labels — show every nth */}
      <div className="flex gap-1 mt-1">
        {labels.map((l, i) => (
          <div key={i} className="flex-1 text-center text-surface-500 text-[10px]"
            style={{ display: labels.length > 12 && i % 3 !== 0 ? 'none' : 'block' }}>
            {l}
          </div>
        ))}
      </div>
    </div>
  )
}

function LineChart({ data, color = '#ffffff', height = 100 }: {
  data: number[]; color?: string; height?: number
}) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 600; const h = height

  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - ((v - min) / range) * (h - 10) - 5,
  }))

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ')
  const area = `M${points[0].x},${h} ` + points.map(p => `L${p.x},${p.y}`).join(' ') + ` L${points[points.length - 1].x},${h} Z`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#lineGrad)" />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />
      ))}
    </svg>
  )
}

type Period = '7d' | '30d' | '90d'

export default function Analytics() {
  const [period, setPeriod] = useState<Period>('7d')

  const totalRevenue = WEEKLY_REVENUE.reduce((a, b) => a + b, 0)
  const totalOrders  = WEEKLY_ORDERS.reduce((a, b) => a + b, 0)
  const peakHour     = HOURLY_ORDERS.indexOf(Math.max(...HOURLY_ORDERS))

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">數據分析</h1>
        <div className="flex gap-1 bg-surface-800 border border-surface-700 rounded-xl p-1">
          {(['7d','30d','90d'] as Period[]).map(p => (
            <button key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${period === p ? 'bg-surface-600 text-white' : 'text-surface-400 hover:text-white'}`}>
              {p === '7d' ? '近7天' : p === '30d' ? '近30天' : '近90天'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: '總營收',    value: `NT$${totalRevenue.toLocaleString()}`, change: '+18%', icon: TrendingUp, color: 'text-white bg-white/8' },
          { label: '總訂單',    value: `${totalOrders} 筆`,                   change: '+14%', icon: Package,    color: 'text-blue-400 bg-blue-400/10' },
          { label: '平均客單',  value: `NT$${Math.round(totalRevenue / totalOrders)}`, change: '+3%', icon: ArrowUpRight, color: 'text-purple-400 bg-purple-400/10' },
          { label: '尖峰時段',  value: `${peakHour}:00`,                       change: '穩定', icon: Clock, color: 'text-orange-400 bg-orange-400/10' },
        ].map(c => (
          <div key={c.label} className="bg-surface-800 border border-surface-700 rounded-2xl p-4">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${c.color}`}>
              <c.icon size={16} />
            </div>
            <div className="text-xl font-black">{c.value}</div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-surface-400 text-xs">{c.label}</span>
              <span className="text-white text-xs font-medium">{c.change}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Revenue line chart */}
        <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-sm">每日營收趨勢</h2>
              <div className="text-surface-400 text-xs mt-0.5">NT${totalRevenue.toLocaleString()} 本週</div>
            </div>
            <div className="text-white text-sm font-semibold flex items-center gap-1">
              <ArrowUpRight size={14} /> +18%
            </div>
          </div>
          <LineChart data={WEEKLY_REVENUE} color="#22c55e" height={100} />
          <div className="flex gap-1 mt-2">
            {WEEKLY_LABELS.map(l => (
              <div key={l} className="flex-1 text-center text-surface-500 text-[10px]">{l}</div>
            ))}
          </div>
        </div>

        {/* Orders bar chart */}
        <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-sm">每日訂單量</h2>
              <div className="text-surface-400 text-xs mt-0.5">{totalOrders} 筆本週</div>
            </div>
            <div className="text-blue-400 text-sm font-semibold flex items-center gap-1">
              <ArrowUpRight size={14} /> +14%
            </div>
          </div>
          <BarChart data={WEEKLY_ORDERS} labels={WEEKLY_LABELS} color="#3b82f6" height={130}
            formatValue={v => `${v} 筆`} />
        </div>

        {/* Hourly heatmap */}
        <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5">
          <div className="mb-4">
            <h2 className="font-bold text-sm">24 小時訂單分布</h2>
            <div className="text-surface-400 text-xs mt-0.5">尖峰時段：{peakHour}:00–{peakHour+1}:00</div>
          </div>
          <BarChart data={HOURLY_ORDERS} labels={HOUR_LABELS} color="#a855f7" height={120}
            formatValue={v => `${v} 筆`} />
        </div>

        {/* Service distribution */}
        <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5">
          <h2 className="font-bold text-sm mb-4">服務類型分布</h2>
          {/* Stacked bar */}
          <div className="flex rounded-full overflow-hidden h-4 mb-5">
            {SERVICE_DIST.map(s => (
              <div key={s.label}
                className="transition-all"
                style={{ width: `${s.pct}%`, background: s.color }}
                title={`${s.label} ${s.pct}%`}
              />
            ))}
          </div>
          <div className="space-y-2.5">
            {SERVICE_DIST.map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <span className="text-sm text-surface-200">{s.label}</span>
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
        </div>
      </div>
    </div>
  )
}
