import { useState, useEffect } from 'react'
import { Navigation, MapPin, Package, RefreshCw, Maximize2 } from 'lucide-react'
import { MOCK_DRIVERS, MOCK_ORDERS } from '../../data/mockData'

interface DriverDot {
  id: string
  name: string
  status: 'online' | 'busy' | 'offline'
  x: number
  y: number
  area: string
}

// Grid-map of Taichung districts — each cell is a district zone
const DISTRICT_GRID = [
  { name: '豐原區', x: 60, y: 15 },
  { name: '北屯區', x: 55, y: 35 },
  { name: '東區',   x: 65, y: 48 },
  { name: '北區',   x: 48, y: 42 },
  { name: '西屯區', x: 30, y: 48 },
  { name: '中區',   x: 52, y: 52 },
  { name: '西區',   x: 42, y: 54 },
  { name: '南屯區', x: 38, y: 62 },
  { name: '南區',   x: 52, y: 64 },
  { name: '大里區', x: 62, y: 62 },
  { name: '太平區', x: 72, y: 55 },
  { name: '霧峰區', x: 58, y: 75 },
  { name: '烏日區', x: 42, y: 74 },
]

const BASE_POSITIONS: Record<string, { x: number; y: number }> = {
  D001: { x: 62, y: 17 },
  D002: { x: 53, y: 53 },
  D003: { x: 49, y: 38 },
  D004: { x: 63, y: 63 },
  D005: { x: 31, y: 49 },
  D006: { x: 39, y: 63 },
  D007: { x: 48, y: 44 },
  D008: { x: 66, y: 49 },
}

function jitter(v: number, r = 2) {
  return v + (Math.random() - 0.5) * r
}

export default function LiveMap() {
  const [drivers, setDrivers] = useState<DriverDot[]>(() =>
    MOCK_DRIVERS.map(d => ({
      id: d.id, name: d.name, status: d.status, area: d.area,
      x: BASE_POSITIONS[d.id]?.x ?? 50,
      y: BASE_POSITIONS[d.id]?.y ?? 50,
    }))
  )
  const [tick, setTick] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)

  // Simulate position updates every 3s for online/busy drivers
  useEffect(() => {
    const id = setInterval(() => {
      setDrivers(prev => prev.map(d =>
        d.status !== 'offline'
          ? { ...d, x: Math.min(95, Math.max(5, jitter(d.x, 1.5))), y: Math.min(95, Math.max(5, jitter(d.y, 1.5))) }
          : d
      ))
      setTick(t => t + 1)
    }, 3000)
    return () => clearInterval(id)
  }, [])

  const activeOrders  = MOCK_ORDERS.filter(o => ['matching','accepted','pickup','delivering'].includes(o.status))
  const selectedDriver = drivers.find(d => d.id === selected)

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">即時地圖</h1>
        <div className="flex items-center gap-2 text-surface-400 text-xs">
          <RefreshCw size={12} className="animate-spin" style={{ animationDuration: '3s' }} />
          每 3 秒更新
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        {/* Map area */}
        <div className="md:col-span-3">
          <div className="relative bg-[#0d1117] border border-surface-700 rounded-2xl overflow-hidden"
               style={{ aspectRatio: '16/10' }}>
            {/* Grid background lines */}
            <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 100 100" preserveAspectRatio="none">
              {Array.from({ length: 10 }, (_, i) => (
                <line key={`h${i}`} x1="0" y1={i * 10} x2="100" y2={i * 10} stroke="#334155" strokeWidth="0.3" />
              ))}
              {Array.from({ length: 10 }, (_, i) => (
                <line key={`v${i}`} x1={i * 10} y1="0" x2={i * 10} y2="100" stroke="#334155" strokeWidth="0.3" />
              ))}
            </svg>

            {/* District labels */}
            {DISTRICT_GRID.map(d => (
              <div key={d.name}
                className="absolute text-surface-600 text-[9px] font-medium pointer-events-none"
                style={{ left: `${d.x}%`, top: `${d.y}%`, transform: 'translate(-50%,-50%)' }}>
                {d.name}
              </div>
            ))}

            {/* Active order pickup/delivery dots */}
            {activeOrders.slice(0, 4).map((o, i) => {
              const px = 20 + i * 18; const py = 30 + i * 12
              return (
                <div key={o.id}>
                  <div className="absolute w-2.5 h-2.5 bg-white rounded-full border-2 border-white/20"
                    style={{ left: `${px}%`, top: `${py}%`, transform: 'translate(-50%,-50%)' }}>
                    <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-50" />
                  </div>
                  <div className="absolute bg-surface-700 border border-surface-600 rounded-lg px-1.5 py-0.5 text-[9px] font-medium"
                    style={{ left: `${px + 2}%`, top: `${py - 4}%` }}>
                    {o.id}
                  </div>
                </div>
              )
            })}

            {/* Driver dots */}
            {drivers.map(d => (
              <button key={d.id}
                onClick={() => setSelected(selected === d.id ? null : d.id)}
                className={`absolute transition-all duration-1000 group`}
                style={{ left: `${d.x}%`, top: `${d.y}%`, transform: 'translate(-50%,-50%)' }}>
                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-white text-[10px] font-bold
                  shadow-lg transition-transform group-hover:scale-110
                  ${selected === d.id ? 'scale-125' : ''}
                  ${d.status === 'online'  ? 'bg-brand-600 border-brand-400'
                  : d.status === 'busy'    ? 'bg-yellow-600 border-yellow-400'
                  :                          'bg-surface-600 border-surface-400'}`}>
                  {d.name[0]}
                </div>
                {d.status !== 'offline' && (
                  <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[#0d1117]
                    ${d.status === 'online' ? 'bg-white' : 'bg-yellow-500'}`} />
                )}
              </button>
            ))}

            {/* Legend */}
            <div className="absolute bottom-3 left-3 bg-surface-900/80 backdrop-blur rounded-xl px-3 py-2 space-y-1">
              {[
                { color: 'bg-white',   label: '空閒' },
                { color: 'bg-yellow-500',  label: '任務中' },
                { color: 'bg-surface-500', label: '離線' },
                { color: 'bg-white animate-ping', label: '進行中訂單', dot: true },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-2 text-xs text-surface-300">
                  <div className={`w-2 h-2 rounded-full ${l.color}`} />
                  {l.label}
                </div>
              ))}
            </div>

            {/* Driver tooltip */}
            {selectedDriver && (
              <div className="absolute top-3 right-3 bg-surface-800 border border-surface-600 rounded-xl p-3 w-36 shadow-xl">
                <div className="font-bold text-sm mb-1">{selectedDriver.name}</div>
                <div className="text-surface-400 text-xs">{selectedDriver.area}</div>
                <div className={`text-xs font-medium mt-1
                  ${selectedDriver.status === 'online' ? 'text-white' : selectedDriver.status === 'busy' ? 'text-yellow-400' : 'text-surface-400'}`}>
                  {selectedDriver.status === 'online' ? '空閒中' : selectedDriver.status === 'busy' ? '任務中' : '離線'}
                </div>
              </div>
            )}

            {/* Expand hint */}
            <button className="absolute top-3 left-3 bg-surface-800/70 rounded-lg p-1.5 text-surface-400 hover:text-white">
              <Maximize2 size={14} />
            </button>
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-3">
          {/* Stats */}
          <div className="bg-surface-800 border border-surface-700 rounded-2xl p-4 space-y-3">
            <div className="text-xs text-surface-400 font-semibold uppercase tracking-wider">即時狀態</div>
            {[
              { label: '在線夥伴', value: drivers.filter(d => d.status !== 'offline').length, color: 'text-white' },
              { label: '任務中',   value: drivers.filter(d => d.status === 'busy').length,    color: 'text-yellow-400' },
              { label: '進行訂單', value: activeOrders.length,                                 color: 'text-blue-400' },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <span className="text-surface-300 text-sm">{s.label}</span>
                <span className={`font-bold text-lg ${s.color}`}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* Active orders */}
          <div className="bg-surface-800 border border-surface-700 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-700 text-xs font-semibold text-surface-400 uppercase tracking-wider">
              進行中訂單
            </div>
            <div className="divide-y divide-surface-700 max-h-52 overflow-y-auto">
              {activeOrders.map(o => (
                <div key={o.id} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Package size={12} className="text-white" />
                    <span className="font-semibold text-xs">{o.id}</span>
                  </div>
                  {o.driver ? (
                    <div className="flex items-center gap-1 text-surface-400 text-xs">
                      <Navigation size={10} /> {o.driver.name}
                    </div>
                  ) : (
                    <div className="text-yellow-400 text-xs">媒合中...</div>
                  )}
                  <div className="flex items-center gap-1 text-surface-500 text-xs mt-0.5">
                    <MapPin size={10} /> {o.delivery.address.slice(0, 12)}...
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
