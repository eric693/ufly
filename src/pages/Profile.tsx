import { useState } from 'react'
import {
  User, MapPin, CreditCard, ChevronRight, Edit2, Plus,
  Home, Briefcase, Star, Package, TrendingUp, Shield,
  Bell, LogOut, Trash2, Check, Phone,
} from 'lucide-react'
import RatingModal from '../components/RatingModal'

interface SavedAddress {
  id: string
  type: 'home' | 'work' | 'other'
  label: string
  address: string
}

const DEFAULT_ADDRESSES: SavedAddress[] = [
  { id: '1', type: 'home',  label: '家',     address: '台中市豐原區中正路100號' },
  { id: '2', type: 'work',  label: '公司',   address: '台中市西屯區台灣大道三段1000號' },
]

const TYPE_ICON = { home: Home, work: Briefcase, other: MapPin }

const PAYMENT_METHODS = [
  { id: '1', brand: 'Visa',       last4: '4242', default: true },
  { id: '2', brand: 'Mastercard', last4: '8888', default: false },
]

export default function Profile() {
  const [addresses, setAddresses] = useState<SavedAddress[]>(DEFAULT_ADDRESSES)
  const [editingAddr, setEditingAddr] = useState<string | null>(null)
  const [newAddrInput, setNewAddrInput] = useState('')
  const [addingAddr, setAddingAddr] = useState(false)
  const [ratingOpen, setRatingOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'addresses' | 'payment'>('profile')

  const deleteAddress = (id: string) => setAddresses(prev => prev.filter(a => a.id !== id))

  return (
    <div className="animate-fade-in max-w-2xl mx-auto px-4 py-6 md:py-10">
      <RatingModal open={ratingOpen} onClose={() => setRatingOpen(false)} />

      {/* Profile header */}
      <div className="card mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center">
              <User size={28} className="text-white" />
            </div>
            <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full
                               flex items-center justify-center">
              <Edit2 size={11} className="text-white" />
            </button>
          </div>
          <div className="flex-1">
            <div className="font-bold text-lg">林雅文</div>
            <div className="text-surface-300 text-sm flex items-center gap-1 mt-0.5">
              <Phone size={12} /> 0912-345-678
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-yellow-400 font-semibold">
              <Star size={14} className="fill-yellow-400" /> 4.9
            </div>
            <div className="text-surface-400 text-xs mt-0.5">會員評分</div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-surface-600">
          {[
            { label: '總訂單',   value: '23',       icon: Package },
            { label: '累計消費', value: 'NT$3,420', icon: TrendingUp },
            { label: '完成率',   value: '100%',     icon: Check },
          ].map(s => (
            <div key={s.label} className="text-center">
              <s.icon size={16} className="text-white mx-auto mb-1" />
              <div className="font-bold text-sm">{s.value}</div>
              <div className="text-surface-400 text-xs">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-800 rounded-2xl p-1 mb-5">
        {[
          { id: 'profile' as const,   label: '帳號設定' },
          { id: 'addresses' as const, label: '常用地址' },
          { id: 'payment' as const,   label: '付款方式' },
        ].map(t => (
          <button key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors
              ${activeTab === t.id ? 'bg-surface-600 text-white' : 'text-surface-300 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Profile */}
      {activeTab === 'profile' && (
        <div className="space-y-3 animate-fade-in">
          <div className="card space-y-1">
            {[
              { icon: User,   label: '姓名',   value: '林雅文' },
              { icon: Phone,  label: '電話',   value: '0912-345-678' },
              { icon: Shield, label: '實名驗證', value: '已驗證' },
            ].map(r => (
              <div key={r.label}
                className="flex items-center justify-between py-2.5 border-b border-surface-600 last:border-0">
                <div className="flex items-center gap-3 text-surface-300">
                  <r.icon size={16} />
                  <span className="text-sm">{r.label}</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  {r.value}
                  <ChevronRight size={14} className="text-surface-500" />
                </div>
              </div>
            ))}
          </div>

          <div className="card space-y-1">
            {[
              { icon: Bell,   label: '推播通知', value: '已開啟' },
              { icon: Shield, label: '隱私設定',  value: '' },
            ].map(r => (
              <div key={r.label}
                className="flex items-center justify-between py-2.5 border-b border-surface-600 last:border-0">
                <div className="flex items-center gap-3 text-surface-300">
                  <r.icon size={16} />
                  <span className="text-sm">{r.label}</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-surface-300">
                  {r.value} <ChevronRight size={14} className="text-surface-500" />
                </div>
              </div>
            ))}
          </div>

          {/* Demo: trigger rating */}
          <button onClick={() => setRatingOpen(true)}
            className="card-hover w-full flex items-center justify-between">
            <div className="flex items-center gap-3 text-surface-300">
              <Star size={16} />
              <span className="text-sm">評價最近訂單（示範）</span>
            </div>
            <ChevronRight size={14} className="text-surface-500" />
          </button>

          <button className="w-full flex items-center justify-center gap-2 py-3 text-red-400
                             hover:text-red-300 text-sm font-medium transition-colors">
            <LogOut size={16} /> 登出帳號
          </button>
        </div>
      )}

      {/* Tab: Addresses */}
      {activeTab === 'addresses' && (
        <div className="space-y-3 animate-fade-in">
          {addresses.map(addr => {
            const Icon = TYPE_ICON[addr.type]
            return (
              <div key={addr.id} className="card">
                {editingAddr === addr.id ? (
                  <div className="space-y-3">
                    <input
                      className="w-full bg-surface-600 border border-surface-500 rounded-xl px-3 py-2.5
                                 text-sm text-white outline-none focus:border-white"
                      defaultValue={addr.address}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setEditingAddr(null)}
                        className="btn-primary flex-1 py-2 text-sm">儲存</button>
                      <button onClick={() => setEditingAddr(null)}
                        className="btn-secondary flex-1 py-2 text-sm">取消</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-surface-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon size={18} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{addr.label}</div>
                      <div className="text-surface-300 text-xs truncate mt-0.5">{addr.address}</div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setEditingAddr(addr.id)}
                        className="p-2 rounded-xl hover:bg-surface-600 text-surface-400 hover:text-white transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => deleteAddress(addr.id)}
                        className="p-2 rounded-xl hover:bg-red-500/10 text-surface-400 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Add new */}
          {addingAddr ? (
            <div className="card space-y-3">
              <div className="text-sm font-semibold">新增地址</div>
              <input
                className="w-full bg-surface-600 border border-surface-500 rounded-xl px-3 py-2.5
                           text-sm text-white outline-none focus:border-white placeholder-surface-400"
                placeholder="輸入地址"
                value={newAddrInput}
                onChange={e => setNewAddrInput(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (newAddrInput.trim()) {
                      setAddresses(prev => [...prev, {
                        id: Date.now().toString(), type: 'other',
                        label: '其他', address: newAddrInput.trim(),
                      }])
                    }
                    setAddingAddr(false)
                    setNewAddrInput('')
                  }}
                  className="btn-primary flex-1 py-2 text-sm">儲存</button>
                <button onClick={() => setAddingAddr(false)}
                  className="btn-secondary flex-1 py-2 text-sm">取消</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingAddr(true)}
              className="card-hover w-full flex items-center gap-3">
              <div className="w-10 h-10 bg-surface-600 rounded-xl flex items-center justify-center">
                <Plus size={18} className="text-white" />
              </div>
              <span className="text-sm font-medium text-white">新增常用地址</span>
            </button>
          )}
        </div>
      )}

      {/* Tab: Payment */}
      {activeTab === 'payment' && (
        <div className="space-y-3 animate-fade-in">
          {PAYMENT_METHODS.map(pm => (
            <div key={pm.id} className="card flex items-center gap-3">
              <div className="w-10 h-10 bg-surface-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <CreditCard size={18} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm">{pm.brand} •••• {pm.last4}</div>
                {pm.default && (
                  <span className="badge-green text-xs mt-0.5">預設付款</span>
                )}
              </div>
              <ChevronRight size={16} className="text-surface-500" />
            </div>
          ))}

          <button className="card-hover w-full flex items-center gap-3">
            <div className="w-10 h-10 bg-surface-600 rounded-xl flex items-center justify-center">
              <Plus size={18} className="text-white" />
            </div>
            <span className="text-sm font-medium text-white">新增付款方式</span>
          </button>

          <div className="card bg-surface-700/50">
            <div className="text-xs text-surface-400 leading-relaxed">
              所有交易均採用 TLS 加密，信用卡資訊安全儲存。
              目前支援 Visa、Mastercard、LINE Pay、街口支付。
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
