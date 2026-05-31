import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express'
import http from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'

import path from 'path'
import authRouter        from './routes/auth'
import usersRouter       from './routes/users'
import ordersRouter      from './routes/orders'
import enterprisesRouter from './routes/enterprises'
import adminRouter       from './routes/admin'
import driversRouter     from './routes/drivers'
import uploadRouter      from './routes/upload'
import paymentsRouter    from './routes/payments'
import disputesRouter    from './routes/disputes'
import webhooksRouter       from './routes/webhooks'
import subscriptionsRouter  from './routes/subscriptions'
import { setupSocketIO } from './socket'
import { randomUUID } from 'crypto'
import prisma from './lib/prisma'
import { serializeOrder } from './lib/serializer'
import { calcNextRun, nextOrderId, calcRecurringFare } from './routes/orders'

const app    = express()
const server = http.createServer(app)
const io     = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true },
  path: '/socket.io',
  maxHttpBufferSize: 1e5, // 100 KB max socket message
})

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false, // allow leaflet tiles
  contentSecurityPolicy: false,     // managed by nginx / Vite
}))

// ── HTTPS enforcement (production only) ───────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(301, `https://${req.header('host')}${req.url}`)
    }
    next()
  })
}

// ── Request logging ───────────────────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

app.set('io', io)
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }))
app.use(express.json({ limit: '1mb' }))

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '請求過於頻繁，請稍後再試' },
}))

// Auth: stricter 20 req / 15 min
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '登入嘗試次數過多，請 15 分鐘後再試' },
}))

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',        authRouter)
app.use('/api/users',       usersRouter)
app.use('/api/orders',      ordersRouter)
app.use('/api/enterprises', enterprisesRouter)
app.use('/api/admin',       adminRouter)
app.use('/api/drivers',     driversRouter)
app.use('/api/upload',      uploadRouter)
app.use('/api/payments',    paymentsRouter)
app.use('/api/disputes',    disputesRouter)
app.use('/api/webhooks',       webhooksRouter)
app.use('/api/subscriptions', subscriptionsRouter)

// Serve uploaded files
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')
app.use('/uploads', express.static(UPLOAD_DIR))

// ── Health check (includes DB ping) ──────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ ok: true, db: 'up', time: new Date().toISOString() })
  } catch {
    res.status(503).json({ ok: false, db: 'down', time: new Date().toISOString() })
  }
})

// ── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[unhandled]', err)
  res.status(500).json({ error: '伺服器發生錯誤，請稍後再試' })
})

// ── Socket.IO ─────────────────────────────────────────────────────────────────
setupSocketIO(io)

// ── Scheduled order auto-dispatch: every 60s ─────────────────────────────────
setInterval(async () => {
  try {
    const due = await prisma.order.findMany({
      where: { status: 'pending', scheduledAt: { lte: new Date() } },
    })
    for (const order of due) {
      const updated = await prisma.order.update({
        where: { id: order.id },
        data: { status: 'matching' },
      })
      io.to('drivers').emit('order:new', serializeOrder(updated))
      io.to(`user:${order.userId}`).emit('order:update', serializeOrder(updated))
    }
    if (due.length > 0) console.log(`[scheduler] Dispatched ${due.length} scheduled order(s)`)
  } catch (e) {
    console.error('[scheduler] Error dispatching scheduled orders:', e)
  }
}, 60_000)

// ── Auto-dispatch fallback: if no driver accepts the broadcast within the grace
//    window, auto-assign an online driver so the order never stalls. Drivers get
//    first chance to tap-accept (Uber-Eats style); this is only the safety net. ──
const DISPATCH_GRACE_MS = 45_000
setInterval(async () => {
  try {
    const matching = await prisma.order.findMany({
      where: {
        status: 'matching',
        driverId: null,
        createdAt: { lte: new Date(Date.now() - DISPATCH_GRACE_MS) },
      },
    })
    for (const order of matching) {
      const drivers = await prisma.driver.findMany({
        where: { status: 'online' },
        select: { id: true, lat: true, lng: true },
      })
      if (drivers.length === 0) continue

      // Pick the online driver nearest to the order's pickup point (real proximity).
      // Falls back to first driver only if the pickup was never geocoded.
      let chosen = drivers[0]
      if (order.pickupLat != null && order.pickupLng != null) {
        const sq = (d: { lat: number; lng: number }) =>
          (d.lat - order.pickupLat!) ** 2 + (d.lng - order.pickupLng!) ** 2
        chosen = drivers.reduce((best, d) => (sq(d) < sq(best) ? d : best), drivers[0])
      }

      const result = await prisma.order.updateMany({
        where: { id: order.id, status: 'matching' },
        data: { status: 'accepted', driverId: chosen.id },
      })
      if (result.count === 0) continue // already taken

      await prisma.driver.update({ where: { id: chosen.id }, data: { status: 'busy' } })
      await prisma.notification.create({
        data: { id: randomUUID(), userId: order.userId, type: 'info', title: '訂單已接單', body: `${order.id} — 已自動指派任務夥伴` },
      })
      const updated = await prisma.order.findUnique({ where: { id: order.id }, include: { driver: true } })
      if (updated) {
        io.to(`user:${order.userId}`).emit('order:update', serializeOrder(updated))
        io.to(`user:${chosen.id}`).emit('order:assigned', serializeOrder(updated))
        // Remove from every other driver's queue
        io.to('drivers').emit('order:taken', { id: order.id })
      }
      console.log(`[auto-dispatch] Order ${order.id} → driver ${chosen.id}`)
    }
  } catch (e) {
    console.error('[auto-dispatch] Error:', e)
  }
}, 30_000)

// ── Recurring order processor: every 60s ─────────────────────────────────────
setInterval(async () => {
  try {
    const due = await prisma.recurringOrder.findMany({
      where: { active: true, nextRun: { lte: new Date() } },
    })
    for (const rec of due) {
      // Use a transaction so ID generation + order creation are atomic
      const fare = await calcRecurringFare(rec.pickupAddress, rec.deliveryAddress, rec.speedTier, rec.userId)
      const order = await prisma.$transaction(async (tx) => {
        const newId = await nextOrderId(tx as typeof prisma)
        const created = await tx.order.create({
          data: {
            id: newId, userId: rec.userId,
            serviceType: rec.serviceType, status: 'matching',
            pickupAddress: rec.pickupAddress, deliveryAddress: rec.deliveryAddress,
            itemContent: rec.itemContent, speedTier: rec.speedTier,
            baseFee: fare.base_fee, surcharge: fare.surcharge, discount: 0, totalFee: fare.total_fee,
            distance: fare.distance, duration: fare.duration, recurringId: rec.id,
          },
        })
        await tx.recurringOrder.update({
          where: { id: rec.id },
          data: { nextRun: calcNextRun(rec.schedule, new Date()) },
        })
        return created
      })
      io.to('drivers').emit('order:new', serializeOrder(order))
      io.to(`user:${rec.userId}`).emit('order:update', serializeOrder(order))
      console.log(`[recurring] Spawned order ${order.id} from template ${rec.id}`)
    }
  } catch (e) { console.error('[recurring] Error:', e) }
}, 60_000)

// ── Monthly subscription renewal check: every hour ───────────────────────────
setInterval(async () => {
  try {
    const now = new Date()
    // Expire cancelled or lapsed subscriptions
    const lapsed = await prisma.subscription.findMany({
      where: { renewsAt: { lte: now }, cancelledAt: null },
    })
    for (const sub of lapsed) {
      // Reset vouchers and push renewsAt forward one month
      const nextRenew = new Date(sub.renewsAt)
      nextRenew.setMonth(nextRenew.getMonth() + 1)
      const vouchersLeft = sub.tier === 'pro' ? 3 : 999
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { renewsAt: nextRenew, vouchersLeft },
      })
    }
    // Downgrade users whose subscription was cancelled
    const cancelled = await prisma.subscription.findMany({
      where: { cancelledAt: { lte: now } },
      select: { userId: true },
    })
    for (const s of cancelled) {
      await prisma.user.updateMany({ where: { id: s.userId, subscriptionTier: { not: 'free' } }, data: { subscriptionTier: 'free' } })
    }
  } catch (e) { console.error('[subscription-renew] Error:', e) }
}, 60 * 60_000) // every 60 minutes

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001
server.listen(PORT, () => console.log(`Ufly backend running on :${PORT}`))
