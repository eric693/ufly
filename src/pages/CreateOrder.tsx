import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  MapPin, Phone, Package, FileText, StickyNote,
  ChevronRight, ArrowLeft, ArrowRight, Check, Navigation,
  Clock, Zap, Star, Truck, Home, Briefcase, Tag,
  CalendarClock, X,
} from 'lucide-react'
import type { SpeedTier, ServiceType } from '../types'
import { SPEED_OPTIONS } from '../data/mockData'

const SERVICE_LABELS: Record<string, string> = {
  document:   '文件急送',
  delivery:   '物品配送',
  purchase:   '即時代購',
  errand:     '即時代辦',
  business:   '商務急件',
  custom:     '客製任務',
  key:        '鑰匙急送',
  ticket:     '票券文件',
  gift:       '禮品配送',
  designated: '指定送達',
}

const SPEED_ICONS: Record<SpeedTier, React.ElementType> = {
  standard: Truck,
  express:  Zap,
  priority: Star,
  urgent:   Clock,
}

const SAVED_ADDRESSES = [
  { icon: Home,     label: '家',   address: '台中市豐原區中正路100號' },
  { icon: Briefcase, label: '公司', address: '台中市西屯區台灣大道三段1000號' },
]

const VALID_PROMOS: Record<string, number> = {
  'UFLY50':  50,
  'NEW100':  100,
  'VIP200':  200,
}

type Step = 'info' | 'speed' | 'confirm'

export default function CreateOrder() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('info')
  const [service] = useState<ServiceType>((params.get('service') as ServiceType) || 'document')
  const [speed, setSpeed] = useState<SpeedTier>('standard')
  const [form, setForm] = useState({
    pickupAddress: '',
    pickupPhone:   '',
    deliveryAddress: '',
    deliveryPhone:   '',
    itemContent:   '',
    itemNote:      '',
  })
  // Schedule
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduleTime, setScheduleTime] = useState('')
  // Promo
  const [promoInput, setPromoInput]     = useState('')
  const [promoApplied, setPromoApplied] = useState<string | null>(null)
  const [promoError, setPromoError]     = useState('')

  const BASE_FEE = 120
  const selected = SPEED_OPTIONS.find(o => o.id === speed)!
  const discount = promoApplied ? VALID_PROMOS[promoApplied] : 0
  const total = Math.max(0, BASE_FEE + selected.surcharge - discount)

  const handleChange = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  const canProceed = form.pickupAddress && form.pickupPhone && form.deliveryAddress && form.deliveryPhone && form.itemContent

  const applyPromo = () => {
    const code = promoInput.trim().toUpperCase()
    if (VALID_PROMOS[code]) {
      setPromoApplied(code)
      setPromoError('')
    } else {
      setPromoError('折扣碼無效或已過期')
      setPromoApplied(null)
    }
  }

  const handleSubmit = () => navigate('/tracking?new=1')

  return (
    <div className="min-h-screen animate-fade-in">
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => step === 'info' ? navigate(-1) : setStep(step === 'speed' ? 'info' : 'speed')}
            className="p-2 rounded-xl bg-surface-700 hover:bg-surface-600 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="text-surface-300 text-xs mb-0.5">{SERVICE_LABELS[service]}</div>
            <h1 className="text-xl font-bold">填寫任務資訊</h1>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {(['info', 'speed', 'confirm'] as Step[]).map((s, i) => {
            const done   = (step === 'speed' && i === 0) || (step === 'confirm' && i < 2)
            const active = step === s
            const labels = ['任務資訊', '選擇速度', '確認下單']
            return (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors
                  ${done ? 'bg-white text-black' : active ? 'bg-white/10 border-2 border-white text-white' : 'bg-surface-700 text-surface-400'}`}>
                  {done ? <Check size={14} /> : i + 1}
                </div>
                <span className={`text-xs font-medium ${active ? 'text-white' : 'text-surface-400'}`}>{labels[i]}</span>
                {i < 2 && <div className="flex-1 h-px bg-surface-700" />}
              </div>
            )
          })}
        </div>

        {/* ── STEP 1: Info ── */}
        {step === 'info' && (
          <div className="animate-slide-up space-y-6">
            {/* Pickup */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                    <Navigation size={12} className="text-white" />
                  </div>
                  <h2 className="font-bold text-sm">取件資訊</h2>
                </div>
                {/* Saved address shortcuts */}
                <div className="flex gap-1.5">
                  {SAVED_ADDRESSES.map(a => (
                    <button key={a.label}
                      onClick={() => setForm(p => ({ ...p, pickupAddress: a.address }))}
                      className="flex items-center gap-1 px-2 py-1 bg-surface-700 hover:bg-surface-600
                                 rounded-lg text-xs text-surface-200 hover:text-white transition-colors">
                      <a.icon size={11} className="text-white" /> {a.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="input-group">
                <div className="flex items-center">
                  <MapPin size={16} className="text-surface-300 ml-4 flex-shrink-0" />
                  <input className="input-field" placeholder="取件地址（越完整估價越準）"
                    value={form.pickupAddress} onChange={handleChange('pickupAddress')} />
                </div>
                <div className="flex items-center">
                  <Phone size={16} className="text-surface-300 ml-4 flex-shrink-0" />
                  <input className="input-field" placeholder="取件聯絡電話" type="tel"
                    value={form.pickupPhone} onChange={handleChange('pickupPhone')} />
                </div>
              </div>
            </div>

            {/* Delivery */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-surface-500 rounded-full flex items-center justify-center">
                    <MapPin size={12} className="text-white" />
                  </div>
                  <h2 className="font-bold text-sm">送達資訊</h2>
                </div>
                <div className="flex gap-1.5">
                  {SAVED_ADDRESSES.map(a => (
                    <button key={a.label}
                      onClick={() => setForm(p => ({ ...p, deliveryAddress: a.address }))}
                      className="flex items-center gap-1 px-2 py-1 bg-surface-700 hover:bg-surface-600
                                 rounded-lg text-xs text-surface-200 hover:text-white transition-colors">
                      <a.icon size={11} className="text-white" /> {a.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="input-group">
                <div className="flex items-center">
                  <MapPin size={16} className="text-surface-300 ml-4 flex-shrink-0" />
                  <input className="input-field" placeholder="送達地址"
                    value={form.deliveryAddress} onChange={handleChange('deliveryAddress')} />
                </div>
                <div className="flex items-center">
                  <Phone size={16} className="text-surface-300 ml-4 flex-shrink-0" />
                  <input className="input-field" placeholder="收件人電話" type="tel"
                    value={form.deliveryPhone} onChange={handleChange('deliveryPhone')} />
                </div>
              </div>
            </div>

            {/* Item */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-surface-500 rounded-full flex items-center justify-center">
                  <Package size={12} className="text-white" />
                </div>
                <h2 className="font-bold text-sm">物品資訊</h2>
              </div>
              <div className="input-group">
                <div className="flex items-center">
                  <FileText size={16} className="text-surface-300 ml-4 flex-shrink-0" />
                  <input className="input-field" placeholder="物品內容，例如：合約、樣品、小包裹"
                    value={form.itemContent} onChange={handleChange('itemContent')} />
                </div>
                <div className="flex items-start pt-1">
                  <StickyNote size={16} className="text-surface-300 ml-4 mt-4 flex-shrink-0" />
                  <textarea className="input-field resize-none min-h-[80px]"
                    placeholder="備註，例如：請到櫃台取件、送達前請電話聯繫"
                    value={form.itemNote} onChange={handleChange('itemNote')} />
                </div>
              </div>
            </div>

            {/* Schedule toggle */}
            <div>
              <button onClick={() => setIsScheduled(!isScheduled)}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all
                  ${isScheduled ? 'border-white bg-white/8' : 'border-surface-600 bg-surface-700 hover:border-surface-500'}`}>
                <CalendarClock size={18} className={isScheduled ? 'text-white' : 'text-surface-300'} />
                <div className="flex-1 text-left">
                  <div className={`font-semibold text-sm ${isScheduled ? 'text-white' : 'text-surface-200'}`}>
                    預約取件時間
                  </div>
                  <div className="text-surface-400 text-xs mt-0.5">指定未來時間取件，適合提前安排</div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                  ${isScheduled ? 'border-white bg-white' : 'border-surface-500'}`}>
                  {isScheduled && <Check size={11} className="text-white" />}
                </div>
              </button>

              {isScheduled && (
                <div className="mt-2">
                  <input
                    type="datetime-local"
                    value={scheduleTime}
                    onChange={e => setScheduleTime(e.target.value)}
                    className="w-full bg-surface-700 border border-white/30 rounded-2xl
                               px-4 py-3 text-sm text-white outline-none focus:border-white
                               [color-scheme:dark]"
                  />
                </div>
              )}
            </div>

            <button disabled={!canProceed} onClick={() => setStep('speed')} className="btn-primary w-full">
              下一步：選擇配送速度 <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ── STEP 2: Speed ── */}
        {step === 'speed' && (
          <div className="animate-slide-up space-y-4">
            <h2 className="font-bold mb-2">選擇配送速度</h2>
            {SPEED_OPTIONS.map(opt => {
              const Icon = SPEED_ICONS[opt.id]
              const active = speed === opt.id
              return (
                <button key={opt.id} onClick={() => setSpeed(opt.id)}
                  className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200
                    ${active ? 'border-white bg-white/8' : 'border-surface-600 bg-surface-700 hover:border-surface-500'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                        ${active ? 'bg-white/10' : 'bg-surface-600'}`}>
                        <Icon size={20} className={active ? 'text-white' : 'text-surface-300'} />
                      </div>
                      <div>
                        <div className="font-bold text-base">{opt.label}</div>
                        <div className="text-surface-300 text-sm mt-0.5">
                          {opt.description} ｜ {opt.timeRange}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`font-bold text-base ${opt.surcharge === 0 ? 'text-white' : 'text-white'}`}>
                        {opt.surcharge === 0 ? '+NT$0' : `+NT$${opt.surcharge}`}
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center
                        ${active ? 'border-white bg-white' : 'border-surface-500'}`}>
                        {active && <Check size={12} className="text-white" />}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
            <div className="card flex items-center justify-between mt-2">
              <div className="text-surface-300 text-sm">距離約 9.2 公里 · 預估 34 分鐘</div>
            </div>
            <button onClick={() => setStep('confirm')} className="btn-primary w-full">
              下一步：確認訂單 <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ── STEP 3: Confirm ── */}
        {step === 'confirm' && (
          <div className="animate-slide-up space-y-4">
            <h2 className="font-bold mb-2">確認訂單內容</h2>

            <div className="card space-y-3">
              <Row label="服務類型" value={SERVICE_LABELS[service]} />
              <Row label="配送速度" value={`${selected.label} · ${selected.timeRange}`} />
              {isScheduled && scheduleTime && (
                <Row label="預約取件" value={new Date(scheduleTime).toLocaleString('zh-TW', {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })} />
              )}
              <div className="h-px bg-surface-600" />
              <Row label="取件地址" value={form.pickupAddress} />
              <Row label="取件電話" value={form.pickupPhone} />
              <div className="h-px bg-surface-600" />
              <Row label="送達地址" value={form.deliveryAddress} />
              <Row label="收件電話" value={form.deliveryPhone} />
              <div className="h-px bg-surface-600" />
              <Row label="物品內容" value={form.itemContent} />
              {form.itemNote && <Row label="備註" value={form.itemNote} />}
            </div>

            {/* Promo code */}
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <Tag size={14} className="text-white" />
                <span className="font-semibold text-sm">折扣碼</span>
              </div>
              {promoApplied ? (
                <div className="flex items-center justify-between bg-white/8 border border-white/20
                                rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-white" />
                    <span className="text-white font-semibold text-sm">{promoApplied}</span>
                    <span className="text-gray-300 text-sm">折抵 NT${discount}</span>
                  </div>
                  <button onClick={() => { setPromoApplied(null); setPromoInput('') }}
                    className="text-surface-400 hover:text-white"><X size={14} /></button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-surface-700 border border-surface-600 rounded-xl px-3 py-2.5
                               text-sm text-white placeholder-surface-400 outline-none focus:border-white"
                    placeholder="輸入折扣碼"
                    value={promoInput}
                    onChange={e => { setPromoInput(e.target.value); setPromoError('') }}
                    onKeyDown={e => e.key === 'Enter' && applyPromo()}
                  />
                  <button onClick={applyPromo}
                    className="px-4 py-2.5 bg-surface-700 hover:bg-surface-600 border border-surface-600
                               rounded-xl text-sm font-medium transition-colors">
                    套用
                  </button>
                </div>
              )}
              {promoError && <div className="text-red-400 text-xs mt-1.5">{promoError}</div>}
              <div className="text-surface-500 text-xs mt-2">試試看：UFLY50 / NEW100 / VIP200</div>
            </div>

            {/* Fee breakdown */}
            <div className="card space-y-2">
              <div className="font-semibold mb-3 text-xs text-surface-400 uppercase tracking-wider">費用明細</div>
              <Row label="基本費用"              value={`NT$${BASE_FEE}`} />
              <Row label={`${selected.label}加價`} value={selected.surcharge === 0 ? '免費' : `+NT$${selected.surcharge}`} />
              {discount > 0 && (
                <Row label={`折扣碼 ${promoApplied}`} value={`-NT$${discount}`} />
              )}
              <div className="h-px bg-surface-600 my-1" />
              <div className="flex items-center justify-between">
                <span className="font-bold">預估總金額</span>
                <div className="text-right">
                  {discount > 0 && (
                    <div className="text-surface-400 text-xs line-through">NT${BASE_FEE + selected.surcharge}</div>
                  )}
                  <span className="font-black text-xl text-white">NT${total}</span>
                </div>
              </div>
              <div className="text-surface-400 text-xs">實際費用依距離計算，送達後結算</div>
            </div>

            <button onClick={handleSubmit} className="btn-primary w-full text-base py-4">
              確認下單 <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-surface-300 text-sm flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  )
}
