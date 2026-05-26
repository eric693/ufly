import fs from 'fs'
import path from 'path'

const SETTINGS_PATH = path.join(__dirname, '../../settings.json')

export interface AppSettings {
  platformName: string
  serviceArea: string
  baseFee: string
  feePerKm: string
  expressSurcharge: string
  prioritySurcharge: string
  urgentSurcharge: string
  notifyNewOrder: boolean
  notifyDriverMatch: boolean
  notifyOrderComplete: boolean
  maxOrderDistance: string
  autoMatchRadius: string
  // ECPay
  ecpayMerchantId: string
  ecpayHashKey: string
  ecpayHashIv: string
  ecpayStage: boolean
  // SMTP
  smtpHost: string
  smtpPort: string
  smtpUser: string
  smtpPass: string
  smtpFrom: string
}

export const DEFAULT_SETTINGS: AppSettings = {
  platformName: 'Ufly 城市任務平台',
  serviceArea: '台北市（以中正區為主）',
  baseFee: '120',
  feePerKm: '12',
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

export function readSettings(): AppSettings {
  try {
    return fs.existsSync(SETTINGS_PATH)
      ? { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8')) }
      : DEFAULT_SETTINGS
  } catch { return DEFAULT_SETTINGS }
}

export function writeSettings(data: Partial<AppSettings>): AppSettings {
  const updated = { ...readSettings(), ...data }
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(updated, null, 2))
  return updated
}

export function getFeeConfig() {
  const s = readSettings()
  return {
    baseFee:    parseInt(s.baseFee)            || 120,
    feePerKm:   parseFloat(s.feePerKm)         || 12,
    surcharges: {
      standard: 0,
      express:  parseInt(s.expressSurcharge)  || 30,
      priority: parseInt(s.prioritySurcharge) || 80,
      urgent:   parseInt(s.urgentSurcharge)   || 150,
    },
  }
}
