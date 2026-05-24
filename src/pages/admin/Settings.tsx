import { useState } from 'react'
import { Save, MapPin, DollarSign, Bell, Shield, Globe } from 'lucide-react'

export default function AdminSettings() {
  const [saved, setSaved] = useState(false)
  const [settings, setSettings] = useState({
    platformName: 'Ufly 城市任務平台',
    serviceArea: '台中市（以豐原區為主）',
    baseFee: '120',
    expressSurcharge: '30',
    prioritySurcharge: '80',
    urgentSurcharge: '150',
    notifyNewOrder: true,
    notifyDriverMatch: true,
    notifyOrderComplete: true,
    maxOrderDistance: '25',
    autoMatchRadius: '5',
  })

  const set = (key: keyof typeof settings) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => setSettings(prev => ({ ...prev, [key]: e.type === 'checkbox' ? e.target.checked : e.target.value }))

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">系統設定</h1>
        <button onClick={handleSave} className="btn-primary py-2 text-sm">
          <Save size={16} /> {saved ? '已儲存' : '儲存設定'}
        </button>
      </div>

      {/* Platform */}
      <Section icon={Globe} title="平台資訊">
        <Field label="平台名稱">
          <TextInput value={settings.platformName} onChange={set('platformName')} />
        </Field>
        <Field label="服務範圍說明">
          <TextInput value={settings.serviceArea} onChange={set('serviceArea')} />
        </Field>
      </Section>

      {/* Pricing */}
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

      {/* Area */}
      <Section icon={MapPin} title="媒合設定">
        <Field label="最大接單距離 (公里)">
          <TextInput type="number" value={settings.maxOrderDistance} onChange={set('maxOrderDistance')} />
        </Field>
        <Field label="自動媒合半徑 (公里)">
          <TextInput type="number" value={settings.autoMatchRadius} onChange={set('autoMatchRadius')} />
        </Field>
      </Section>

      {/* Notifications */}
      <Section icon={Bell} title="通知設定">
        {[
          { key: 'notifyNewOrder' as const, label: '新訂單通知' },
          { key: 'notifyDriverMatch' as const, label: '夥伴媒合通知' },
          { key: 'notifyOrderComplete' as const, label: '訂單完成通知' },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between py-2">
            <span className="text-sm font-medium">{label}</span>
            <Toggle
              checked={settings[key] as boolean}
              onChange={e => setSettings(p => ({ ...p, [key]: e.target.checked }))}
            />
          </div>
        ))}
      </Section>

      {/* Security */}
      <Section icon={Shield} title="安全設定">
        <div className="text-surface-400 text-sm py-2">
          所有夥伴均需完成實名驗證後方可接單。<br />
          平台採用 TLS 加密傳輸，交易資料安全儲存。
        </div>
        <button className="btn-secondary py-2 text-sm mt-2">管理存取權限</button>
      </Section>
    </div>
  )
}

function Section({ icon: Icon, title, children }: {
  icon: React.ElementType; title: string; children: React.ReactNode
}) {
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
      <label className="text-surface-300 text-sm w-40 flex-shrink-0">{label}</label>
      {children}
    </div>
  )
}

function TextInput({ value, onChange, type = 'text' }: {
  value: string; onChange: React.ChangeEventHandler<HTMLInputElement>; type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      className="flex-1 bg-surface-700 border border-surface-600 rounded-xl px-3 py-2
                 text-sm text-white placeholder-surface-400 focus:border-white transition-colors outline-none"
    />
  )
}

function Toggle({ checked, onChange }: {
  checked: boolean; onChange: React.ChangeEventHandler<HTMLInputElement>
}) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
      <div className={`w-10 h-6 rounded-full transition-colors ${checked ? 'bg-white' : 'bg-surface-600'}`}>
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform
          ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
      </div>
    </label>
  )
}
