import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Navigation, Package, RefreshCw } from 'lucide-react'
import api from '../../lib/api'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const mkIcon = (color: string) => L.divIcon({
  className: '',
  html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 0 3px ${color}44"></div>`,
  iconAnchor: [7, 7],
})

interface Driver { id: string; name: string; status: string; area: string; lat: number; lng: number; rating: number }

export default function LiveMap() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [orders, setOrders]   = useState<any[]>([])
  const [selected, setSelected] = useState<Driver | null>(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const fetchData = async () => {
    try {
      const [{ data: drv }, { data: ord }] = await Promise.all([
        api.get('/admin/drivers/positions'),
        api.get('/admin/orders?limit=10'),
      ])
      setDrivers(drv)
      setOrders(ord.orders || [])
      setLastRefresh(new Date())
    } catch (e) { console.error(e) }
  }

  useEffect(() => { fetchData(); const t = setInterval(fetchData, 5000); return () => clearInterval(t) }, [])

  const online = drivers.filter(d => d.status === 'online').length
  const busy   = drivers.filter(d => d.status === 'busy').length

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">即時地圖</h1>
          <p className="text-gray-400 text-sm mt-0.5">上次更新：{lastRefresh.toLocaleTimeString('zh-TW')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 bg-surface-800 border border-surface-700 rounded-xl px-4 py-2.5 text-sm">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> 在線 {online}</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-500" /> 任務中 {busy}</span>
          </div>
          <button onClick={fetchData} className="p-2.5 bg-surface-800 border border-surface-700 rounded-xl text-gray-400 hover:text-white transition-colors">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 rounded-2xl overflow-hidden border border-surface-700" style={{height:560}}>
          <MapContainer center={[25.0330, 121.5654]} zoom={12} style={{height:'100%',width:'100%'}}>
            <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {drivers.map(d => (
              <Marker key={d.id} position={[d.lat, d.lng]}
                icon={mkIcon(d.status === 'online' ? '#22c55e' : '#eab308')}
                eventHandlers={{ click: () => setSelected(d) }}>
                <Popup>
                  <div style={{minWidth:130}}>
                    <div style={{fontWeight:700}}>{d.name}</div>
                    <div style={{fontSize:12,color:'#666'}}>{d.area}</div>
                    <div style={{fontSize:12}}>{d.status === 'online' ? '🟢 空閒' : '🟡 任務中'} · ⭐ {d.rating}</div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <div className="flex flex-col gap-3" style={{height:560,overflowY:'auto'}}>
          {selected && (
            <div className="admin-card p-4">
              <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">選中夥伴</div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-surface-700 rounded-xl flex items-center justify-center font-bold">{selected.name[0]}</div>
                <div>
                  <div className="font-semibold">{selected.name}</div>
                  <div className="text-gray-400 text-xs">{selected.area}</div>
                  <div className={`text-xs mt-0.5 font-medium ${selected.status === 'online' ? 'text-green-400' : 'text-yellow-400'}`}>
                    {selected.status === 'online' ? '空閒' : '任務中'}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="admin-card flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-surface-700">
              <Package size={14} className="text-white" /><span className="font-semibold text-sm">進行中訂單</span>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-surface-700">
              {orders.filter(o => !['completed','cancelled'].includes(o.status)).map(o => (
                <div key={o.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold">{o.id}</span>
                    <span className="text-white text-sm">NT${o.total_fee}</span>
                  </div>
                  <div className="text-gray-400 text-xs truncate">{o.delivery_address}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="admin-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-surface-700">
              <Navigation size={14} className="text-white" /><span className="font-semibold text-sm">夥伴狀態</span>
            </div>
            <div className="divide-y divide-surface-700">
              {drivers.map(d => (
                <div key={d.id}
                  className={`px-4 py-3 flex items-center gap-2 cursor-pointer transition-colors ${selected?.id === d.id ? 'bg-surface-700' : 'hover:bg-surface-700/50'}`}
                  onClick={() => setSelected(d)}>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${d.status === 'online' ? 'bg-green-500' : d.status === 'busy' ? 'bg-yellow-500' : 'bg-gray-500'}`} />
                  <span className="text-sm flex-1">{d.name}</span>
                  <span className={`text-xs ${d.status === 'online' ? 'text-green-400' : d.status === 'busy' ? 'text-yellow-400' : 'text-gray-500'}`}>
                    {d.status === 'online' ? '空閒' : d.status === 'busy' ? '任務中' : '離線'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
