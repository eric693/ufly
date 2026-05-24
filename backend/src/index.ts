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
import webhooksRouter    from './routes/webhooks'
import { setupSocketIO } from './socket'
import prisma from './lib/prisma'
import { serializeOrder } from './lib/serializer'
import { calcNextRun } from './routes/orders'

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
app.use('/api/webhooks',    webhooksRouter)

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

// ── Auto-dispatch: assign nearest online driver to matching orders ─────────────
setInterval(async () => {
  try {
    const matching = await prisma.order.findMany({
      where: { status: 'matching', driverId: null },
    })
    for (const order of matching) {
      const drivers = await prisma.driver.findMany({
        where: { status: 'online' },
        select: { id: true, lat: true, lng: true },
      })
      if (drivers.length === 0) continue

      // Pick driver with lat/lng closest to Taipei centre (rough heuristic when pickup coords unknown)
      const TAIPEI_LAT = 25.033, TAIPEI_LNG = 121.565
      drivers.sort((a, b) => {
        const da = Math.hypot(a.lat - TAIPEI_LAT, a.lng - TAIPEI_LNG)
        const db = Math.hypot(b.lat - TAIPEI_LAT, b.lng - TAIPEI_LNG)
        return da - db
      })
      const chosen = drivers[0]

      const result = await prisma.order.updateMany({
        where: { id: order.id, status: 'matching' },
        data: { status: 'accepted', driverId: chosen.id },
      })
      if (result.count === 0) continue // already taken

      await prisma.driver.update({ where: { id: chosen.id }, data: { status: 'busy' } })
      await prisma.notification.create({
        data: { id: require('crypto').randomUUID(), userId: order.userId, type: 'info', title: '訂單已接單', body: `${order.id} — 已自動指派任務夥伴` },
      })
      const updated = await prisma.order.findUnique({ where: { id: order.id }, include: { driver: true } })
      if (updated) {
        io.to(`user:${order.userId}`).emit('order:update', serializeOrder(updated))
        io.to(`driver:${chosen.id}`).emit('order:assigned', serializeOrder(updated))
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
      const last = await prisma.order.findFirst({ where: { id: { startsWith: 'UF' } }, orderBy: { id: 'desc' } })
      const newId = last
        ? 'UF' + String(parseInt(last.id.replace('UF', '')) + 1).padStart(6, '0')
        : 'UF240001'

      const order = await prisma.order.create({
        data: {
          id: newId, userId: rec.userId,
          serviceType: rec.serviceType, status: 'matching',
          pickupAddress: rec.pickupAddress, deliveryAddress: rec.deliveryAddress,
          itemContent: rec.itemContent, speedTier: rec.speedTier,
          baseFee: 120, surcharge: 0, discount: 0, totalFee: 120,
          distance: 0, duration: 0, recurringId: rec.id,
        },
      })
      await prisma.recurringOrder.update({
        where: { id: rec.id },
        data: { nextRun: calcNextRun(rec.schedule, new Date()) },
      })
      io.to('drivers').emit('order:new', serializeOrder(order))
      io.to(`user:${rec.userId}`).emit('order:update', serializeOrder(order))
      console.log(`[recurring] Spawned order ${newId} from template ${rec.id}`)
    }
  } catch (e) { console.error('[recurring] Error:', e) }
}, 60_000)

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001
server.listen(PORT, () => console.log(`Ufly backend running on :${PORT}`))
