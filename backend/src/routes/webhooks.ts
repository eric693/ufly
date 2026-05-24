import crypto from 'crypto'
import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/requireAuth'

const router = Router()

async function getEnterpriseId(userId: string): Promise<string | null> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { enterpriseId: true } })
  return u?.enterpriseId ?? null
}

// List own endpoints
router.get('/mine', requireAuth, async (req: AuthRequest, res) => {
  const eid = await getEnterpriseId(req.user!.id)
  if (!eid) { res.json([]); return }
  const rows = await prisma.webhookEndpoint.findMany({
    where: { enterpriseId: eid },
    include: { _count: { select: { deliveries: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(rows.map(({ _count, secret: _s, ...e }: { _count: { deliveries: number }; secret: string; [k: string]: unknown }) => ({ ...e, delivery_count: _count.deliveries })))
})

// Create endpoint
router.post('/mine', requireAuth, async (req: AuthRequest, res) => {
  const eid = await getEnterpriseId(req.user!.id)
  if (!eid) { res.status(403).json({ error: '需要企業帳號' }); return }

  const { url, events } = req.body
  if (!url) { res.status(400).json({ error: '請填寫 Webhook URL' }); return }
  try { new URL(url) } catch { res.status(400).json({ error: '無效的 URL 格式' }); return }

  const secret   = crypto.randomBytes(32).toString('hex')
  const endpoint = await prisma.webhookEndpoint.create({
    data: {
      id: uuidv4(),
      enterpriseId: eid,
      url,
      secret,
      events: events || 'order.status_changed',
    },
  })
  res.json(endpoint) // return with secret on creation
})

// Toggle active
router.patch('/mine/:id', requireAuth, async (req: AuthRequest, res) => {
  const eid = await getEnterpriseId(req.user!.id)
  if (!eid) { res.status(403).json({ error: '需要企業帳號' }); return }
  const { active } = req.body
  const ep = await prisma.webhookEndpoint.updateMany({
    where: { id: req.params.id, enterpriseId: eid },
    data: { active: Boolean(active) },
  })
  if (ep.count === 0) { res.status(404).json({ error: '不存在' }); return }
  res.json({ ok: true })
})

// Delete endpoint (also cascades deliveries via Prisma transaction)
router.delete('/mine/:id', requireAuth, async (req: AuthRequest, res) => {
  const eid = await getEnterpriseId(req.user!.id)
  if (!eid) { res.status(403).json({ error: '需要企業帳號' }); return }
  // Delete deliveries first (no DB-level cascade), then the endpoint
  const ep = await prisma.webhookEndpoint.findFirst({ where: { id: req.params.id, enterpriseId: eid }, select: { id: true } })
  if (!ep) { res.status(404).json({ error: '不存在' }); return }
  await prisma.webhookDelivery.deleteMany({ where: { endpointId: ep.id } })
  await prisma.webhookEndpoint.delete({ where: { id: ep.id } })
  res.json({ ok: true })
})

// Get secret (shown once on creation; this regenerates it)
router.post('/mine/:id/rotate-secret', requireAuth, async (req: AuthRequest, res) => {
  const eid = await getEnterpriseId(req.user!.id)
  if (!eid) { res.status(403).json({ error: '需要企業帳號' }); return }
  const secret = crypto.randomBytes(32).toString('hex')
  const ep = await prisma.webhookEndpoint.updateMany({
    where: { id: req.params.id, enterpriseId: eid },
    data: { secret },
  })
  if (ep.count === 0) { res.status(404).json({ error: '不存在' }); return }
  res.json({ secret })
})

// Delivery logs
router.get('/mine/:id/deliveries', requireAuth, async (req: AuthRequest, res) => {
  const eid = await getEnterpriseId(req.user!.id)
  if (!eid) { res.status(403).json({ error: '需要企業帳號' }); return }
  const ep = await prisma.webhookEndpoint.findFirst({ where: { id: req.params.id, enterpriseId: eid } })
  if (!ep) { res.status(404).json({ error: '不存在' }); return }
  const deliveries = await prisma.webhookDelivery.findMany({
    where: { endpointId: req.params.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  res.json(deliveries)
})

export default router
