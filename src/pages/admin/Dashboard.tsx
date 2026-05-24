import { Link } from 'react-router-dom'
import {
  TrendingUp, Package, Navigation, Clock, CheckCircle,
  AlertCircle, ChevronRight, ArrowUpRight, Zap,
} from 'lucide-react'
import { DASHBOARD_STATS, MOCK_ORDERS, MOCK_DRIVERS } from '../../data/mockData'

const STATUS_COLOR: Record<string, string> = {
  pending: 'badge-gray', matching: 'badge-blue', accepted: 'badge-yellow',
  pickup: 'badge-yellow', delivering: 'badge-blue', completed: 'badge-green', cancelled: 'badge-red',
}
const STATUS_LABEL: Record<string, string> = {
  pending: '等待媒合', matching: '媒合中', accepted: '已接單',
  pickup: '取件中', delivering: '配送中', completed: '已送達', cancelled: '已取消',
}

export default function Dashboard() {
  const s = DASHBOARD_STATS

  const STAT_CARDS = [
    {
      label: '今日訂單',
      value: s.todayOrders,
      unit: '筆',
      change: '+12%',
      up: true,
      icon: Package,
      color: 'text-blue-400 bg-blue-400/10',
    },
    {
      label: '今日營收',
      value: `NT$${s.todayRevenue.toLocaleString()}`,
      unit: '',
      change: '+8%',
      up: true,
      icon: TrendingUp,
      color: 'text-white bg-white/8',
    },
    {
      label: '在線夥伴',
      value: s.activeDrivers,
      unit: '人',
      change: '目前',
      up: true,
      icon: Navigation,
      color: 'text-purple-400 bg-purple-400/10',
    },
    {
      label: '完成率',
      value: s.completionRate,
      unit: '%',
      change: '+0.3%',
      up: true,
      icon: CheckCircle,
      color: 'text-white bg-white/8',
    },
    {
      label: '待處理',
      value: s.pendingOrders,
      unit: '筆',
      change: '需關注',
      up: false,
      icon: AlertCircle,
      color: 'text-yellow-400 bg-yellow-400/10',
    },
    {
      label: '平均送達',
      value: s.avgDeliveryTime,
      unit: '分鐘',
      change: '-2 min',
      up: true,
      icon: Clock,
      color: 'text-orange-400 bg-orange-400/10',
    },
  ]

  const recentOrders = MOCK_ORDERS.slice(0, 5)
  const onlineDrivers = MOCK_DRIVERS.filter(d => d.status !== 'offline').slice(0, 4)

  return (
    <div className="animate-fade-in space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">儀表板</h1>
          <p className="text-surface-400 text-sm mt-1">
            {new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white/8 border border-white/15 rounded-xl px-3 py-2">
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          <span className="text-white text-sm font-medium">系統正常</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {STAT_CARDS.map(c => (
          <div key={c.label} className="bg-surface-800 border border-surface-700 rounded-2xl p-4 md:p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${c.color}`}>
                <c.icon size={18} />
              </div>
              <div className={`flex items-center gap-1 text-xs font-medium
                ${c.up ? 'text-white' : 'text-yellow-400'}`}>
                {c.up && <ArrowUpRight size={12} />}
                {c.change}
              </div>
            </div>
            <div className="text-2xl font-black">
              {c.value}<span className="text-surface-400 text-base font-medium ml-1">{c.unit}</span>
            </div>
            <div className="text-surface-400 text-sm mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4 md:gap-6">
        {/* Recent orders */}
        <div className="md:col-span-2 bg-surface-800 border border-surface-700 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700">
            <h2 className="font-bold flex items-center gap-2">
              <Package size={16} className="text-white" /> 近期訂單
            </h2>
            <Link to="/admin/orders" className="text-white text-sm flex items-center gap-1 hover:text-gray-300">
              查看全部 <ChevronRight size={14} />
            </Link>
          </div>
          <div className="divide-y divide-surface-700">
            {recentOrders.map(o => (
              <div key={o.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-surface-700/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{o.id}</span>
                    <span className={STATUS_COLOR[o.status]}>{STATUS_LABEL[o.status]}</span>
                  </div>
                  <div className="text-surface-400 text-xs truncate mt-0.5">{o.delivery.address}</div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-white font-semibold text-sm">NT${o.totalFee}</div>
                  <div className="text-surface-500 text-xs">
                    {new Date(o.createdAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active drivers */}
        <div className="bg-surface-800 border border-surface-700 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700">
            <h2 className="font-bold flex items-center gap-2">
              <Navigation size={16} className="text-white" /> 在線夥伴
            </h2>
            <Link to="/admin/drivers" className="text-white text-sm flex items-center gap-1 hover:text-gray-300">
              全部 <ChevronRight size={14} />
            </Link>
          </div>
          <div className="divide-y divide-surface-700">
            {onlineDrivers.map(d => (
              <div key={d.id} className="px-5 py-3.5 flex items-center gap-3">
                <div className="relative">
                  <div className="w-9 h-9 bg-surface-700 rounded-xl flex items-center justify-center text-sm font-bold">
                    {d.name[0]}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5
                    ${d.status === 'online' ? 'status-online' : 'status-busy'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{d.name}</div>
                  <div className="text-surface-400 text-xs">{d.area}</div>
                </div>
                <div className={`text-xs font-medium ${d.status === 'online' ? 'text-white' : 'text-yellow-400'}`}>
                  {d.status === 'online' ? '空閒' : '任務中'}
                </div>
              </div>
            ))}
          </div>
          {/* Quick stats */}
          <div className="px-5 py-3 border-t border-surface-700 flex items-center justify-between bg-surface-700/30">
            <span className="text-surface-400 text-xs">今日總出車</span>
            <span className="text-white font-semibold text-sm flex items-center gap-1">
              <Zap size={12} className="text-white" /> 18 人次
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
