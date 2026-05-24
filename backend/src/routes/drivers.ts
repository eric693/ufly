import { Router } from 'express'
import { Server } from 'socket.io'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../lib/prisma'
import { requireDriver, AuthRequest } from '../middleware/requireAuth'
import { serializeOrder } from '../lib/serializer'
import { sendLineMessage } from '../lib/lineMessaging'

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

// Accept an order
router.patch('/orders/:id/accept', requireDriver, async (req: AuthRequest, res) => {
  const order = await prisma.order.findFirst({ where: { id: req.params.id, status: 'matching' } })
  if (!order) { res.status(404).json({ error: '訂單不存在或已被接單' }); return }

  const updated = await prisma.order.update({
    where: { id: req.params.id },
    data: { status: 'accepted', driverId: req.user!.id },
    include: { driver: true },
  })
  await prisma.driver.update({ where: { id: req.user!.id }, data: { status: 'busy' } })

  const io: Server | null = req.app.get('io')
  if (io) {
    io.to(`user:${order.userId}`).emit('order:update', flatOrder(updated))
    io.to('admin').emit('order:update', flatOrder(updated))
  }

  await notifyUser(order.userId, 'info', '已接單', `夥伴 ${updated.driver?.name || ''} 正在前往取件`, order.id)

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
    await prisma.driver.update({ where: { id: req.user!.id }, data: { status: 'online', totalTrips: { increment: 1 } } })
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

  res.json(flatOrder(updated))
})

export default router
