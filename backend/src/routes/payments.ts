import { Router } from 'express'
import crypto from 'crypto'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/requireAuth'
import { readSettings } from '../lib/settings'

const router = Router()

function getEcpayConfig() {
  const s = readSettings()
  return {
    merchantId: s.ecpayMerchantId || process.env.ECPAY_MERCHANT_ID || '',
    hashKey:    s.ecpayHashKey    || process.env.ECPAY_HASH_KEY    || '',
    hashIv:     s.ecpayHashIv     || process.env.ECPAY_HASH_IV     || '',
    stage:      s.ecpayMerchantId ? s.ecpayStage : (process.env.ECPAY_STAGE !== 'false'),
  }
}

function ecpayCheckMac(params: Record<string, string>): string {
  const { hashKey, hashIv } = getEcpayConfig()
  const sorted = Object.keys(params).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
  let raw = `HashKey=${hashKey}&` + sorted.map(k => `${k}=${params[k]}`).join('&') + `&HashIV=${hashIv}`
  raw = encodeURIComponent(raw).toLowerCase()
    .replace(/%2d/g, '-').replace(/%5f/g, '_').replace(/%2e/g, '.').replace(/%21/g, '!')
    .replace(/%2a/g, '*').replace(/%28/g, '(').replace(/%29/g, ')')
  return crypto.createHash('sha256').update(raw).digest('hex').toUpperCase()
}

// POST /api/payments/create — create an ECPay checkout redirect
router.post('/create', requireAuth, async (req: AuthRequest, res) => {
  const { order_id } = req.body
  if (!order_id) { res.status(400).json({ error: '缺少訂單編號' }); return }

  const order = await prisma.order.findFirst({ where: { id: order_id, userId: req.user!.id } })
  if (!order) { res.status(404).json({ error: '訂單不存在' }); return }

  const existing = await prisma.payment.findUnique({ where: { orderId: order_id } })
  if (existing?.status === 'paid') { res.status(400).json({ error: '訂單已付款' }); return }

  const merchantTradeNo = `UF${Date.now()}`.slice(0, 20)
  // ECPay requires exactly: yyyy/MM/dd HH:mm:ss (Taipei time)
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' }))
  const pad = (n: number) => String(n).padStart(2, '0')
  const merchantTradeDate = `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`

  const backendUrl = process.env.BACKEND_URL || 'https://ufly.crownai.ink'
  const frontendUrl = process.env.FRONTEND_URL || 'https://ufly.crownai.ink'

  const ecpay = getEcpayConfig()
  if (!ecpay.merchantId) { res.status(503).json({ error: '金流尚未設定，請聯絡管理員' }); return }
  const ecpayBase = ecpay.stage ? 'https://payment-stage.ecpay.com.tw' : 'https://payment.ecpay.com.tw'

  const params: Record<string, string> = {
    MerchantID: ecpay.merchantId,
    MerchantTradeNo: merchantTradeNo,
    MerchantTradeDate: merchantTradeDate,
    PaymentType: 'aio',
    TotalAmount: String(order.totalFee),
    TradeDesc: `Ufly訂單${order_id}`,
    ItemName: `配送服務 ${order.serviceType}`,
    ReturnURL: `${backendUrl}/api/payments/callback`,
    OrderResultURL: `${frontendUrl}/orders/${order_id}`,
    ChoosePayment: 'ALL',
    EncryptType: '1',
  }
  params.CheckMacValue = ecpayCheckMac(params)

  await prisma.payment.upsert({
    where: { orderId: order_id },
    create: { orderId: order_id, amount: order.totalFee, method: 'ecpay', status: 'pending', merchantTradeNo },
    update: { merchantTradeNo, status: 'pending' },
  })

  // Return the form data for the frontend to auto-submit
  res.json({ action: `${ecpayBase}/Cashier/AioCheckOut/V5`, params })
})

// POST /api/payments/callback — ECPay server-to-server callback
router.post('/callback', async (req, res) => {
  const body: Record<string, string> = req.body
  const { CheckMacValue, ...rest } = body
  const computed = ecpayCheckMac(rest)
  if (computed !== CheckMacValue) { res.send('0|Error'); return }

  if (body.RtnCode === '1') {
    const payment = await prisma.payment.findFirst({ where: { merchantTradeNo: body.MerchantTradeNo } })
    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'paid', tradeNo: body.TradeNo, paidAt: new Date() },
      })
    }
  }
  res.send('1|OK')
})

// GET /api/payments/:orderId — get payment status
router.get('/:orderId', requireAuth, async (req: AuthRequest, res) => {
  const order = await prisma.order.findFirst({ where: { id: req.params.orderId, userId: req.user!.id } })
  if (!order) { res.status(404).json({ error: '訂單不存在' }); return }
  const payment = await prisma.payment.findUnique({ where: { orderId: req.params.orderId } })
  res.json(payment || null)
})

export default router
