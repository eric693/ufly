import { Router } from 'express'
import { Server } from 'socket.io'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../lib/prisma'
import { requireDriver, AuthRequest } from '../middleware/requireAuth'
import { serializeOrder } from '../lib/serializer'
import { sendLineMessage } from '../lib/lineMessaging'
import { triggerWebhooks } from '../lib/webhook'

const router = Router()
const flatOrder = serializeOrder

async function notify(userId: string, type: string, title: string, body: string) {
  await prisma.notification.create({ data: { id: uuidv4(), userId, type, title, body } })
}

async function notifyUser(userId: string, type: string, title: string, body: string, orderId: string) {
  await notify(userId, type, title, body)
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { lineId: true } })
  if (user?.lineId) {
    await sendLineMessage(user.lineId, `【Ufly】${title}\n${body}\n訂單編號：${orderId}`)
  }
}

// Available orders queue for drivers
router.get('/me/queue', requireDriver, async (_req, res) => {
  const orders = await prisma.order.findMany({
    where: { status: 'matching' },
    include: { driver: true },
    orderBy: { createdAt: 'asc' },
  })
  res.json(orders.map(flatOrder))
})

// Driver's current active order
router.get('/me/current', requireDriver, async (req: AuthRequest, res) => {
  const order = await prisma.order.findFirst({
    where: { driverId: req.user!.id, status: { in: ['accepted', 'pickup', 'delivering'] } },
    include: { driver: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json(order ? flatOrder(order) : null)
})

// Set driver online/offline/busy
router.put('/me/status', requireDriver, async (req: AuthRequest, res) => {
  const { status } = req.body
  if (!['online', 'offline', 'busy'].includes(status)) { res.status(400).json({ error: 'Invalid status' }); return }
  await prisma.driver.update({ where: { id: req.user!.id }, data: { status } })
  const io: Server | null = req.app.get('io')
  if (io) io.to('admin').emit('driver:statusChange', { driverId: req.user!.id, status })
  res.json({ ok: true })
})

// Accept an order — atomic to prevent double-acceptance race condition
router.patch('/orders/:id/accept', requireDriver, async (req: AuthRequest, res) => {
  // Single UPDATE with status guard — if another driver already accepted, count === 0
  const result = await prisma.order.updateMany({
    where: { id: req.params.id, status: 'matching' },
    data:  { status: 'accepted', driverId: req.user!.id },
  })
  if (result.count === 0) { res.status(409).json({ error: '訂單不存在或已被接單' }); return }

  const updated = await prisma.order.findUnique({ where: { id: req.params.id }, include: { driver: true } })
  if (!updated) { res.status(404).json({ error: 'Not found' }); return }

  await prisma.driver.update({ where: { id: req.user!.id }, data: { status: 'busy' } })

  const io: Server | null = req.app.get('io')
  if (io) {
    io.to(`user:${updated.userId}`).emit('order:update', flatOrder(updated))
    io.to('admin').emit('order:update', flatOrder(updated))
    // Tell every other online driver this order is gone, so it leaves their queue
    io.to('drivers').emit('order:taken', { id: updated.id })
  }

  await notifyUser(updated.userId, 'info', '已接單', `夥伴 ${updated.driver?.name || ''} 正在前往取件`, updated.id)

  res.json(flatOrder(updated))
})

// Update order status (pickup → delivering → completed)
router.patch('/orders/:id/status', requireDriver, async (req: AuthRequest, res) => {
  const { status } = req.body
  const allowed: Record<string, string> = { accepted: 'pickup', pickup: 'delivering', delivering: 'completed' }

  const order = await prisma.order.findFirst({ where: { id: req.params.id, driverId: req.user!.id } })
  if (!order) { res.status(404).json({ error: 'Not found' }); return }
  if (allowed[order.status] !== status) { res.status(400).json({ error: `不能從 ${order.status} 更新為 ${status}` }); return }

  const updated = await prisma.order.update({
    where: { id: req.params.id },
    data: { status },
    include: { driver: true },
  })

  if (status === 'completed') {
    // Only set online if driver was busy (not if they went offline mid-delivery)
    await prisma.driver.updateMany({ where: { id: req.user!.id, status: 'busy' }, data: { status: 'online', totalTrips: { increment: 1 } } })
    await prisma.driver.updateMany({ where: { id: req.user!.id, status: { not: 'busy' } }, data: { totalTrips: { increment: 1 } } })
    await prisma.user.update({ where: { id: order.userId }, data: { totalOrders: { increment: 1 } } })
  }

  const io: Server | null = req.app.get('io')
  if (io) {
    io.to(`user:${order.userId}`).emit('order:update', flatOrder(updated))
    io.to('admin').emit('order:update', flatOrder(updated))
  }

  const msgs: Record<string, [string, string]> = {
    pickup:     ['取件中', '夥伴已取件，正在前往配送'],
    delivering: ['配送中', '物品正在配送途中'],
    completed:  ['已送達', '您的物品已成功送達，感謝使用 Ufly！'],
  }
  if (msgs[status]) {
    const [title, body] = msgs[status]
    await notifyUser(order.userId, status === 'completed' ? 'success' : 'info', title, body, order.id)
  }

  triggerWebhooks('order.status_changed', { ...flatOrder(updated), new_status: status }, updated.enterpriseId).catch(() => {})

  res.json(flatOrder(updated))
})

// Driver's own earnings summary (supports ?year=&month= for monthly filter)
router.get('/me/earnings', requireDriver, async (req: AuthRequest, res) => {
  const driverId = req.user!.id
  const year  = parseInt(req.query.year  as string) || new Date().getFullYear()
  const month = parseInt(req.query.month as string) // 1-12; omit for all-time

  let dateFilter: Record<string, unknown> = {}
  if (month >= 1 && month <= 12) {
    dateFilter = { createdAt: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) } }
  }

  const orders = await prisma.order.findMany({
    where: { driverId, status: 'completed', ...dateFilter },
    select: {
      id: true, totalFee: true, createdAt: true, serviceType: true,
      distance: true, duration: true, pickupAddress: true, deliveryAddress: true,
    },
    orderBy: { createdAt: 'desc' },
  })
  const gross       = orders.reduce((s, o) => s + o.totalFee, 0)
  const driverShare = Math.round(gross * 0.8)

  const byDay: Record<string, number> = {}
  for (const o of orders) {
    const key = o.createdAt.toISOString().slice(0, 10)
    byDay[key] = (byDay[key] || 0) + Math.round(o.totalFee * 0.8)
  }

  const ratings = await prisma.rating.aggregate({
    where: { driverId },
    _avg: { score: true },
    _count: { id: true },
  })

  // Available months that have at least one completed order
  const allOrders = await prisma.order.findMany({
    where: { driverId, status: 'completed' },
    select: { createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
  const monthsSet = new Set(allOrders.map(o => o.createdAt.toISOString().slice(0, 7)))
  const availableMonths = Array.from(monthsSet).sort().reverse()

  res.json({
    total_orders:     orders.length,
    gross,
    driver_share:     driverShare,
    avg_rating:       ratings._avg.score ?? 5.0,
    rating_count:     ratings._count.id,
    by_day:           byDay,
    trips:            orders,
    available_months: availableMonths,
    period:           { year, month: month || null },
  })
})

export default router
