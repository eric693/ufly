import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  MapPin, Phone, Package, FileText, StickyNote,
  ChevronRight, ArrowLeft, ArrowRight, Check, Navigation,
  Clock, Zap, Star, Truck, Home, Briefcase, Tag,
  CalendarClock, X, Loader2, RefreshCw,
} from 'lucide-react'
import type { SpeedTier, ServiceType } from '../types'
import api from '../lib/api'

const SERVICE_LABELS: Record<string, string> = {
  document: '文件急送', delivery: '物品配送', purchase: '即時代購',
  errand: '即時代辦', business: '商務急件', custom: '客製任務',
  key: '鑰匙急送', ticket: '票券文件', gift: '禮品配送', designated: '指定送達',
}

const SPEED_OPTIONS = [
  { id: 'standard' as SpeedTier, label: '標準件', description: '彈性安排', timeRange: '60–90 分鐘', surcharge: 0, icon: Truck },
  { id: 'express'  as SpeedTier, label: '快速件', description: '即時媒合', timeRange: '45–60 分鐘', surcharge: 30, icon: Zap },
  { id: 'priority' as SpeedTier, label: '優先件', description: '優先處理', timeRange: '30–45 分鐘', surcharge: 80, icon: Star },
  { id: 'urgent'   as SpeedTier, label: '急件',   description: '最速服務', timeRange: '15–30 分鐘', surcharge: 150, icon: Clock },
]

const VALID_PROMOS: Record<string, number> = { 'UFLY50': 50, 'NEW100': 100, 'VIP200': 200 }

type Step = 'info' | 'speed' | 'confirm'

interface SavedAddr { id: string; label: string; address: string; type: string }
interface Estimate  { distance: number; base_fee: number; surcharge: number; discount: number; total_fee: number; duration: number; valid_promo?: boolean }

export default function CreateOrder() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [step, setStep]       = useState<Step>('info')
  const [service]             = useState<ServiceType>((params.get('service') as ServiceType) || 'document')
  const [speed, setSpeed]     = useState<SpeedTier>('standard')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    pickupAddress: '', pickupPhone: '', deliveryAddress: '', deliveryPhone: '', itemContent: '', itemNote: '',
  })
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduleTime, setScheduleTime] = useState('')
  const [promoInput, setPromoInput]     = useState('')
  const [promoApplied, setPromoApplied] = useState<string | null>(null)
  const [promoError, setPromoError]     = useState('')
  const [savedAddrs, setSavedAddrs]     = useState<SavedAddr[]>([])
  const [estimate, setEstimate]         = useState<Estimate | null>(null)
  const [estimating, setEstimating]     = useState(false)

  useEffect(() => {
    api.get('/users/me/addresses').then(r => setSavedAddrs(r.data)).catch(() => {})
  }, [])

  const fetchEstimate = useCallback(async (tier: SpeedTier, promo?: string | null) => {
    setEstimating(true)
    try {
      const { data } = await api.post('/orders/estimate', { speed_tier: tier, promo_code: promo || undefined })
      setEstimate(data)
    } catch { /* ignore */ } finally { setEstimating(false) }
  }, [])

  useEffect(() => {
    if (step === 'speed' || step === 'confirm') fetchEstimate(speed, promoApplied)
  }, [step, speed, promoApplied, fetchEstimate])

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const canProceed = form.pickupAddress && form.pickupPhone && form.deliveryAddress && form.deliveryPhone && form.itemContent

  const applyPromo = () => {
    const code = promoInput.trim().toUpperCase()
    if (VALID_PROMOS[code]) { setPromoApplied(code); setPromoError('') }
    else { setPromoError('折扣碼無效或已過期'); setPromoApplied(null) }
  }

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      const { data: order } = await api.post('/orders', {
        service_type:     service,
        pickup_address:   form.pickupAddress,
        pickup_phone:     form.pickupPhone,
        delivery_address: form.deliveryAddress,
        delivery_phone:   form.deliveryPhone,
        item_content:     form.itemContent,
        item_note:        form.itemNote || undefined,
        speed_tier:       speed,
        promo_code:       promoApplied || undefined,
        scheduled_at:     isScheduled && scheduleTime ? new Date(scheduleTime).toISOString() : undefined,
      })
      navigate(`/tracking?id=${order.id}&new=1`)
    } catch (e: any) {
      alert(e?.response?.data?.error || '下單失敗，請再試一次')
    } finally { setSubmitting(false) }
  }

  const est = estimate

  return (
    <div className="min-h-screen animate-fade-in">
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => step === 'info' ? navigate(-1) : setStep(step === 'speed' ? 'info' : 'speed')}
            className="p-2 rounded-xl bg-white hover:bg-paper-100 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="text-paper-500 text-xs mb-0.5">{SERVICE_LABELS[service]}</div>
            <h1 className="text-xl font-bold">填寫任務資訊</h1>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {(['info', 'speed', 'confirm'] as Step[]).map((s, i) => {
            const done = (step === 'speed' && i === 0) || (step === 'confirm' && i < 2)
            const active = step === s
            const labels = ['任務資訊', '選擇速度', '確認下單']
            return (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors
                  ${done ? 'bg-paper-900 text-white' : active ? 'border-2 border-paper-900 text-paper-900 bg-white' : 'bg-paper-200 text-paper-500'}`}>
                  {done ? <Check size={14} /> : i + 1}
                </div>
                <span className={`text-xs font-medium ${active ? 'text-paper-900' : 'text-paper-500'}`}>{labels[i]}</span>
                {i < 2 && <div className="flex-1 h-px bg-paper-200" />}
              </div>
            )
          })}
        </div>

        {/* ── STEP 1 ── */}
        {step === 'info' && (
          <div className="animate-slide-up space-y-6">
            {/* Pickup */}
            <AddressBlock
              title="取件資訊" color="paper-900" colorClass="bg-white"
              icon={<Navigation size={12} className="text-paper-900" />}
              savedAddrs={savedAddrs}
              onSaved={a => setForm(p => ({ ...p, pickupAddress: a }))}
              addrValue={form.pickupAddress} addrChange={handleChange('pickupAddress')}
              phoneValue={form.pickupPhone} phoneChange={handleChange('pickupPhone')}
              addrPlaceholder="取件地址" phonePlaceholder="取件聯絡電話"
            />
            {/* Delivery */}
            <AddressBlock
              title="送達資訊" color="amber-600" colorClass="bg-amber-100"
              icon={<MapPin size={12} className="text-amber-600" />}
              savedAddrs={savedAddrs}
              onSaved={a => setForm(p => ({ ...p, deliveryAddress: a }))}
              addrValue={form.deliveryAddress} addrChange={handleChange('deliveryAddress')}
              phoneValue={form.deliveryPhone} phoneChange={handleChange('deliveryPhone')}
              addrPlaceholder="送達地址" phonePlaceholder="收件人電話"
            />
            {/* Item */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                  <Package size={12} className="text-orange-600" />
                </div>
                <h2 className="font-bold text-sm">物品資訊</h2>
              </div>
              <div className="input-group">
                <div className="flex items-center">
                  <FileText size={16} className="text-paper-500 ml-4 flex-shrink-0" />
                  <input className="input-field" placeholder="物品內容，例如：合約、樣品、小包裹"
                    value={form.itemContent} onChange={handleChange('itemContent')} />
                </div>
                <div className="flex items-start pt-1">
                  <StickyNote size={16} className="text-paper-500 ml-4 mt-4 flex-shrink-0" />
                  <textarea className="input-field resize-none min-h-[80px]"
                    placeholder="備註（選填）"
                    value={form.itemNote} onChange={handleChange('itemNote')} />
                </div>
              </div>
            </div>
            {/* Schedule */}
            <div>
              <button onClick={() => setIsScheduled(!isScheduled)}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all
                  ${isScheduled ? 'border-paper-900 bg-paper-50' : 'border-paper-200 bg-white hover:border-paper-400'}`}>
                <CalendarClock size={18} className={isScheduled ? 'text-paper-900' : 'text-paper-500'} />
                <div className="flex-1 text-left">
                  <div className={`font-semibold text-sm ${isScheduled ? 'text-paper-900' : 'text-paper-600'}`}>預約取件時間</div>
                  <div className="text-paper-500 text-xs mt-0.5">指定未來時間取件</div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isScheduled ? 'border-paper-900 bg-paper-900' : 'border-paper-300'}`}>
                  {isScheduled && <Check size={11} className="text-white" />}
                </div>
              </button>
              {isScheduled && (
                <div className="mt-2">
                  <input type="datetime-local" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
                    className="w-full bg-white border border-paper-200 rounded-2xl px-4 py-3 text-sm text-paper-900 outline-none focus:border-paper-600" />
                </div>
              )}
            </div>
            <button disabled={!canProceed} onClick={() => setStep('speed')} className="btn-primary w-full">
              下一步：選擇配送速度 <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 'speed' && (
          <div className="animate-slide-up space-y-4">
            <h2 className="font-bold mb-2">選擇配送速度</h2>
            {SPEED_OPTIONS.map(opt => {
              const Icon = opt.icon
              const active = speed === opt.id
              return (
                <button key={opt.id} onClick={() => setSpeed(opt.id)}
                  className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200
                    ${active ? 'border-paper-900 bg-indigo-50' : 'border-paper-200 bg-white hover:border-paper-400'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? 'bg-indigo-100' : 'bg-paper-100'}`}>
                        <Icon size={20} className={active ? 'text-paper-900' : 'text-paper-500'} />
                      </div>
                      <div>
                        <div className="font-bold text-base">{opt.label}</div>
                        <div className="text-paper-500 text-sm mt-0.5">{opt.description} ｜ {opt.timeRange}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="font-bold text-base">{opt.surcharge === 0 ? '免費' : `+NT$${opt.surcharge}`}</div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${active ? 'border-paper-900 bg-paper-900' : 'border-paper-300'}`}>
                        {active && <Check size={12} className="text-white" />}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
            <div className="card flex items-center justify-between">
              {estimating ? (
                <div className="flex items-center gap-2 text-paper-500 text-sm"><Loader2 size={14} className="animate-spin" /> 計算距離中…</div>
              ) : est ? (
                <div className="text-paper-500 text-sm">距離約 {est.distance} 公里 · 預估 {est.duration} 分鐘</div>
              ) : <span />}
              <button onClick={() => fetchEstimate(speed, promoApplied)} className="p-1.5 rounded-lg text-paper-400 hover:text-paper-900 transition-colors">
                <RefreshCw size={14} />
              </button>
            </div>
            <button onClick={() => setStep('confirm')} className="btn-primary w-full">
              下一步：確認訂單 <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ── STEP 3 ── */}
        {step === 'confirm' && (
          <div className="animate-slide-up space-y-4">
            <h2 className="font-bold mb-2">確認訂單內容</h2>
            <div className="card space-y-3">
              <Row label="服務類型" value={SERVICE_LABELS[service]} />
              <Row label="配送速度" value={`${SPEED_OPTIONS.find(o => o.id === speed)!.label} · ${SPEED_OPTIONS.find(o => o.id === speed)!.timeRange}`} />
              {isScheduled && scheduleTime && <Row label="預約取件" value={new Date(scheduleTime).toLocaleString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} />}
              <div className="h-px bg-paper-100" />
              <Row label="取件地址" value={form.pickupAddress} />
              <Row label="取件電話" value={form.pickupPhone} />
              <div className="h-px bg-paper-100" />
              <Row label="送達地址" value={form.deliveryAddress} />
              <Row label="收件電話" value={form.deliveryPhone} />
              <div className="h-px bg-paper-100" />
              <Row label="物品內容" value={form.itemContent} />
              {form.itemNote && <Row label="備註" value={form.itemNote} />}
            </div>

            {/* Promo */}
            <div className="card">
              <div className="flex items-center gap-2 mb-3"><Tag size={14} className="text-paper-900" /><span className="font-semibold text-sm">折扣碼</span></div>
              {promoApplied ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-600" />
                    <span className="text-emerald-700 font-semibold text-sm">{promoApplied}</span>
                    <span className="text-paper-500 text-sm">折抵 NT${VALID_PROMOS[promoApplied]}</span>
                  </div>
                  <button onClick={() => { setPromoApplied(null); setPromoInput('') }}><X size={14} /></button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input className="flex-1 bg-white border border-paper-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-paper-600"
                    placeholder="輸入折扣碼" value={promoInput}
                    onChange={e => { setPromoInput(e.target.value); setPromoError('') }}
                    onKeyDown={e => e.key === 'Enter' && applyPromo()} />
                  <button onClick={applyPromo} className="px-4 py-2.5 bg-white hover:bg-paper-100 border border-paper-200 rounded-xl text-sm font-medium transition-colors">套用</button>
                </div>
              )}
              {promoError && <div className="text-red-400 text-xs mt-1.5">{promoError}</div>}
              <div className="text-paper-400 text-xs mt-2">試試看：UFLY50 / NEW100 / VIP200</div>
            </div>

            {/* Fee */}
            <div className="card space-y-2">
              <div className="font-semibold mb-3 text-xs text-paper-500 uppercase tracking-wider">費用明細</div>
              {est ? (
                <>
                  <Row label="基本費用" value={`NT$${est.base_fee}`} />
                  <Row label={`${SPEED_OPTIONS.find(o=>o.id===speed)!.label}加價`} value={est.surcharge === 0 ? '免費' : `+NT$${est.surcharge}`} />
                  {est.discount > 0 && <Row label={`折扣碼 ${promoApplied}`} value={`-NT$${est.discount}`} />}
                  <div className="h-px bg-paper-100 my-1" />
                  <div className="flex items-center justify-between">
                    <span className="font-bold">預估總金額</span>
                    <div className="text-right">
                      {est.discount > 0 && <div className="text-paper-500 text-xs line-through">NT${est.base_fee + est.surcharge}</div>}
                      <span className="font-black text-xl">NT${est.total_fee}</span>
                    </div>
                  </div>
                  <div className="text-paper-500 text-xs">距離 {est.distance} 公里 · 預估 {est.duration} 分鐘 · 實際費用送達後結算</div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-paper-500 text-sm"><Loader2 size={14} className="animate-spin" /> 計算中…</div>
              )}
            </div>

            <button onClick={handleSubmit} disabled={submitting || !est} className="btn-primary w-full text-base py-4">
              {submitting ? <><Loader2 size={16} className="animate-spin" /> 建立中…</> : <>確認下單 <ArrowRight size={16} /></>}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function AddressBlock({ title, icon, colorClass, savedAddrs, onSaved, addrValue, addrChange, phoneValue, phoneChange, addrPlaceholder, phonePlaceholder }: {
  title: string; icon: React.ReactNode; colorClass: string; color?: string
  savedAddrs: SavedAddr[]; onSaved: (a: string) => void
  addrValue: string; addrChange: any; phoneValue: string; phoneChange: any
  addrPlaceholder: string; phonePlaceholder: string
}) {
  const icons: Record<string, React.ReactNode> = { home: <Home size={11} />, work: <Briefcase size={11} /> }
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 ${colorClass} rounded-full flex items-center justify-center`}>{icon}</div>
          <h2 className="font-bold text-sm">{title}</h2>
        </div>
        {savedAddrs.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {savedAddrs.slice(0, 3).map(a => (
              <button key={a.id} onClick={() => onSaved(a.address)}
                className="flex items-center gap-1 px-2 py-1 bg-white hover:bg-paper-100 rounded-lg text-xs text-paper-600 hover:text-paper-900 transition-colors">
                {icons[a.type] || <MapPin size={11} />} {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="input-group">
        <div className="flex items-center">
          <MapPin size={16} className="text-paper-500 ml-4 flex-shrink-0" />
          <input className="input-field" placeholder={addrPlaceholder} value={addrValue} onChange={addrChange} />
        </div>
        <div className="flex items-center">
          <Phone size={16} className="text-paper-500 ml-4 flex-shrink-0" />
          <input className="input-field" placeholder={phonePlaceholder} type="tel" value={phoneValue} onChange={phoneChange} />
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-paper-500 text-sm flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  )
}
