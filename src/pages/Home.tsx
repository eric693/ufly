import { Link } from 'react-router-dom'
import { useState } from 'react'
import {
  FileText, Package, ShoppingBag, ClipboardList,
  Briefcase, Star, Key, Receipt, Gift, MapPin,
  ArrowRight, ChevronRight, Clock, Shield, Users,
  Truck, Zap, Search, Home as HomeIcon, CalendarClock,
} from 'lucide-react'

const SERVICE_TABS = ['幫我送', '幫我取', '任務支援', '幫排隊']

const SERVICES = [
  { id: 'document',   icon: FileText,      label: '文件急送', iconBg: '#EEF2FF', iconColor: '#4F46E5' },
  { id: 'delivery',   icon: Package,       label: '物品配送', iconBg: '#FFF7ED', iconColor: '#EA580C' },
  { id: 'business',   icon: Briefcase,     label: '商務急件', iconBg: '#EFF6FF', iconColor: '#2563EB' },
  { id: 'urgent',     icon: Zap,           label: '急件配送', iconBg: '#FFF1F2', iconColor: '#E11D48' },
  { id: 'key',        icon: Key,           label: '鑰匙急送', iconBg: '#FFFBEB', iconColor: '#D97706' },
  { id: 'ticket',     icon: Receipt,       label: '票券文件', iconBg: '#F0FDF4', iconColor: '#15803D' },
  { id: 'gift',       icon: Gift,          label: '禮品配送', iconBg: '#FDF4FF', iconColor: '#C026D3' },
  { id: 'purchase',   icon: ShoppingBag,   label: '即時代購', iconBg: '#F0FDF4', iconColor: '#16A34A' },
  { id: 'errand',     icon: ClipboardList, label: '即時代辦', iconBg: '#FAF5FF', iconColor: '#9333EA' },
  { id: 'designated', icon: MapPin,        label: '指定送達', iconBg: '#EFF6FF', iconColor: '#0EA5E9' },
  { id: 'custom',     icon: Star,          label: '客製任務', iconBg: '#FFF7ED', iconColor: '#F97316' },
]

const SAVED_PLACES = [
  { icon: HomeIcon,    label: '家',   address: '豐原區中正路100號' },
  { icon: Briefcase,   label: '公司', address: '西屯區台灣大道三段' },
]

const PROMOS = [
  { tag: '限時優惠', title: '首次下單享 NT$50 折扣',    desc: '輸入 NEW100 折扣碼',       color: 'from-indigo-500 to-purple-600' },
  { tag: '會員方案', title: '升級 Ufly Pro 享無限優惠', desc: '每月固定費，無限次下單',    color: 'from-amber-500 to-orange-600' },
  { tag: '推薦好友', title: '邀請好友各得 NT$100',      desc: '分享連結即可獲得優惠',      color: 'from-emerald-500 to-teal-600' },
]

export default function Home() {
  const [activeTab, setActiveTab] = useState(0)
  const [search, setSearch]       = useState('')

  return (
    <div className="animate-fade-in">
      {/* Dark hero */}
      <section className="bg-black px-4 pt-8 pb-8 md:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-black text-white mb-1">
            今天需要 Ufly<br />幫你處理什麼？
          </h1>
          <p className="text-white/50 text-sm mb-5">快速下單 · 專人完成 · 安全可靠</p>

          {/* Search bar */}
          <div className="relative mb-3">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-paper-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="輸入取件或送達地址…"
              className="w-full bg-white rounded-2xl pl-11 pr-16 py-3.5 text-sm text-paper-900
                         placeholder-paper-400 outline-none shadow-card-lg"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-paper-100 rounded-xl px-2 py-1 text-xs text-paper-500">
              稍後
            </div>
          </div>

          {/* Saved places */}
          <div className="flex flex-col gap-1.5">
            {SAVED_PLACES.map(p => (
              <Link key={p.label} to={`/order?dest=${encodeURIComponent(p.address)}`}
                className="flex items-center gap-3 bg-white/8 hover:bg-white/12 border border-white/10 rounded-2xl px-4 py-3 transition-colors">
                <div className="w-8 h-8 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
                  <p.icon size={15} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-semibold">{p.label}</div>
                  <div className="text-white/50 text-xs truncate">{p.address}</div>
                </div>
                <ChevronRight size={14} className="text-white/40" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Service tabs */}
      <section className="bg-white border-b border-paper-200 sticky top-14 md:top-16 z-30">
        <div className="max-w-3xl mx-auto px-4 md:px-8 flex gap-0 overflow-x-auto">
          {SERVICE_TABS.map((t, i) => (
            <button key={t} onClick={() => setActiveTab(i)}
              className={`px-5 py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors flex-shrink-0
                ${activeTab === i
                  ? 'border-paper-900 text-paper-900'
                  : 'border-transparent text-paper-500 hover:text-paper-800'}`}>
              {t}
            </button>
          ))}
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 md:px-8">

        {/* Service grid */}
        <section className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-paper-900">善待自己</h2>
            <Link to="/order" className="text-paper-600 text-xs flex items-center gap-1 hover:text-paper-900">
              查看全部 <ChevronRight size={12} />
            </Link>
          </div>

          <div className="grid grid-cols-4 gap-3 md:grid-cols-6">
            {SERVICES.slice(0, activeTab === 0 ? 8 : 6).map(({ id, icon: Icon, label, iconBg, iconColor }) => (
              <Link key={id} to={`/order?service=${id}`}
                className="flex flex-col items-center gap-2 p-3 bg-white rounded-2xl border border-paper-200
                           hover:shadow-card-lg hover:border-paper-300 transition-all duration-200 active:scale-95">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: iconBg }}>
                  <Icon size={22} style={{ color: iconColor }} />
                </div>
                <span className="text-xs font-medium text-paper-800 text-center leading-tight">{label}</span>
              </Link>
            ))}
            {/* 預約 card */}
            <Link to="/order" className="flex flex-col items-center gap-2 p-3 bg-white rounded-2xl
                                          border border-paper-200 hover:shadow-card-lg transition-all duration-200 active:scale-95">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gray-100">
                <CalendarClock size={22} className="text-gray-600" />
              </div>
              <span className="text-xs font-medium text-paper-800 text-center leading-tight">預約下單</span>
            </Link>
          </div>
        </section>

        {/* Promo banners */}
        <section className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-paper-900">優惠活動</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
            {PROMOS.map(p => (
              <div key={p.title}
                className={`flex-shrink-0 w-64 rounded-2xl bg-gradient-to-br ${p.color} p-4 text-white`}>
                <span className="badge bg-white/20 text-white text-[10px] mb-2">{p.tag}</span>
                <div className="font-bold text-sm leading-snug mb-1">{p.title}</div>
                <div className="text-white/75 text-xs">{p.desc}</div>
                <button className="mt-3 bg-white/20 hover:bg-white/30 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors">
                  查看優惠內容 →
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="mt-6 mb-8">
          <h2 className="text-base font-bold text-paper-900 mb-3">為什麼選擇 Ufly</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Users,  label: '專人服務', desc: '真人接單，全程追蹤', bg: '#EEF2FF', color: '#4F46E5' },
              { icon: Clock,  label: '快速媒合', desc: '最快 20 分鐘完成',   bg: '#FFF7ED', color: '#EA580C' },
              { icon: Shield, label: '安全可靠', desc: '實名驗證，保障安心', bg: '#F0FDF4', color: '#16A34A' },
              { icon: Truck,  label: '彈性配送', desc: '台中全區服務',       bg: '#EFF6FF', color: '#2563EB' },
            ].map(f => (
              <div key={f.label} className="bg-white rounded-2xl p-4 border border-paper-200 shadow-card flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: f.bg }}>
                  <f.icon size={18} style={{ color: f.color }} />
                </div>
                <div>
                  <div className="font-semibold text-sm text-paper-900">{f.label}</div>
                  <div className="text-paper-500 text-xs mt-0.5">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}
