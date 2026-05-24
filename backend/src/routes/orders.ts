import { Router } from 'express'
import { Server } from 'socket.io'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/requireAuth'
import { serializeOrder, serializeRecurring } from '../lib/serializer'

const router = Router()

const SPEED_SURCHARGE: Record<string, number> = { standard: 0, express: 30, priority: 80, urgent: 150 }
const SPEED_MINUTES:   Record<string, number> = { standard: 75, express: 52, priority: 37, urgent: 20 }
const VALID_PROMOS:    Record<string, number> = { UFLY50: 50, NEW100: 100, VIP200: 200 }
const BASE_FEE = 120
const FEE_PER_KM = 12

function estimateDistance() { return Math.round((4 + Math.random() * 14) * 10) / 10 }

function calcFare(distance: number, speedTier: string, discount = 0) {
  const base      = BASE_FEE + Math.round(distance * FEE_PER_KM)
  const surcharge = SPEED_SURCHARGE[speedTier] ?? 0
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

const flatOrder = serializeOrder

// IMPORTANT: /recurring/* routes must come before /:id
router.get('/recurring/list', requireAuth, async (req: AuthRequest, res) => {
  const rows = await prisma.recurringOrder.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' } })
  res.json(rows.map(serializeRecurring))
})

router.post('/recurring', requireAuth, async (req: AuthRequest, res) => {
  const { service_type, pickup_address, delivery_address, item_content, speed_tier, schedule } = req.body
  if (!pickup_address || !delivery_address || !schedule) { res.status(400).json({ error: '缺少必要欄位' }); return }
  const row = await prisma.recurringOrder.create({
    data: { id: uuidv4(), userId: req.user!.id, serviceType: service_type || 'delivery', pickupAddress: pickup_address, deliveryAddress: delivery_address, itemContent: item_content || null, speedTier: speed_tier || 'standard', schedule },
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
  const discount = VALID_PROMOS[promo_code?.toUpperCase()] ?? 0
  res.json({ distance, ...calcFare(distance, speed_tier, discount), valid_promo: discount > 0 })
})

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const { status, limit = '50', offset = '0' } = req.query as Record<string, string>
  const orders = await prisma.order.findMany({
    where: { userId: req.user!.id, ...(status ? { status } : {}) },
    include: { driver: { select: { name: true, phone: true, rating: true } } },
    orderBy: { createdAt: 'desc' },
    take: parseInt(limit),
    skip: parseInt(offset),
  })
  res.json(orders.map(flatOrder))
})

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const { service_type, pickup_address, pickup_phone, delivery_address, delivery_phone, item_content, item_note, speed_tier = 'standard', promo_code, scheduled_at } = req.body
  if (!pickup_address || !delivery_address) { res.status(400).json({ error: '請填寫地址' }); return }

  const distance = estimateDistance()
  const discount = VALID_PROMOS[promo_code?.toUpperCase()] ?? 0
  const fare = calcFare(distance, speed_tier, discount)
  const id = await nextOrderId()

  const initialStatus = scheduled_at ? 'pending' : 'matching'

  const order = await prisma.order.create({
    data: {
      id, userId: req.user!.id,
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

  const io: Server | null = req.app.get('io')
  if (io) {
    io.to(`user:${req.user!.id}`).emit('order:update', flatOrder(order))
    if (initialStatus === 'matching') io.to('drivers').emit('order:new', flatOrder(order))
  }

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

export default router
