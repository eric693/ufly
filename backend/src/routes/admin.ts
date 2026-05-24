import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../lib/prisma'
import { requireAdmin, AuthRequest } from '../middleware/requireAuth'
import { serializeOrder, serializeDriver, serializeUser } from '../lib/serializer'
import { sendLineMessage } from '../lib/lineMessaging'
import { readSettings, writeSettings } from '../lib/settings'
import { sendEmail, orderStatusEmail } from '../lib/email'
import { auditLog } from '../lib/audit'

const router = Router()

router.get('/stats', requireAdmin, async (_req, res) => {
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0)

  const [todayOrders, todayRevenueAgg, activeDrivers, pendingOrders, totalCompleted, totalClosed, avgDurationAgg] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.order.aggregate({ where: { status: 'completed', createdAt: { gte: startOfDay } }, _sum: { totalFee: true } }),
    prisma.driver.count({ where: { status: { not: 'offline' } } }),
    prisma.order.count({ where: { status: { in: ['pending', 'matching'] } } }),
    prisma.order.count({ where: { status: 'completed' } }),
    prisma.order.count({ where: { status: { in: ['completed', 'cancelled'] } } }),
    prisma.order.aggregate({ where: { status: 'completed', duration: { gt: 0 } }, _avg: { duration: true } }),
  ])

  const completionRate = totalClosed > 0 ? Math.round((totalCompleted / totalClosed) * 1000) / 10 : 100
  const avgDeliveryTime = Math.round(avgDurationAgg._avg.duration ?? 0)
  res.json({ todayOrders, todayRevenue: todayRevenueAgg._sum.totalFee ?? 0, activeDrivers, pendingOrders, completionRate, avgDeliveryTime })
})

router.get('/orders', requireAdmin, async (req, res) => {
  const { status } = req.query as Record<string, string>
  const page  = Math.max(1, parseInt(req.query.page  as string) || 1)
  const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 20), 200)
  const where = status ? { status } : {}
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { user: { select: { name: true } }, driver: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.order.count({ where }),
  ])
  res.json({ orders: orders.map(serializeOrder), total, page, limit })
})

router.put('/orders/:id/status', requireAdmin, async (req: AuthRequest, res) => {
  const { status, driver_id } = req.body
  const valid = ['pending', 'matching', 'accepted', 'pickup', 'delivering', 'completed', 'cancelled']
  if (!valid.includes(status)) { res.status(400).json({ error: 'Invalid status' }); return }
  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { status, ...(driver_id ? { driverId: driver_id } : {}) },
  })
  auditLog('order:status', req, req.params.id, status, req.user?.id)
  if (order.userId) {
    const msgs: Record<string, string> = { accepted: '已接單', pickup: '取件中', delivering: '配送中', completed: '已送達', cancelled: '已取消' }
    if (msgs[status]) {
      const title = `訂單${msgs[status]}`
      const body = `${order.id} — ${msgs[status]}`
      await prisma.notification.create({ data: { id: uuidv4(), userId: order.userId, type: status === 'completed' ? 'success' : 'info', title, body } })
      const user = await prisma.user.findUnique({ where: { id: order.userId }, select: { lineId: true, email: true } })
      if (user?.lineId) await sendLineMessage(user.lineId, `【Ufly】${title}\n${body}`)
      if (user?.email) sendEmail(user.email, `【Ufly】${title}`, orderStatusEmail(order.id, status)).catch(() => {})
    }
  }
  res.json({ ok: true })
})

// /drivers/positions must come before /drivers/:id
router.get('/drivers/positions', requireAdmin, async (_req, res) => {
  const drivers = await prisma.driver.findMany({ where: { status: { not: 'offline' } }, select: { id: true, name: true, status: true, area: true, lat: true, lng: true, rating: true } })
  res.json(drivers.map(serializeDriver))
})

router.get('/drivers', requireAdmin, async (_req, res) => {
  const drivers = await prisma.driver.findMany({ orderBy: [{ status: 'asc' }, { name: 'asc' }] })
  res.json(drivers.map(serializeDriver))
})

router.post('/drivers', requireAdmin, async (req: AuthRequest, res) => {
  const { name, phone, area, email } = req.body
  if (!name) { res.status(400).json({ error: '請填寫姓名' }); return }
  const driver = await prisma.driver.create({
    data: { id: uuidv4(), name, phone: phone || null, area: area || null, email: email || null, status: 'offline' },
  })
  auditLog('driver:create', req, driver.id, name, req.user?.id)
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

router.delete('/drivers/:id', requireAdmin, async (req: AuthRequest, res) => {
  await prisma.driver.delete({ where: { id: req.params.id } })
  auditLog('driver:delete', req, req.params.id, undefined, req.user?.id)
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
  const numDays = Math.min(Math.max(1, parseInt((req.query.days as string) || '7')), 30)
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

// ── Promo codes ──────────────────────────────────────────────────────────────
router.get('/promos', requireAdmin, async (_req, res) => {
  const promos = await prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } })
  res.json(promos)
})

router.post('/promos', requireAdmin, async (req, res) => {
  const { code, discount, usage_max } = req.body
  if (!code || !discount) { res.status(400).json({ error: '請填寫優惠碼與折扣金額' }); return }
  try {
    const promo = await prisma.promoCode.create({
      data: { id: require('crypto').randomUUID(), code: code.toUpperCase(), discount: Number(discount), usageMax: usage_max ? Number(usage_max) : null },
    })
    res.json(promo)
  } catch { res.status(400).json({ error: '優惠碼已存在' }) }
})

router.put('/promos/:id', requireAdmin, async (req, res) => {
  const { active, usage_max } = req.body
  const promo = await prisma.promoCode.update({
    where: { id: req.params.id },
    data: { ...(active !== undefined ? { active } : {}), ...(usage_max !== undefined ? { usageMax: usage_max } : {}) },
  })
  res.json(promo)
})

router.delete('/promos/:id', requireAdmin, async (req, res) => {
  await prisma.promoCode.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

router.get('/audit-logs', requireAdmin, async (req, res) => {
  const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 50), 200)
  const offset = Math.max(0, parseInt(req.query.offset as string) || 0)
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: limit, skip: offset })
  res.json(logs)
})

router.get('/drivers/:id/earnings', requireAdmin, async (req, res) => {
  const driver = await prisma.driver.findUnique({ where: { id: req.params.id } })
  if (!driver) { res.status(404).json({ error: '司機不存在' }); return }
  const orders = await prisma.order.findMany({
    where: { driverId: req.params.id, status: 'completed' },
    select: { id: true, totalFee: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
  const total = orders.reduce((s, o) => s + o.totalFee, 0)
  const driverShare = Math.round(total * 0.8) // 80% to driver
  res.json({ driver_id: req.params.id, name: driver.name, total_orders: orders.length, gross: total, driver_share: driverShare, orders })
})

router.get('/settings', requireAdmin, (_req, res) => {
  res.json(readSettings())
})

const ALLOWED_SETTING_KEYS = new Set([
  'platformName','serviceArea','baseFee','expressSurcharge','prioritySurcharge',
  'urgentSurcharge','notifyNewOrder','notifyDriverMatch','notifyOrderComplete',
  'maxOrderDistance','autoMatchRadius',
])

router.put('/settings', requireAdmin, (req: AuthRequest, res) => {
  try {
    const safe = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => ALLOWED_SETTING_KEYS.has(k))
    )
    auditLog('settings:update', req, undefined, JSON.stringify(safe), req.user?.id)
    res.json(writeSettings(safe))
  } catch { res.status(500).json({ error: 'Failed to save settings' }) }
})

export default router
