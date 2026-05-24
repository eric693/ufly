import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../lib/prisma'
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/requireAuth'

const router = Router()

router.get('/mine', requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { enterpriseId: true } })
  if (!user?.enterpriseId) { res.json(null); return }
  const ent = await prisma.enterprise.findUnique({ where: { id: user.enterpriseId } })
  if (!ent) { res.json(null); return }
  const members = await prisma.user.findMany({ where: { enterpriseId: user.enterpriseId }, select: { id: true, name: true, email: true, totalOrders: true } })
  const agg = await prisma.order.aggregate({ where: { enterpriseId: user.enterpriseId }, _count: { id: true }, _sum: { totalFee: true } })
  res.json({ ...ent, members, member_count: members.length, order_count: agg._count.id, order_total: agg._sum.totalFee ?? 0 })
})

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { enterpriseId: true } })
  if (user?.enterpriseId) { res.status(400).json({ error: '已屬於企業帳號' }); return }
  const { name, tax_id, contact_name, contact_phone, contact_email, billing_address } = req.body
  if (!name) { res.status(400).json({ error: '請填寫企業名稱' }); return }
  const ent = await prisma.enterprise.create({ data: { id: uuidv4(), name, taxId: tax_id || null, contactName: contact_name || null, contactPhone: contact_phone || null, contactEmail: contact_email || null, billingAddress: billing_address || null } })
  await prisma.user.update({ where: { id: req.user!.id }, data: { enterpriseId: ent.id } })
  res.json(ent)
})

router.put('/mine', requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { enterpriseId: true } })
  if (!user?.enterpriseId) { res.status(404).json({ error: '未加入企業' }); return }
  const { name, contact_name, contact_phone, contact_email, billing_address } = req.body
  const ent = await prisma.enterprise.update({
    where: { id: user.enterpriseId },
    data: { ...(name ? { name } : {}), ...(contact_name ? { contactName: contact_name } : {}), ...(contact_phone ? { contactPhone: contact_phone } : {}), ...(contact_email ? { contactEmail: contact_email } : {}), ...(billing_address ? { billingAddress: billing_address } : {}) },
  })
  res.json(ent)
})

router.post('/mine/invite', requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { enterpriseId: true } })
  if (!user?.enterpriseId) { res.status(404).json({ error: '未加入企業' }); return }
  const { email } = req.body
  const target = await prisma.user.findUnique({ where: { email } })
  if (!target) { res.status(404).json({ error: '查無此用戶' }); return }
  if (target.enterpriseId) { res.status(400).json({ error: '該用戶已有企業帳號' }); return }
  await prisma.user.update({ where: { id: target.id }, data: { enterpriseId: user.enterpriseId } })
  await prisma.notification.create({ data: { id: uuidv4(), userId: target.id, type: 'info', title: '企業帳號邀請', body: '您已加入企業帳號，即可使用月結付款' } })
  res.json({ ok: true })
})

router.get('/', requireAdmin, async (_req, res) => {
  const rows = await prisma.enterprise.findMany({ orderBy: { createdAt: 'desc' } })
  const result = await Promise.all(rows.map(async e => {
    const member_count = await prisma.user.count({ where: { enterpriseId: e.id } })
    return { ...e, member_count }
  }))
  res.json(result)
})

export default router
