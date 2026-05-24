import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'
import prisma from '../lib/prisma'
import { requireAdmin } from '../middleware/requireAuth'
import { serializeOrder, serializeDriver, serializeUser } from '../lib/serializer'
import { sendLineMessage } from '../lib/lineMessaging'

const SETTINGS_PATH = path.join(__dirname, '../../settings.json')
const DEFAULT_SETTINGS = {
  platformName: 'Ufly 城市任務平台',
  serviceArea: '台北市（以中正區為主）',
  baseFee: '120',
  expressSurcharge: '30',
  prioritySurcharge: '80',
  urgentSurcharge: '150',
  notifyNewOrder: true,
  notifyDriverMatch: true,
  notifyOrderComplete: true,
  maxOrderDistance: '25',
  autoMatchRadius: '5',
}
function readSettings() {
  try {
    return fs.existsSync(SETTINGS_PATH)
      ? { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8')) }
      : DEFAULT_SETTINGS
  } catch { return DEFAULT_SETTINGS }
}

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
      const title = `訂單${msgs[status]}`
      const body = `${order.id} — ${msgs[status]}`
      await prisma.notification.create({ data: { id: uuidv4(), userId: order.userId, type: status === 'completed' ? 'success' : 'info', title, body } })
      const user = await prisma.user.findUnique({ where: { id: order.userId }, select: { lineId: true } })
      if (user?.lineId) await sendLineMessage(user.lineId, `【Ufly】${title}\n${body}`)
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
  const { name, phone, area, email } = req.body
  if (!name) { res.status(400).json({ error: '請填寫姓名' }); return }
  const driver = await prisma.driver.create({
    data: { id: uuidv4(), name, phone: phone || null, area: area || null, email: email || null, status: 'offline' },
  })
  res.json(serializeDriver(driver))
})

router.put('/drivers/:id', requireAdmin, async (req, res) => {
  const { name, phone, area, email } = req.body
  const driver = await prisma.driver.update({
    where: { id: req.params.id },
    data: {
      ...(name ? { name } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(area !== undefined ? { area } : {}),
      ...(email !== undefined ? { email: email || null } : {}),
    },
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

router.get('/analytics/daily', requireAdmin, async (req, res) => {
  const numDays = Math.min(parseInt((req.query.days as string) || '7'), 90)
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - (numDays - 1))
  startDate.setHours(0, 0, 0, 0)

  const allOrders = await prisma.order.findMany({
    where: { createdAt: { gte: startDate } },
    select: { createdAt: true, totalFee: true, status: true },
  })

  const dayMap = new Map<string, { revenue: number; orders: number }>()
  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0)
    dayMap.set(d.toISOString().slice(0, 10), { revenue: 0, orders: 0 })
  }
  for (const o of allOrders) {
    const key = o.createdAt.toISOString().slice(0, 10)
    const entry = dayMap.get(key)
    if (entry) { entry.orders++; if (o.status === 'completed') entry.revenue += o.totalFee }
  }

  const result = Array.from(dayMap.entries()).map(([date, data]) => {
    const d = new Date(date + 'T00:00:00')
    return { date, label: `${d.getMonth() + 1}/${d.getDate()}`, ...data }
  })
  res.json(result)
})

router.get('/analytics/hourly', requireAdmin, async (_req, res) => {
  const start = new Date(); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0)
  const orders = await prisma.order.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true } })
  const counts = Array(24).fill(0)
  for (const o of orders) counts[o.createdAt.getHours()]++
  res.json(counts)
})

router.get('/analytics/services', requireAdmin, async (_req, res) => {
  const groups = await prisma.order.groupBy({ by: ['serviceType'], _count: { _all: true } })
  const total = groups.reduce((s, g) => s + g._count._all, 0)
  res.json(groups.map(g => ({
    service_type: g.serviceType,
    count: g._count._all,
    pct: total > 0 ? Math.round(g._count._all / total * 100) : 0,
  })))
})

router.get('/settings', requireAdmin, (_req, res) => {
  res.json(readSettings())
})

router.put('/settings', requireAdmin, (req, res) => {
  try {
    const updated = { ...readSettings(), ...req.body }
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(updated, null, 2))
    res.json(updated)
  } catch { res.status(500).json({ error: 'Failed to save settings' }) }
})

export default router
