import { Router } from 'express'
import { Server } from 'socket.io'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/requireAuth'
import { serializeOrder, serializeRecurring } from '../lib/serializer'
import { getFeeConfig } from '../lib/settings'
import { calcDistance, geocode } from '../lib/maps'
import { sendEmail, orderStatusEmail } from '../lib/email'
import { triggerWebhooks } from '../lib/webhook'

const router = Router()

const SPEED_MINUTES: Record<string, number> = { standard: 75, express: 52, priority: 37, urgent: 20 }

function estimateDistance() { return Math.round((4 + Math.random() * 14) * 10) / 10 }

// Subscription discount rates applied to base fee
const SUB_DISCOUNT: Record<string, number> = { free: 1.0, pro: 0.8, enterprise: 0.75 }

function calcFare(
  distance: number,
  speedTier: string,
  discount = 0,
  subscriptionTier = 'free',
  useVoucher = false,       // Pro: waive speed surcharge for one order
) {
  const { baseFee, feePerKm, surcharges } = getFeeConfig()
  const subRate = SUB_DISCOUNT[subscriptionTier] ?? 1.0
  const base    = Math.round((baseFee + Math.round(distance * feePerKm)) * subRate)
  let surcharge = (surcharges as Record<string, number>)[speedTier] ?? 0
  if (useVoucher && surcharge > 0) surcharge = 0   // voucher waives surcharge
  const total   = Math.max(30, base + surcharge - discount)  // minimum NT$30
  const duration = Math.round((SPEED_MINUTES[speedTier] ?? 75) * (0.8 + distance / 20))
  return { base_fee: base, surcharge, discount, total_fee: total, duration, sub_discount: subRate < 1 }
}

// Exported so index.ts recurring scheduler can reuse the same logic
export async function nextOrderId(tx?: typeof prisma): Promise<string> {
  const db = tx ?? prisma
  const last = await db.order.findFirst({ where: { id: { startsWith: 'UF' } }, orderBy: { id: 'desc' } })
  if (!last) return 'UF240001'
  return 'UF' + String(parseInt(last.id.replace('UF', '')) + 1).padStart(6, '0')
}

// Exported for recurring scheduler — calculates real fare for a recurring template
export async function calcRecurringFare(pickup: string, delivery: string, speedTier: string, userId: string) {
  const [distance, user] = await Promise.all([
    calcDistance(pickup, delivery),
    prisma.user.findUnique({ where: { id: userId }, select: { subscriptionTier: true } }),
  ])
  const subTier = user?.subscriptionTier ?? 'free'
  const fare = calcFare(distance, speedTier, 0, subTier, false)
  return { ...fare, distance }
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
  const { speed_tier = 'standard', promo_code, pickup_address, delivery_address } = req.body
  // Use real distance if both addresses provided, otherwise fallback
  const distance = (pickup_address && delivery_address)
    ? await calcDistance(pickup_address, delivery_address)
    : estimateDistance()
  const discount = promo_code ? await peekPromo(promo_code) : 0
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { subscriptionTier: true, subscription: { select: { vouchersLeft: true } } } })
  const subTier = user?.subscriptionTier ?? 'free'
  const fare = calcFare(distance, speed_tier, discount, subTier)
  res.json({
    distance,
    ...fare,
    valid_promo: discount > 0,
    subscription_tier: subTier,
    vouchers_left: user?.subscription?.vouchersLeft ?? 0,
  })
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
  const { service_type, pickup_address, pickup_phone, delivery_address, delivery_phone, item_content, item_note, speed_tier = 'standard', promo_code, scheduled_at, advance_amount } = req.body
  if (!pickup_address || !delivery_address) { res.status(400).json({ error: '請填寫地址' }); return }
  if (typeof pickup_address !== 'string' || pickup_address.length > 300) { res.status(400).json({ error: '取件地址過長' }); return }
  if (typeof delivery_address !== 'string' || delivery_address.length > 300) { res.status(400).json({ error: '送達地址過長' }); return }
  if (item_content && typeof item_content === 'string' && item_content.length > 500) { res.status(400).json({ error: '物品說明過長（上限 500 字）' }); return }
  if (scheduled_at && new Date(scheduled_at) <= new Date()) { res.status(400).json({ error: '排程時間必須在未來' }); return }

  const distance = await calcDistance(pickup_address, delivery_address)
  // Geocode once on the server so the map markers + nearest-driver dispatch have coords
  const [pickupCoord, deliveryCoord] = await Promise.all([
    geocode(pickup_address),
    geocode(delivery_address),
  ])

  // Atomic promo consume
  const promo = promo_code ? await consumePromo(promo_code) : { discount: 0, id: null }

  // Fetch user meta (referral, enterpriseId, subscription tier + vouchers)
  const userMeta = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { referralBy: true, enterpriseId: true, subscriptionTier: true, subscription: { select: { id: true, vouchersLeft: true } } },
  })

  // Use a voucher if client requested it and the user has Pro/Enterprise with vouchers left
  const useVoucher = !!(req.body.use_voucher && userMeta?.subscription && (userMeta.subscription.vouchersLeft ?? 0) > 0)

  const subTier = userMeta?.subscriptionTier ?? 'free'
  const initialStatus = scheduled_at ? 'pending' : 'matching'

  // Wrap ID generation + creation in a transaction to prevent duplicate IDs under concurrency
  // Also check referral discount inside tx to avoid race condition on first order
  const order = await prisma.$transaction(async (tx) => {
    const userOrderCount = await tx.order.count({ where: { userId: req.user!.id } })
    const referralDiscount = (userOrderCount === 0 && !!userMeta?.referralBy) ? 50 : 0
    const totalDiscount = promo.discount + referralDiscount
    const fare = calcFare(distance, speed_tier, totalDiscount, subTier, useVoucher)

    const id = await nextOrderId(tx as typeof prisma)
    const created = await tx.order.create({
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
        advanceAmount: Math.max(0, Math.round(Number(advance_amount) || 0)),
        distance, duration: fare.duration,
        pickupLat: pickupCoord?.lat ?? null, pickupLng: pickupCoord?.lng ?? null,
        deliveryLat: deliveryCoord?.lat ?? null, deliveryLng: deliveryCoord?.lng ?? null,
        scheduledAt: scheduled_at ? new Date(scheduled_at) : null,
      },
      include: { driver: true },
    })
    if (useVoucher && userMeta?.subscription?.id) {
      await tx.subscription.update({
        where: { id: userMeta.subscription.id },
        data: { vouchersLeft: { decrement: 1 } },
      })
    }
    return created
  })

  await notify(req.user!.id, 'info', '訂單已建立', `${order.id} — 正在媒合任務夥伴`)

  // Email confirmation (non-blocking)
  prisma.user.findUnique({ where: { id: req.user!.id }, select: { email: true } }).then(u => {
    if (u?.email) sendEmail(u.email, `【Ufly】訂單已建立 ${order.id}`, orderStatusEmail(order.id, 'accepted')).catch(e => console.error('[order-email]', e))
  }).catch(e => console.error('[order-email-fetch]', e))

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
  const updated = await prisma.order.update({
    where: { id: req.params.id },
    data: { status: 'cancelled' },
    include: { driver: true },
  })
  const io: Server | null = req.app.get('io')
  if (io) {
    const serialized = flatOrder(updated)
    io.to(`user:${req.user!.id}`).emit('order:update', serialized)
    // Notify the assigned driver (if any) that the order was cancelled
    if (order.driverId) {
      io.to(`user:${order.driverId}`).emit('order:update', serialized)
    }
    io.to('admin').emit('order:update', serialized)
  }
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
