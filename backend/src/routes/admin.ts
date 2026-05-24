import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../lib/prisma'
import { requireAdmin } from '../middleware/requireAuth'
import { serializeOrder, serializeDriver, serializeUser } from '../lib/serializer'

const router = Router()

router.get('/stats', requireAdmin, async (_req, res) => {
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0)

  const [todayOrders, todayRevenueAgg, activeDrivers, pendingOrders, totalCompleted, totalNonPending] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.order.aggregate({ where: { status: 'completed', createdAt: { gte: startOfDay } }, _sum: { totalFee: true } }),
    prisma.driver.count({ where: { status: { not: 'offline' } } }),
    prisma.order.count({ where: { status: { in: ['pending', 'matching'] } } }),
    prisma.order.count({ where: { status: 'completed' } }),
    prisma.order.count({ where: { status: { not: 'pending' } } }),
  ])

  const completionRate = totalNonPending > 0 ? Math.round((totalCompleted / totalNonPending) * 1000) / 10 : 96.8
  res.json({ todayOrders, todayRevenue: todayRevenueAgg._sum.totalFee ?? 0, activeDrivers, pendingOrders, completionRate, avgDeliveryTime: 38 })
})

router.get('/orders', requireAdmin, async (req, res) => {
  const { status, page = '1', limit = '20' } = req.query as Record<string, string>
  const where = status ? { status } : {}
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { user: { select: { name: true } }, driver: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
    }),
    prisma.order.count({ where }),
  ])
  res.json({ orders: orders.map(serializeOrder), total, page: parseInt(page), limit: parseInt(limit) })
})

router.put('/orders/:id/status', requireAdmin, async (req, res) => {
  const { status, driver_id } = req.body
  const valid = ['pending', 'matching', 'accepted', 'pickup', 'delivering', 'completed', 'cancelled']
  if (!valid.includes(status)) { res.status(400).json({ error: 'Invalid status' }); return }
  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { status, ...(driver_id ? { driverId: driver_id } : {}) },
  })
  if (order.userId) {
    const msgs: Record<string, string> = { accepted: '已接單', pickup: '取件中', delivering: '配送中', completed: '已送達', cancelled: '已取消' }
    if (msgs[status]) {
      await prisma.notification.create({ data: { id: uuidv4(), userId: order.userId, type: status === 'completed' ? 'success' : 'info', title: `訂單${msgs[status]}`, body: `${order.id} — ${msgs[status]}` } })
    }
  }
  res.json({ ok: true })
})

// /drivers/positions must come before /drivers/:id
router.get('/drivers/positions', requireAdmin, async (_req, res) => {
  const drivers = await prisma.driver.findMany({ where: { status: { not: 'offline' } }, select: { id: true, name: true, status: true, area: true, lat: true, lng: true, rating: true } })
  res.json(drivers.map(d => ({ ...serializeDriver(d), lat: d.lat + (Math.random() - 0.5) * 0.003, lng: d.lng + (Math.random() - 0.5) * 0.003 })))
})

router.get('/drivers', requireAdmin, async (_req, res) => {
  const drivers = await prisma.driver.findMany({ orderBy: [{ status: 'asc' }, { name: 'asc' }] })
  res.json(drivers.map(serializeDriver))
})

router.post('/drivers', requireAdmin, async (req, res) => {
  const { name, phone, area } = req.body
  if (!name) { res.status(400).json({ error: '請填寫姓名' }); return }
  const driver = await prisma.driver.create({
    data: { id: uuidv4(), name, phone: phone || null, area: area || null, status: 'offline' },
  })
  res.json(serializeDriver(driver))
})

router.put('/drivers/:id', requireAdmin, async (req, res) => {
  const { name, phone, area } = req.body
  const driver = await prisma.driver.update({
    where: { id: req.params.id },
    data: { ...(name ? { name } : {}), ...(phone !== undefined ? { phone } : {}), ...(area !== undefined ? { area } : {}) },
  })
  res.json(serializeDriver(driver))
})

router.put('/drivers/:id/status', requireAdmin, async (req, res) => {
  await prisma.driver.update({ where: { id: req.params.id }, data: { status: req.body.status } })
  res.json({ ok: true })
})

router.delete('/drivers/:id', requireAdmin, async (req, res) => {
  await prisma.driver.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

router.get('/customers', requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { role: 'customer' },
    select: { id: true, name: true, email: true, phone: true, avatar: true, rating: true, totalOrders: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json(users.map(serializeUser))
})

router.get('/analytics/weekly', requireAdmin, async (_req, res) => {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0)
    const next = new Date(d); next.setDate(next.getDate() + 1)
    const label = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
    const [revenueAgg, orders] = await Promise.all([
      prisma.order.aggregate({ where: { status: 'completed', createdAt: { gte: d, lt: next } }, _sum: { totalFee: true } }),
      prisma.order.count({ where: { createdAt: { gte: d, lt: next } } }),
    ])
    days.push({ date: d.toISOString().slice(0, 10), label, revenue: revenueAgg._sum.totalFee ?? 0, orders })
  }
  res.json(days)
})

export default router
