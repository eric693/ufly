import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../lib/prisma'
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/requireAuth'

const router = Router()

const REASONS = ['費用爭議', '物品損壞', '服務品質', '配送延誤', '其他']

// Customer: submit a dispute
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const { order_id, reason, description } = req.body
  if (!order_id || !reason || !description) {
    res.status(400).json({ error: '請填寫所有必要欄位' }); return
  }
  if (!REASONS.includes(reason)) {
    res.status(400).json({ error: '無效的爭議原因' }); return
  }
  if (typeof description !== 'string' || description.length > 1000) {
    res.status(400).json({ error: '說明過長（上限 1000 字）' }); return
  }

  const order = await prisma.order.findFirst({
    where: { id: order_id, userId: req.user!.id, status: 'completed' },
  })
  if (!order) {
    res.status(404).json({ error: '訂單不存在或尚未完成' }); return
  }

  const existing = await prisma.dispute.findFirst({
    where: { orderId: order_id, userId: req.user!.id },
  })
  if (existing) {
    res.status(400).json({ error: '此訂單已提交申訴，請勿重複提交' }); return
  }

  const dispute = await prisma.dispute.create({
    data: { id: uuidv4(), orderId: order_id, userId: req.user!.id, reason, description },
  })
  res.json(dispute)
})

// Customer: list own disputes
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const disputes = await prisma.dispute.findMany({
    where: { userId: req.user!.id },
    include: {
      order: { select: { id: true, pickupAddress: true, deliveryAddress: true, totalFee: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json(disputes)
})

// Admin: list all disputes
router.get('/admin/all', requireAdmin, async (_req, res) => {
  const disputes = await prisma.dispute.findMany({
    include: {
      order: { select: { id: true, pickupAddress: true, deliveryAddress: true, totalFee: true } },
      user:  { select: { name: true, email: true, phone: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json(disputes)
})

// Admin: resolve or reject a dispute
router.patch('/admin/:id', requireAdmin, async (req: AuthRequest, res) => {
  const { status, resolution } = req.body
  if (!['investigating', 'resolved', 'rejected'].includes(status)) {
    res.status(400).json({ error: '無效的狀態' }); return
  }
  const dispute = await prisma.dispute.update({
    where: { id: req.params.id },
    data: { status, resolution: resolution || null, resolvedBy: req.user!.id },
  })
  res.json(dispute)
})

export default router
