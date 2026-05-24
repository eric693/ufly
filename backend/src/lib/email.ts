import nodemailer from 'nodemailer'

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (transporter) return transporter
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!user || !pass) return null

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: { user, pass },
  })
  return transporter
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const t = getTransporter()
  if (!t) return // SMTP not configured — silently skip

  const from = process.env.SMTP_FROM || process.env.SMTP_USER
  await t.sendMail({ from, to, subject, html })
}

export function orderStatusEmail(orderId: string, status: string): string {
  const msgs: Record<string, string> = {
    accepted: '已接單 — 夥伴正在準備前往取件',
    pickup:   '取件中 — 夥伴已抵達取件地點',
    delivering: '配送中 — 物品正在送往目的地',
    completed: '已送達 — 感謝您使用 Ufly 城市任務平台',
    cancelled: '已取消 — 如有疑問請聯絡客服',
  }
  const detail = msgs[status] ?? status
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#6366f1">Ufly 城市任務平台</h2>
      <p>訂單 <strong>${orderId}</strong> 狀態更新：</p>
      <p style="font-size:1.2em;font-weight:bold">${detail}</p>
      <hr/>
      <p style="color:#888;font-size:0.85em">此為系統自動發送，請勿回覆。</p>
    </div>
  `
}
