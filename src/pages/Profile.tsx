import { useState, useEffect } from 'react'
import {
  User, MapPin, ChevronRight, Edit2, Plus,
  Home, Briefcase, Star, Package, Check, Phone,
  LogOut, Trash2, Shield, Bell, Copy, Users, RefreshCw, Loader2,
  Building2, CalendarClock, FileText, Webhook, AlertTriangle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'

interface SavedAddress { id: string; type: string; label: string; address: string }
interface RecurringOrder { id: string; service_type: string; pickup_address: string; delivery_address: string; schedule: string; active: number }
interface ReferralStats { code: string; referred_count: number; reward_total: number }
interface Enterprise { id: string; name: string; tax_id?: string; contact_name?: string; contact_phone?: string; member_count?: number; order_count?: number; order_total?: number }

const TYPE_ICON: Record<string, React.ElementType> = { home: Home, work: Briefcase, other: MapPin }
const SERVICE_LABEL: Record<string, string> = {
  document: '文件急送', delivery: '物品配送', purchase: '即時代購',
  key: '鑰匙急送', gift: '禮品配送', errand: '即時代辦',
}
const SCHEDULE_LABEL: Record<string, string> = {
  daily: '每天', weekly: '每週', monthly: '每月',
}

export default function Profile() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<'profile' | 'addresses' | 'enterprise' | 'recurring' | 'subscription'>('profile')

  const [addresses, setAddresses]       = useState<SavedAddress[]>([])
  const [editingAddr, setEditingAddr]   = useState<string | null>(null)
  const [editAddrVal, setEditAddrVal]   = useState('')
  const [addingAddr, setAddingAddr]     = useState(false)
  const [newLabel, setNewLabel]         = useState('')
  const [newAddr, setNewAddr]           = useState('')
  const [newType, setNewType]           = useState<'home'|'work'|'other'>('other')

  const [referral, setReferral]         = useState<ReferralStats | null>(null)
  const [copied, setCopied]             = useState(false)
  const [referralInput, setReferralInput] = useState('')
  const [referralMsg, setReferralMsg]   = useState('')

  const [enterprise, setEnterprise]     = useState<Enterprise | null>(null)
  const [loadingEnt, setLoadingEnt]     = useState(true)
  const [entForm, setEntForm]           = useState({ name: '', tax_id: '', contact_name: '', contact_phone: '', contact_email: '' })
  const [creatingEnt, setCreatingEnt]   = useState(false)

  const [recurring, setRecurring]       = useState<RecurringOrder[]>([])
  const [addingRec, setAddingRec]       = useState(false)
  const [recForm, setRecForm]           = useState({ pickup_address: '', delivery_address: '', item_content: '', schedule: 'daily', speed_tier: 'standard', service_type: 'document' })

  const [subInfo, setSubInfo]           = useState<{ tier: string; subscription: any } | null>(null)
  const [subLoading, setSubLoading]     = useState(false)

  const [saving, setSaving]             = useState(false)
  const [editName, setEditName]         = useState(false)
  const [editPhone, setEditPhone]       = useState(false)
  const [nameVal, setNameVal]           = useState(user?.name || '')
  const [phoneVal, setPhoneVal]         = useState('')

  useEffect(() => {
    api.get('/users/me/addresses').then(r => setAddresses(r.data)).catch(() => {})
    api.get('/users/me/referral/stats').then(r => setReferral(r.data)).catch(() => {})
    api.get('/enterprises/mine').then(r => setEnterprise(r.data)).catch(() => setEnterprise(null)).finally(() => setLoadingEnt(false))
    api.get('/orders/recurring/list').then(r => setRecurring(r.data)).catch(() => {})
    api.get('/users/me').then(r => { setNameVal(r.data.name); setPhoneVal(r.data.phone || '') }).catch(() => {})
    api.get('/subscriptions/me').then(r => setSubInfo(r.data)).catch(() => {})
  }, [])

  const saveProfile = async () => {
    setSaving(true)
    try {
      await api.put('/users/me', { name: nameVal, phone: phoneVal })
      setEditName(false)
      setEditPhone(false)
    } catch { alert('儲存失敗') } finally { setSaving(false) }
  }

  const addAddress = async () => {
    if (!newLabel || !newAddr) return
    const { data } = await api.post('/users/me/addresses', { label: newLabel, address: newAddr, type: newType })
    setAddresses(prev => [...prev, data])
    setAddingAddr(false); setNewLabel(''); setNewAddr(''); setNewType('other')
  }

  const saveAddress = async (id: string) => {
    await api.put(`/users/me/addresses/${id}`, { address: editAddrVal })
    setAddresses(prev => prev.map(a => a.id === id ? { ...a, address: editAddrVal } : a))
    setEditingAddr(null)
  }

  const deleteAddress = async (id: string) => {
    await api.delete(`/users/me/addresses/${id}`)
    setAddresses(prev => prev.filter(a => a.id !== id))
  }

  const copyCode = () => {
    if (!referral?.code) return
    navigator.clipboard.writeText(referral.code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const applyReferral = async () => {
    try {
      const { data } = await api.post('/users/me/referral/apply', { code: referralInput.toUpperCase() })
      setReferralMsg(data.message)
      setReferralInput('')
    } catch (e: any) { setReferralMsg(e?.response?.data?.error || '無效推薦碼') }
  }

  const createEnterprise = async () => {
    if (!entForm.name) return
    setCreatingEnt(true)
    try {
      const { data } = await api.post('/enterprises', entForm)
      setEnterprise(data)
    } catch (e: any) { alert(e?.response?.data?.error || '建立失敗') }
    finally { setCreatingEnt(false) }
  }

  const addRecurring = async () => {
    if (!recForm.pickup_address || !recForm.delivery_address) return
    const { data } = await api.post('/orders/recurring', recForm)
    setRecurring(prev => [data, ...prev])
    setAddingRec(false)
  }

  const deleteRecurring = async (id: string) => {
    await api.delete(`/orders/recurring/${id}`)
    setRecurring(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div className="animate-fade-in max-w-2xl mx-auto px-4 py-6 md:py-10">
      {/* Header */}
      <div className="card mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            {user?.avatar
              ? <img src={user.avatar} className="w-16 h-16 rounded-2xl object-cover" alt="" />
              : <div className="w-16 h-16 bg-paper-100 rounded-2xl flex items-center justify-center"><User size={28} className="text-paper-900" /></div>}
          </div>
          <div className="flex-1">
            <div className="font-bold text-lg">{user?.name || '載入中…'}</div>
            {user?.email && <div className="text-paper-500 text-sm mt-0.5">{user.email}</div>}
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-yellow-400 font-semibold">
              <Star size={14} className="fill-yellow-400" /> {user?.rating?.toFixed(1) || '5.0'}
            </div>
            <div className="text-paper-500 text-xs mt-0.5">會員評分</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-paper-200">
          {[
            { label: '總訂單',   value: `${user?.total_orders || 0}`, icon: Package },
            { label: '完成率',   value: '100%',                       icon: Check },
          ].map(s => (
            <div key={s.label} className="text-center">
              <s.icon size={16} className="text-paper-900 mx-auto mb-1" />
              <div className="font-bold text-sm">{s.value}</div>
              <div className="text-paper-500 text-xs">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-paper-100 rounded-2xl p-1 mb-5 overflow-x-auto">
        {[
          { id: 'profile' as const,      label: '帳號' },
          { id: 'addresses' as const,    label: '地址' },
          { id: 'subscription' as const, label: '訂閱' },
          { id: 'enterprise' as const,   label: '企業' },
          { id: 'recurring' as const,    label: '定期任務' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap
              ${activeTab === t.id ? 'bg-white text-paper-900 shadow-sm' : 'text-paper-500 hover:text-paper-900'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Profile Tab ── */}
      {activeTab === 'profile' && (
        <div className="space-y-3 animate-fade-in">
          <div className="card space-y-1">
            <div className="flex items-center justify-between py-2.5 border-b border-paper-200">
              <div className="flex items-center gap-3 text-paper-500"><User size={16} /><span className="text-sm">姓名</span></div>
              {editName ? (
                <div className="flex items-center gap-2">
                  <input className="border border-paper-300 rounded-lg px-2 py-1 text-sm outline-none focus:border-paper-600 w-28"
                    value={nameVal} onChange={e => setNameVal(e.target.value)} />
                  <button onClick={saveProfile} disabled={saving} className="text-xs font-medium text-paper-900 hover:text-paper-600">
                    {saving ? <Loader2 size={13} className="animate-spin" /> : '儲存'}
                  </button>
                  <button onClick={() => setEditName(false)} className="text-xs text-paper-400">取消</button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm font-medium">
                  {nameVal}
                  <button onClick={() => setEditName(true)} className="p-1 rounded-lg hover:bg-paper-100 transition-colors">
                    <Edit2 size={13} className="text-paper-400" />
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between py-2.5 border-b border-paper-200">
              <div className="flex items-center gap-3 text-paper-500"><Phone size={16} /><span className="text-sm">電話</span></div>
              {editPhone ? (
                <div className="flex items-center gap-2">
                  <input
                    className="border border-paper-300 rounded-lg px-2 py-1 text-sm outline-none focus:border-paper-600 w-36"
                    placeholder="0912-345-678"
                    value={phoneVal}
                    onChange={e => setPhoneVal(e.target.value)}
                  />
                  <button onClick={saveProfile} disabled={saving} className="text-xs font-medium text-paper-900 hover:text-paper-600">
                    {saving ? <Loader2 size={13} className="animate-spin" /> : '儲存'}
                  </button>
                  <button onClick={() => setEditPhone(false)} className="text-xs text-paper-400">取消</button>
                </div>
              ) : (
                <button onClick={() => setEditPhone(true)} className="flex items-center gap-2 text-sm font-medium text-paper-500 hover:text-paper-900 transition-colors">
                  {phoneVal || '未設定'} <ChevronRight size={14} className="text-paper-400" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3 text-paper-500"><Shield size={16} /><span className="text-sm">帳號類型</span></div>
              <span className="text-sm font-medium capitalize">{user?.role === 'admin' ? '管理員' : '一般用戶'}</span>
            </div>
          </div>

          {/* Referral */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3"><Users size={14} className="text-paper-900" /><span className="font-semibold text-sm">推薦碼</span></div>
            {referral ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 bg-paper-100 rounded-xl px-4 py-2.5 font-mono font-bold text-paper-900 tracking-widest text-center">
                    {referral.code}
                  </div>
                  <button onClick={copyCode} className="p-2.5 bg-paper-900 text-white rounded-xl hover:bg-paper-700 transition-colors">
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
                <div className="flex gap-4 text-center">
                  <div className="flex-1 bg-paper-50 rounded-xl py-2">
                    <div className="font-bold text-sm">{referral.referred_count}</div>
                    <div className="text-paper-500 text-xs">推薦人數</div>
                  </div>
                  <div className="flex-1 bg-paper-50 rounded-xl py-2">
                    <div className="font-bold text-sm text-emerald-600">NT${referral.reward_total}</div>
                    <div className="text-paper-500 text-xs">累積獎勵</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-paper-200">
                  <div className="text-xs text-paper-500 mb-2">輸入朋友的推薦碼（首單折抵 NT$50）</div>
                  <div className="flex gap-2">
                    <input className="flex-1 bg-paper-100 border border-paper-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-paper-600"
                      placeholder="輸入推薦碼" value={referralInput} onChange={e => setReferralInput(e.target.value.toUpperCase())} />
                    <button onClick={applyReferral} className="px-3 py-2 bg-paper-900 text-white rounded-xl text-sm font-medium hover:bg-paper-700 transition-colors">套用</button>
                  </div>
                  {referralMsg && <div className={`text-xs mt-1.5 ${referralMsg.includes('成功') ? 'text-emerald-600' : 'text-red-400'}`}>{referralMsg}</div>}
                </div>
              </>
            ) : <div className="text-paper-400 text-sm text-center py-3"><Loader2 size={16} className="animate-spin mx-auto" /></div>}
          </div>

          <div className="card space-y-1">
            <div className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3 text-paper-500"><Bell size={16} /><span className="text-sm">推播通知</span></div>
              <div className="flex items-center gap-2 text-sm font-medium text-paper-500">已開啟 <ChevronRight size={14} className="text-paper-400" /></div>
            </div>
          </div>

          <div className="card space-y-1">
            <Link to="/dispute"
              className="flex items-center justify-between py-2.5 hover:bg-paper-50 rounded-xl px-1 transition-colors">
              <div className="flex items-center gap-3 text-paper-500"><AlertTriangle size={16} /><span className="text-sm">申訴爭議</span></div>
              <ChevronRight size={14} className="text-paper-400" />
            </Link>
          </div>

          <button onClick={logout} className="w-full flex items-center justify-center gap-2 py-3 text-red-400 hover:text-red-300 text-sm font-medium transition-colors">
            <LogOut size={16} /> 登出帳號
          </button>
        </div>
      )}

      {/* ── Addresses Tab ── */}
      {activeTab === 'addresses' && (
        <div className="space-y-3 animate-fade-in">
          {addresses.map(addr => {
            const Icon = TYPE_ICON[addr.type] || MapPin
            return (
              <div key={addr.id} className="card">
                {editingAddr === addr.id ? (
                  <div className="space-y-3">
                    <input className="w-full bg-paper-100 border border-paper-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-paper-600"
                      value={editAddrVal} onChange={e => setEditAddrVal(e.target.value)} />
                    <div className="flex gap-2">
                      <button onClick={() => saveAddress(addr.id)} className="btn-primary flex-1 py-2 text-sm">儲存</button>
                      <button onClick={() => setEditingAddr(null)} className="btn-secondary flex-1 py-2 text-sm">取消</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-paper-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon size={18} className="text-paper-900" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{addr.label}</div>
                      <div className="text-paper-500 text-xs truncate mt-0.5">{addr.address}</div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditingAddr(addr.id); setEditAddrVal(addr.address) }}
                        className="p-2 rounded-xl hover:bg-paper-100 text-paper-500 hover:text-paper-900 transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => deleteAddress(addr.id)}
                        className="p-2 rounded-xl hover:bg-red-50 text-paper-500 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {addingAddr ? (
            <div className="card space-y-3">
              <div className="text-sm font-semibold">新增地址</div>
              <div className="flex gap-2">
                {(['home','work','other'] as const).map(t => (
                  <button key={t} onClick={() => setNewType(t)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors border ${newType === t ? 'bg-paper-900 text-white border-paper-900' : 'border-paper-200 text-paper-600 hover:bg-paper-100'}`}>
                    {t === 'home' ? '家' : t === 'work' ? '公司' : '其他'}
                  </button>
                ))}
              </div>
              <input className="w-full bg-paper-100 border border-paper-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-paper-600 placeholder-paper-400"
                placeholder="名稱（例：家、公司）" value={newLabel} onChange={e => setNewLabel(e.target.value)} />
              <input className="w-full bg-paper-100 border border-paper-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-paper-600 placeholder-paper-400"
                placeholder="完整地址" value={newAddr} onChange={e => setNewAddr(e.target.value)} />
              <div className="flex gap-2">
                <button onClick={addAddress} className="btn-primary flex-1 py-2 text-sm">儲存</button>
                <button onClick={() => setAddingAddr(false)} className="btn-secondary flex-1 py-2 text-sm">取消</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingAddr(true)} className="card-hover w-full flex items-center gap-3">
              <div className="w-10 h-10 bg-paper-100 rounded-xl flex items-center justify-center"><Plus size={18} className="text-paper-900" /></div>
              <span className="text-sm font-medium text-paper-900">新增常用地址</span>
            </button>
          )}
        </div>
      )}

      {/* ── Enterprise Tab ── */}
      {activeTab === 'enterprise' && (
        <div className="space-y-3 animate-fade-in">
          {loadingEnt ? (
            <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-paper-400" /></div>
          ) : enterprise ? (
            <>
              <div className="card">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-paper-100 rounded-2xl flex items-center justify-center">
                    <Building2 size={22} className="text-paper-900" />
                  </div>
                  <div>
                    <div className="font-bold">{enterprise.name}</div>
                    {enterprise.tax_id && <div className="text-paper-500 text-xs mt-0.5">統編 {enterprise.tax_id}</div>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-paper-50 rounded-xl py-3 text-center">
                    <div className="font-bold text-sm">{enterprise.member_count || 0}</div>
                    <div className="text-paper-500 text-xs">成員數</div>
                  </div>
                  <div className="bg-paper-50 rounded-xl py-3 text-center">
                    <div className="font-bold text-sm text-emerald-600">NT${enterprise.order_total || 0}</div>
                    <div className="text-paper-500 text-xs">累計消費</div>
                  </div>
                </div>
              </div>
              <div className="card space-y-2 text-sm">
                {enterprise.contact_name && <Row label="聯絡人" value={enterprise.contact_name} />}
                {enterprise.contact_phone && <Row label="電話" value={enterprise.contact_phone} />}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Link to="/enterprise/billing"
                  className="card flex flex-col items-center gap-2 py-4 hover:border-paper-400 transition-colors cursor-pointer">
                  <FileText size={20} className="text-indigo-500" />
                  <span className="text-sm font-medium">月結帳單</span>
                </Link>
                <Link to="/enterprise/webhooks"
                  className="card flex flex-col items-center gap-2 py-4 hover:border-paper-400 transition-colors cursor-pointer">
                  <Webhook size={20} className="text-paper-500" />
                  <span className="text-sm font-medium">Webhook</span>
                </Link>
              </div>
            </>
          ) : (
            <div className="card space-y-3">
              <div className="font-semibold text-sm">建立企業帳號</div>
              <div className="text-paper-500 text-xs leading-relaxed">企業帳號可享月結付款、批次下單、電子發票，並集中管理成員訂單。</div>
              {[
                { key: 'name', label: '企業名稱 *', placeholder: '例：優飛科技股份有限公司' },
                { key: 'tax_id', label: '統一編號', placeholder: '12345678' },
                { key: 'contact_name', label: '聯絡人姓名', placeholder: '王小明' },
                { key: 'contact_phone', label: '聯絡電話', placeholder: '02-1234-5678' },
                { key: 'contact_email', label: '聯絡信箱', placeholder: 'contact@company.tw' },
              ].map(f => (
                <input key={f.key}
                  className="w-full bg-paper-100 border border-paper-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-paper-600 placeholder-paper-400"
                  placeholder={f.label} value={(entForm as any)[f.key]} onChange={e => setEntForm(p => ({ ...p, [f.key]: e.target.value }))} />
              ))}
              <button onClick={createEnterprise} disabled={!entForm.name || creatingEnt} className="btn-primary w-full disabled:opacity-40">
                {creatingEnt ? <><Loader2 size={16} className="animate-spin" /> 建立中…</> : '建立企業帳號'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Recurring Tab ── */}
      {activeTab === 'recurring' && (
        <div className="space-y-3 animate-fade-in">
          {recurring.map(r => (
            <div key={r.id} className="card flex items-center gap-3">
              <div className="w-10 h-10 bg-paper-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <RefreshCw size={16} className="text-paper-900" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{SERVICE_LABEL[r.service_type] || '配送任務'}</div>
                <div className="text-paper-500 text-xs truncate mt-0.5">{r.delivery_address}</div>
                <div className="flex items-center gap-1.5 mt-1">
                  <CalendarClock size={11} className="text-paper-400" />
                  <span className="text-paper-400 text-xs">{SCHEDULE_LABEL[r.schedule] || r.schedule}</span>
                  <span className={`text-xs ${r.active ? 'text-emerald-500' : 'text-paper-400'}`}>
                    · {r.active ? '啟用中' : '已暫停'}
                  </span>
                </div>
              </div>
              <button onClick={() => deleteRecurring(r.id)}
                className="p-2 rounded-xl hover:bg-red-50 text-paper-400 hover:text-red-400 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {addingRec ? (
            <div className="card space-y-3">
              <div className="text-sm font-semibold">新增定期任務</div>
              <select className="w-full bg-paper-100 border border-paper-200 rounded-xl px-3 py-2.5 text-sm outline-none" value={recForm.service_type} onChange={e => setRecForm(p => ({ ...p, service_type: e.target.value }))}>
                {Object.entries(SERVICE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input className="w-full bg-paper-100 border border-paper-200 rounded-xl px-3 py-2.5 text-sm outline-none placeholder-paper-400"
                placeholder="取件地址 *" value={recForm.pickup_address} onChange={e => setRecForm(p => ({ ...p, pickup_address: e.target.value }))} />
              <input className="w-full bg-paper-100 border border-paper-200 rounded-xl px-3 py-2.5 text-sm outline-none placeholder-paper-400"
                placeholder="送達地址 *" value={recForm.delivery_address} onChange={e => setRecForm(p => ({ ...p, delivery_address: e.target.value }))} />
              <input className="w-full bg-paper-100 border border-paper-200 rounded-xl px-3 py-2.5 text-sm outline-none placeholder-paper-400"
                placeholder="物品內容（選填）" value={recForm.item_content} onChange={e => setRecForm(p => ({ ...p, item_content: e.target.value }))} />
              <select className="w-full bg-paper-100 border border-paper-200 rounded-xl px-3 py-2.5 text-sm outline-none" value={recForm.schedule} onChange={e => setRecForm(p => ({ ...p, schedule: e.target.value }))}>
                <option value="daily">每天</option>
                <option value="weekly">每週</option>
                <option value="monthly">每月</option>
              </select>
              <div className="flex gap-2">
                <button onClick={addRecurring} disabled={!recForm.pickup_address || !recForm.delivery_address} className="btn-primary flex-1 py-2 text-sm disabled:opacity-40">儲存</button>
                <button onClick={() => setAddingRec(false)} className="btn-secondary flex-1 py-2 text-sm">取消</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingRec(true)} className="card-hover w-full flex items-center gap-3">
              <div className="w-10 h-10 bg-paper-100 rounded-xl flex items-center justify-center"><Plus size={18} className="text-paper-900" /></div>
              <div className="text-left">
                <div className="text-sm font-medium text-paper-900">新增定期任務</div>
                <div className="text-paper-500 text-xs">每天、每週或每月固定執行</div>
              </div>
            </button>
          )}

          {recurring.length === 0 && !addingRec && (
            <div className="text-center py-6 text-paper-400 text-sm">還沒有定期任務<br /><span className="text-xs">設定後系統會自動建立訂單</span></div>
          )}
        </div>
      )}

      {/* ── Subscription Tab ── */}
      {activeTab === 'subscription' && (
        <div className="space-y-4 animate-fade-in">
          {/* Current plan badge */}
          <div className="card text-center">
            <div className="text-paper-500 text-xs mb-1">目前方案</div>
            <div className={`text-2xl font-bold ${subInfo?.tier === 'pro' ? 'text-blue-600' : subInfo?.tier === 'enterprise' ? 'text-purple-600' : 'text-paper-900'}`}>
              {subInfo?.tier === 'pro' ? 'Pro' : subInfo?.tier === 'enterprise' ? 'Enterprise' : 'Free'}
            </div>
            {subInfo?.subscription && (
              <div className="text-xs text-paper-400 mt-1">
                到期日：{new Date(subInfo.subscription.renews_at ?? subInfo.subscription.renewsAt).toLocaleDateString('zh-TW')}
                {' · '}剩餘優惠券：{subInfo.subscription.vouchers_left ?? subInfo.subscription.vouchersLeft} 張
              </div>
            )}
          </div>

          {/* Plan cards */}
          {[
            { tier: 'free',       name: 'Free',       price: '免費',       desc: '標準費率，無折扣', color: 'border-paper-200', badge: '' },
            { tier: 'pro',        name: 'Pro',         price: 'NT$299/月',  desc: '8折基本費 + 每月3張免速度附加費優惠券', color: 'border-blue-400', badge: 'text-blue-600' },
            { tier: 'enterprise', name: 'Enterprise',  price: 'NT$999/月',  desc: '7.5折基本費 + 無限優惠券 + 企業月結帳單', color: 'border-purple-400', badge: 'text-purple-600' },
          ].map(plan => (
            <div key={plan.tier} className={`card border-2 ${subInfo?.tier === plan.tier ? plan.color : 'border-paper-100'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className={`font-bold text-base ${plan.badge}`}>{plan.name}</div>
                  <div className="text-paper-900 font-semibold text-sm mt-0.5">{plan.price}</div>
                  <div className="text-paper-500 text-xs mt-1">{plan.desc}</div>
                </div>
                {subInfo?.tier === plan.tier ? (
                  <span className="text-xs bg-paper-100 text-paper-500 px-2 py-1 rounded-lg">目前方案</span>
                ) : plan.tier !== 'free' && (
                  <button
                    disabled={subLoading}
                    onClick={async () => {
                      setSubLoading(true)
                      try {
                        await api.post('/subscriptions/upgrade', { tier: plan.tier })
                        const r = await api.get('/subscriptions/me')
                        setSubInfo(r.data)
                        alert(`已升級至 ${plan.name} 方案！`)
                      } catch { alert('升級失敗，請稍後再試') } finally { setSubLoading(false) }
                    }}
                    className="text-xs bg-paper-900 text-white px-3 py-1.5 rounded-xl font-medium">
                    {subLoading ? '處理中...' : '升級'}
                  </button>
                )}
              </div>
            </div>
          ))}

          {subInfo?.tier !== 'free' && (
            <button
              onClick={async () => {
                if (!confirm('確定要取消訂閱？將立即降回 Free 方案')) return
                setSubLoading(true)
                try {
                  await api.delete('/subscriptions/cancel')
                  const r = await api.get('/subscriptions/me')
                  setSubInfo(r.data)
                } catch { alert('取消失敗') } finally { setSubLoading(false) }
              }}
              className="w-full text-center text-xs text-paper-400 hover:text-red-400 py-2 transition-colors">
              取消訂閱
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-paper-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
