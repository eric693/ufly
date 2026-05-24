import { Router } from 'express'
import { Server } from 'socket.io'
import prisma from '../lib/prisma'
import { requireDriver, AuthRequest } from '../middleware/requireAuth'
import { serializeOrder } from '../lib/serializer'

const router = Router()
const flatOrder = serializeOrder

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
  if (io) io.to(`user:${order.userId}`).emit('order:update', flatOrder(updated))

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
  if (io) io.to(`user:${order.userId}`).emit('order:update', flatOrder(updated))

  res.json(flatOrder(updated))
})

export default router
