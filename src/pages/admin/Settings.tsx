import { useState, useEffect } from 'react'
import { Save, MapPin, DollarSign, Bell, Shield, Globe, Loader2, Check, CreditCard, Mail, Eye, EyeOff } from 'lucide-react'
import api from '../../lib/api'

const DEFAULT_SETTINGS = {
  platformName: 'Ufly 城市任務平台',
  serviceArea: '台北市（以中正區為主）',
  baseFee: '120',
  expressSurcharge: '30',
  prioritySurcharge: '80',
  urgentSurcharge: '150',
  notifyNewOrder: true,
  notifyDriverMatch: true,
  notifyOrderComplete: true,
  maxOrderDistance: '25',
  autoMatchRadius: '5',
  ecpayMerchantId: '',
  ecpayHashKey: '',
  ecpayHashIv: '',
  ecpayStage: true,
  smtpHost: 'smtp.gmail.com',
  smtpPort: '587',
  smtpUser: '',
  smtpPass: '',
  smtpFrom: '',
}

type Settings = typeof DEFAULT_SETTINGS

export default function AdminSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [showHashKey, setShowHashKey] = useState(false)
  const [showHashIv, setShowHashIv]   = useState(false)
  const [showSmtpPass, setShowSmtpPass] = useState(false)

  useEffect(() => {
    api.get('/admin/settings')
      .then(r => setSettings({ ...DEFAULT_SETTINGS, ...r.data }))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const set = (key: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setSettings(prev => ({ ...prev, [key]: e.type === 'checkbox' ? e.target.checked : e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/admin/settings', settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      alert('儲存失敗，請稍後重試')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <Loader2 size={24} className="animate-spin text-gray-400" />
    </div>
  )

  return (
    <div className="animate-fade-in space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">系統設定</h1>
        <button onClick={handleSave} disabled={saving}
          className="btn-primary py-2 text-sm flex items-center gap-2 disabled:opacity-60">
          {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : <Save size={16} />}
          {saved ? '已儲存' : '儲存設定'}
        </button>
      </div>

      <Section icon={Globe} title="平台資訊">
        <Field label="平台名稱">
          <TextInput value={settings.platformName} onChange={set('platformName')} />
        </Field>
        <Field label="服務範圍說明">
          <TextInput value={settings.serviceArea} onChange={set('serviceArea')} />
        </Field>
      </Section>

      <Section icon={DollarSign} title="費用設定">
        <Field label="基本費用 (NT$)">
          <TextInput type="number" value={settings.baseFee} onChange={set('baseFee')} />
        </Field>
        <Field label="快速件加價 (NT$)">
          <TextInput type="number" value={settings.expressSurcharge} onChange={set('expressSurcharge')} />
        </Field>
        <Field label="優先件加價 (NT$)">
          <TextInput type="number" value={settings.prioritySurcharge} onChange={set('prioritySurcharge')} />
        </Field>
        <Field label="急件加價 (NT$)">
          <TextInput type="number" value={settings.urgentSurcharge} onChange={set('urgentSurcharge')} />
        </Field>
      </Section>

      <Section icon={MapPin} title="媒合設定">
        <Field label="最大接單距離 (公里)">
          <TextInput type="number" value={settings.maxOrderDistance} onChange={set('maxOrderDistance')} />
        </Field>
        <Field label="自動媒合半徑 (公里)">
          <TextInput type="number" value={settings.autoMatchRadius} onChange={set('autoMatchRadius')} />
        </Field>
      </Section>

      <Section icon={Bell} title="通知設定">
        {([
          { key: 'notifyNewOrder' as const, label: '新訂單通知' },
          { key: 'notifyDriverMatch' as const, label: '夥伴媒合通知' },
          { key: 'notifyOrderComplete' as const, label: '訂單完成通知' },
        ]).map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between py-2">
            <span className="text-sm font-medium">{label}</span>
            <Toggle checked={settings[key] as boolean}
              onChange={e => setSettings(p => ({ ...p, [key]: e.target.checked }))} />
          </div>
        ))}
      </Section>

      <Section icon={CreditCard} title="ECPay 綠界金流">
        <div className="text-gray-400 text-xs mb-3 leading-relaxed">
          前往 <span className="text-white font-mono">vendor.ecpay.com.tw</span> 申請帳號後，將以下資訊填入即可啟用線上付款。
          空白時付款功能會顯示「金流尚未設定」。
        </div>
        <Field label="環境">
          <div className="flex items-center gap-3">
            <Toggle
              checked={settings.ecpayStage}
              onChange={e => setSettings(p => ({ ...p, ecpayStage: e.target.checked }))}
            />
            <span className="text-sm text-gray-300">
              {settings.ecpayStage ? '測試環境（不會真實扣款）' : '正式環境（真實收款）'}
            </span>
          </div>
        </Field>
        <Field label="特店編號 MerchantID">
          <TextInput value={settings.ecpayMerchantId} onChange={set('ecpayMerchantId')} placeholder="2000132" />
        </Field>
        <Field label="HashKey">
          <PasswordInput
            value={settings.ecpayHashKey}
            onChange={set('ecpayHashKey')}
            show={showHashKey}
            onToggle={() => setShowHashKey(v => !v)}
            placeholder="5294y06JbISpM5x9"
          />
        </Field>
        <Field label="HashIV">
          <PasswordInput
            value={settings.ecpayHashIv}
            onChange={set('ecpayHashIv')}
            show={showHashIv}
            onToggle={() => setShowHashIv(v => !v)}
            placeholder="v77hoKGq4kWxNNIS"
          />
        </Field>
      </Section>

      <Section icon={Mail} title="Email 通知（SMTP）">
        <div className="text-gray-400 text-xs mb-3 leading-relaxed">
          設定後系統會在訂單狀態變更時寄送通知信。使用 Gmail 請先開啟「應用程式密碼」。
        </div>
        <Field label="SMTP 主機">
          <TextInput value={settings.smtpHost} onChange={set('smtpHost')} placeholder="smtp.gmail.com" />
        </Field>
        <Field label="Port">
          <TextInput type="number" value={settings.smtpPort} onChange={set('smtpPort')} placeholder="587" />
        </Field>
        <Field label="帳號（發信 Email）">
          <TextInput value={settings.smtpUser} onChange={set('smtpUser')} placeholder="noreply@example.com" />
        </Field>
        <Field label="密碼 / 應用程式密碼">
          <PasswordInput
            value={settings.smtpPass}
            onChange={set('smtpPass')}
            show={showSmtpPass}
            onToggle={() => setShowSmtpPass(v => !v)}
            placeholder="••••••••••••••••"
          />
        </Field>
        <Field label="寄件人名稱（From）">
          <TextInput value={settings.smtpFrom} onChange={set('smtpFrom')} placeholder="Ufly 城市任務平台 <noreply@example.com>" />
        </Field>
      </Section>

      <Section icon={Shield} title="安全設定">
        <div className="text-gray-400 text-sm py-2">
          所有夥伴均需完成實名驗證後方可接單。<br />
          平台採用 TLS 加密傳輸，交易資料安全儲存。
        </div>
        <button className="btn-secondary py-2 text-sm mt-2">管理存取權限</button>
      </Section>
    </div>
  )
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-surface-700">
        <Icon size={16} className="text-white" />
        <h2 className="font-bold text-sm">{title}</h2>
      </div>
      <div className="px-5 py-4 space-y-3">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <label className="text-gray-300 text-sm w-40 flex-shrink-0">{label}</label>
      {children}
    </div>
  )
}

function TextInput({ value, onChange, type = 'text', placeholder }: {
  value: string; onChange: React.ChangeEventHandler<HTMLInputElement>; type?: string; placeholder?: string
}) {
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      className="flex-1 bg-surface-700 border border-surface-600 rounded-xl px-3 py-2
                 text-sm text-white placeholder-surface-500 focus:border-white transition-colors outline-none" />
  )
}

function PasswordInput({ value, onChange, show, onToggle, placeholder }: {
  value: string; onChange: React.ChangeEventHandler<HTMLInputElement>
  show: boolean; onToggle: () => void; placeholder?: string
}) {
  return (
    <div className="flex-1 relative">
      <input type={show ? 'text' : 'password'} value={value} onChange={onChange} placeholder={placeholder}
        className="w-full bg-surface-700 border border-surface-600 rounded-xl px-3 py-2 pr-10
                   text-sm text-white placeholder-surface-500 focus:border-white transition-colors outline-none font-mono" />
      <button type="button" onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors">
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: React.ChangeEventHandler<HTMLInputElement> }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
      <div className={`relative w-10 h-6 rounded-full transition-colors ${checked ? 'bg-white' : 'bg-surface-600'}`}>
        <div className={`absolute top-1 w-4 h-4 rounded-full shadow transition-transform
          ${checked ? 'translate-x-5 bg-black' : 'translate-x-1 bg-white'}`} />
      </div>
    </label>
  )
}
