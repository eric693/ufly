import { Router } from 'express'
import { Server } from 'socket.io'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/requireAuth'
import { serializeOrder, serializeRecurring } from '../lib/serializer'
import { getFeeConfig } from '../lib/settings'
import { calcDistance } from '../lib/maps'
import { sendEmail, orderStatusEmail } from '../lib/email'
import { triggerWebhooks } from '../lib/webhook'

const router = Router()

const SPEED_MINUTES: Record<string, number> = { standard: 75, express: 52, priority: 37, urgent: 20 }
const FEE_PER_KM = 12

function estimateDistance() { return Math.round((4 + Math.random() * 14) * 10) / 10 }

function calcFare(distance: number, speedTier: string, discount = 0) {
  const { baseFee, surcharges } = getFeeConfig()
  const base      = baseFee + Math.round(distance * FEE_PER_KM)
  const surcharge = (surcharges as Record<string, number>)[speedTier] ?? 0
  const total     = Math.max(0, base + surcharge - discount)
  const duration  = Math.round((SPEED_MINUTES[speedTier] ?? 75) * (0.8 + distance / 20))
  return { base_fee: base, surcharge, discount, total_fee: total, duration }
}

async function nextOrderId() {
  const last = await prisma.order.findFirst({ where: { id: { startsWith: 'UF' } }, orderBy: { id: 'desc' } })
  if (!last) return 'UF240001'
  return 'UF' + String(parseInt(last.id.replace('UF', '')) + 1).padStart(6, '0')
}

async function notify(userId: string, type: string, title: string, body: string) {
  await prisma.notification.create({ data: { id: uuidv4(), userId, type, title, body } })
}

// Atomically validate + consume a promo code. Returns discount amount or 0.
async function consumePromo(code: string): Promise<{ discount: number; id: string | null }> {
  const rows = await prisma.$queryRaw<{ id: string; discount: number }[]>`
    UPDATE promo_codes
    SET usage_count = usage_count + 1
    WHERE code = ${code.toUpperCase()} AND active = true
      AND (usage_max IS NULL OR usage_count < usage_max)
    RETURNING id, discount
  `
  return rows[0] ? { discount: rows[0].discount, id: rows[0].id } : { discount: 0, id: null }
}

// Peek at promo without consuming (for estimate)
async function peekPromo(code: string): Promise<number> {
  const promo = await prisma.promoCode.findFirst({
    where: { code: code.toUpperCase(), active: true },
    select: { discount: true, usageMax: true, usageCount: true },
  })
  if (!promo) return 0
  if (promo.usageMax !== null && promo.usageCount >= promo.usageMax) return 0
  return promo.discount
}

const flatOrder = serializeOrder

// IMPORTANT: /recurring/* routes must come before /:id
router.get('/recurring/list', requireAuth, async (req: AuthRequest, res) => {
  const rows = await prisma.recurringOrder.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' } })
  res.json(rows.map(serializeRecurring))
})

router.post('/recurring', requireAuth, async (req: AuthRequest, res) => {
  const { service_type, pickup_address, delivery_address, item_content, speed_tier, schedule } = req.body
  if (!pickup_address || !delivery_address || !schedule) { res.status(400).json({ error: '缺少必要欄位' }); return }
  const nextRun = calcNextRun(schedule, new Date())
  const row = await prisma.recurringOrder.create({
    data: { id: uuidv4(), userId: req.user!.id, serviceType: service_type || 'delivery', pickupAddress: pickup_address, deliveryAddress: delivery_address, itemContent: item_content || null, speedTier: speed_tier || 'standard', schedule, nextRun },
  })
  res.json(serializeRecurring(row))
})

router.delete('/recurring/:id', requireAuth, async (req: AuthRequest, res) => {
  await prisma.recurringOrder.deleteMany({ where: { id: req.params.id, userId: req.user!.id } })
  res.json({ ok: true })
})

router.post('/estimate', requireAuth, async (req: AuthRequest, res) => {
  const { speed_tier = 'standard', promo_code } = req.body
  const distance = estimateDistance()
  const discount = promo_code ? await peekPromo(promo_code) : 0
  res.json({ distance, ...calcFare(distance, speed_tier, discount), valid_promo: discount > 0 })
})

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const { status } = req.query as Record<string, string>
  const limit  = Math.min(Math.max(1, parseInt(req.query.limit  as string) || 50), 200)
  const offset = Math.max(0, parseInt(req.query.offset as string) || 0)
  const orders = await prisma.order.findMany({
    where: { userId: req.user!.id, ...(status ? { status } : {}) },
    include: { driver: { select: { name: true, phone: true, rating: true, lat: true, lng: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  })
  res.json(orders.map(flatOrder))
})

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const { service_type, pickup_address, pickup_phone, delivery_address, delivery_phone, item_content, item_note, speed_tier = 'standard', promo_code, scheduled_at } = req.body
  if (!pickup_address || !delivery_address) { res.status(400).json({ error: '請填寫地址' }); return }
  if (typeof pickup_address !== 'string' || pickup_address.length > 300) { res.status(400).json({ error: '取件地址過長' }); return }
  if (typeof delivery_address !== 'string' || delivery_address.length > 300) { res.status(400).json({ error: '送達地址過長' }); return }
  if (item_content && typeof item_content === 'string' && item_content.length > 500) { res.status(400).json({ error: '物品說明過長（上限 500 字）' }); return }
  if (scheduled_at && new Date(scheduled_at) <= new Date()) { res.status(400).json({ error: '排程時間必須在未來' }); return }

  const distance = await calcDistance(pickup_address, delivery_address)

  // Atomic promo consume
  const promo = promo_code ? await consumePromo(promo_code) : { discount: 0, id: null }

  // Fetch user meta (referral + enterpriseId) in one query
  const userMeta = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { referralBy: true, enterpriseId: true } })

  // Referral first-order discount (NT$50, only if user has never placed an order)
  const userOrderCount = await prisma.order.count({ where: { userId: req.user!.id } })
  const referralDiscount = (userOrderCount === 0 && !!userMeta?.referralBy) ? 50 : 0

  const totalDiscount = promo.discount + referralDiscount
  const fare = calcFare(distance, speed_tier, totalDiscount)
  const id = await nextOrderId()
  const initialStatus = scheduled_at ? 'pending' : 'matching'

  const order = await prisma.order.create({
    data: {
      id, userId: req.user!.id,
      enterpriseId: userMeta?.enterpriseId ?? null,
      serviceType: service_type || 'delivery',
      status: initialStatus,
      pickupAddress: pickup_address, pickupPhone: pickup_phone || null,
      deliveryAddress: delivery_address, deliveryPhone: delivery_phone || null,
      itemContent: item_content || null, itemNote: item_note || null,
      speedTier: speed_tier,
      baseFee: fare.base_fee, surcharge: fare.surcharge, discount: fare.discount, totalFee: fare.total_fee,
      distance, duration: fare.duration,
      scheduledAt: scheduled_at ? new Date(scheduled_at) : null,
    },
    include: { driver: true },
  })

  await notify(req.user!.id, 'info', '訂單已建立', `${id} — 正在媒合任務夥伴`)

  // Email confirmation (non-blocking)
  prisma.user.findUnique({ where: { id: req.user!.id }, select: { email: true } }).then(u => {
    if (u?.email) sendEmail(u.email, `【Ufly】訂單已建立 ${id}`, orderStatusEmail(id, 'accepted')).catch(() => {})
  }).catch(() => {})

  const io: Server | null = req.app.get('io')
  if (io) {
    io.to(`user:${req.user!.id}`).emit('order:update', flatOrder(order))
    if (initialStatus === 'matching') io.to('drivers').emit('order:new', flatOrder(order))
  }

  // Trigger enterprise webhooks
  const serialized = flatOrder(order)
  if (serialized) triggerWebhooks('order.created', serialized, order.enterpriseId).catch(() => {})

  res.json(flatOrder(order))
})

router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  const order = await prisma.order.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
    include: { driver: true },
  })
  if (!order) { res.status(404).json({ error: 'Not found' }); return }
  res.json(flatOrder(order))
})

router.put('/:id/cancel', requireAuth, async (req: AuthRequest, res) => {
  const order = await prisma.order.findFirst({ where: { id: req.params.id, userId: req.user!.id } })
  if (!order) { res.status(404).json({ error: 'Not found' }); return }
  if (!['pending', 'matching'].includes(order.status)) { res.status(400).json({ error: '無法取消此狀態訂單' }); return }
  const updated = await prisma.order.update({ where: { id: req.params.id }, data: { status: 'cancelled' } })
  const io: Server | null = req.app.get('io')
  if (io) io.to(`user:${req.user!.id}`).emit('order:update', { ...flatOrder(updated) })
  res.json({ ok: true })
})

router.post('/:id/rate', requireAuth, async (req: AuthRequest, res) => {
  const order = await prisma.order.findFirst({ where: { id: req.params.id, userId: req.user!.id } })
  if (!order) { res.status(404).json({ error: 'Not found' }); return }
  if (order.status !== 'completed') { res.status(400).json({ error: '只有已完成訂單可以評分' }); return }
  if (order.rated) { res.status(400).json({ error: '已評分' }); return }

  const { score, tags, comment } = req.body
  if (!score || score < 1 || score > 5) { res.status(400).json({ error: '分數必須 1–5' }); return }

  await prisma.rating.create({
    data: {
      id: uuidv4(), orderId: order.id, userId: req.user!.id,
      driverId: order.driverId || null, score,
      tags: Array.isArray(tags) ? tags.join(',') : (tags || null),
      comment: comment || null,
    },
  })
  await prisma.order.update({ where: { id: order.id }, data: { rated: true } })

  if (order.driverId) {
    const avg = await prisma.rating.aggregate({ where: { driverId: order.driverId }, _avg: { score: true } })
    if (avg._avg.score) {
      await prisma.driver.update({ where: { id: order.driverId }, data: { rating: Math.round(avg._avg.score * 10) / 10 } })
    }
  }

  res.json({ ok: true })
})

// ── Recurring order helpers ──────────────────────────────────────────────────
export function calcNextRun(schedule: string, from: Date): Date {
  const next = new Date(from)
  if (schedule === 'daily') {
    next.setDate(next.getDate() + 1)
  } else if (schedule === 'weekly') {
    next.setDate(next.getDate() + 7)
  } else if (schedule === 'monthly') {
    next.setMonth(next.getMonth() + 1)
  } else {
    next.setDate(next.getDate() + 1) // fallback: daily
  }
  next.setHours(8, 0, 0, 0) // run at 08:00
  return next
}

export default router
