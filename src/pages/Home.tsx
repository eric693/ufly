import { Link } from 'react-router-dom'
import { useState } from 'react'
import {
  FileText, Package, ShoppingBag, ClipboardList,
  Briefcase, Star, Key, Receipt, Gift, MapPin,
  ArrowRight, ChevronRight, Clock, Shield, Users,
  Truck, Zap,
} from 'lucide-react'

const SERVICE_TABS = [
  { id: 'send',    label: '幫我送' },
  { id: 'fetch',   label: '幫我取' },
  { id: 'support', label: '任務支援' },
  { id: 'queue',   label: '幫排隊' },
]

const SERVICES = [
  { id: 'document',   icon: FileText,      label: '文件急送', featured: true },
  { id: 'delivery',   icon: Package,       label: '物品配送' },
  { id: 'business',   icon: Briefcase,     label: '商務支援' },
  { id: 'urgent',     icon: Zap,           label: '急件配送' },
  { id: 'key',        icon: Key,           label: '鑰匙急送' },
  { id: 'ticket',     icon: Receipt,       label: '票券文件' },
  { id: 'gift',       icon: Gift,          label: '禮品配送' },
  { id: 'designated', icon: MapPin,        label: '指定送達' },
  { id: 'purchase',   icon: ShoppingBag,   label: '即時代購' },
  { id: 'errand',     icon: ClipboardList, label: '即時代辦' },
  { id: 'custom',     icon: Star,          label: '客製任務' },
]

const FEATURES = [
  { icon: Users,  label: '專人服務', desc: '真人接單，全程追蹤' },
  { icon: Clock,  label: '快速媒合', desc: '最快 20 分鐘完成任務' },
  { icon: Shield, label: '安全可靠', desc: '實名驗證，保障安心' },
  { icon: Truck,  label: '彈性配送', desc: '台中全區，豐原起步' },
]

export default function Home() {
  const [activeTab, setActiveTab] = useState('send')

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-8 pb-10 md:px-8 md:pt-16 md:pb-20">
        <div className="absolute inset-0 bg-gradient-to-b from-surface-800/60 to-surface-900 pointer-events-none" />

        <div className="relative max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-black leading-tight mb-3">
                今天需要 Ufly<br />
                <span className="text-white">幫你處理什麼？</span>
              </h1>
              <p className="text-surface-200 text-base md:text-lg mb-6 leading-relaxed">
                快速下單 · 專人完成 · 安全可靠
              </p>
              <div className="flex gap-3 flex-wrap">
                <Link to="/order" className="btn-primary">
                  立即下單 <ArrowRight size={16} />
                </Link>
                <Link to="/tracking" className="btn-secondary">
                  追蹤訂單
                </Link>
              </div>
            </div>

            {/* Hero visual */}
            <div className="hidden md:flex flex-shrink-0 w-72 h-72 items-center justify-center
                            bg-surface-700 rounded-3xl border border-surface-600 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
              <div className="relative flex flex-col items-center gap-4">
                <div className="w-24 h-24 bg-white/10 rounded-3xl flex items-center justify-center border border-white/20">
                  <Zap size={48} className="text-white" />
                </div>
                <div className="text-center">
                  <div className="text-white font-bold text-lg">城市任務平台</div>
                  <div className="text-surface-300 text-sm">City Task Platform</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Service tabs */}
      <section className="px-4 md:px-8 max-w-5xl mx-auto">
        <div className="card p-2 flex gap-1">
          {SERVICE_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 py-3 px-2 rounded-2xl text-sm font-semibold transition-all duration-200
                ${activeTab === t.id
                  ? 'bg-white text-black shadow-sm'
                  : 'text-surface-200 hover:text-white hover:bg-surface-600'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {/* Service grid */}
      <section className="px-4 md:px-8 max-w-5xl mx-auto mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">常用服務</h2>
          <Link to="/order" className="text-white/60 text-sm flex items-center gap-1 hover:text-white">
            全部服務 <ChevronRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-4 gap-3 md:grid-cols-6 lg:grid-cols-8">
          {SERVICES.slice(0, 8).map(({ id, icon: Icon, label, featured }) => (
            <Link
              key={id}
              to={`/order?service=${id}`}
              className={`flex flex-col items-center gap-2.5 p-3 rounded-2xl transition-all duration-200
                          hover:scale-105 active:scale-95
                          ${featured
                            ? 'bg-white text-black border-2 border-white'
                            : 'bg-surface-700 border border-surface-600 text-surface-200 hover:text-white hover:bg-surface-600'}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                              ${featured ? 'bg-black/10' : 'bg-surface-600'}`}>
                <Icon size={20} className={featured ? 'text-black' : 'text-white'} />
              </div>
              <span className="text-xs font-semibold text-center leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-4 md:px-8 max-w-5xl mx-auto mt-10 mb-6">
        <h2 className="text-lg font-bold mb-4">為什麼選擇 Ufly</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="card flex flex-col gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
                <Icon size={20} className="text-white" />
              </div>
              <div>
                <div className="font-semibold text-sm">{label}</div>
                <div className="text-surface-300 text-xs mt-0.5">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats strip */}
      <section className="px-4 md:px-8 max-w-5xl mx-auto mt-4 mb-8">
        <div className="bg-surface-700 border border-surface-600 rounded-3xl p-5
                        flex items-center justify-between gap-4">
          <div>
            <div className="text-white/50 text-xs font-semibold mb-1">今日任務</div>
            <div className="text-2xl font-black">47 <span className="text-surface-300 text-base font-medium">筆完成</span></div>
            <div className="text-surface-300 text-xs mt-1">完成率 96.8%</div>
          </div>
          <div className="hidden sm:block h-12 w-px bg-surface-600" />
          <div className="hidden sm:block">
            <div className="text-white/50 text-xs font-semibold mb-1">平均送達</div>
            <div className="text-2xl font-black">38 <span className="text-surface-300 text-base font-medium">分鐘</span></div>
          </div>
          <div className="hidden sm:block h-12 w-px bg-surface-600" />
          <div className="hidden sm:block">
            <div className="text-white/50 text-xs font-semibold mb-1">在線夥伴</div>
            <div className="text-2xl font-black">12 <span className="text-surface-300 text-base font-medium">人</span></div>
          </div>
          <Link to="/order" className="flex-shrink-0 btn-primary py-2.5 text-sm">
            立即下單 <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </div>
  )
}
