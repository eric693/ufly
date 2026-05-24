import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/requireAuth'
import { serializeUser, serializeAddress, serializeNotification, serializeRecurring } from '../lib/serializer'

const router = Router()

function genReferralCode(name: string) {
  const letters = (name || 'UFY').replace(/[^a-zA-Z一-龥]/g, '').slice(0, 2).toUpperCase()
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${letters || 'UF'}${suffix}`
}

async function ensureReferralCode(userId: string, name: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } })
  if (user?.referralCode) return user.referralCode
  let code: string, tries = 0
  do {
    code = genReferralCode(name)
    tries++
  } while (tries < 10 && await prisma.user.findUnique({ where: { referralCode: code } }))
  await prisma.user.update({ where: { id: userId }, data: { referralCode: code! } })
  return code!
}

router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, name: true, email: true, phone: true, avatar: true, role: true, rating: true, totalOrders: true, referralCode: true, enterpriseId: true, createdAt: true },
  })
  if (!user) { res.status(404).json({ error: 'Not found' }); return }
  if (!user.referralCode) user.referralCode = await ensureReferralCode(req.user!.id, user.name)
  res.json(serializeUser(user))
})

router.put('/me', requireAuth, async (req: AuthRequest, res) => {
  const { name, phone } = req.body
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { ...(name ? { name } : {}), ...(phone !== undefined ? { phone: phone || null } : {}) },
  })
  res.json(serializeUser(user))
})

router.get('/me/addresses', requireAuth, async (req: AuthRequest, res) => {
  const rows = await prisma.savedAddress.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'asc' } })
  res.json(rows.map(serializeAddress))
})

router.post('/me/addresses', requireAuth, async (req: AuthRequest, res) => {
  const { label, address, type } = req.body
  if (!label || !address) { res.status(400).json({ error: 'label and address required' }); return }
  const row = await prisma.savedAddress.create({ data: { id: uuidv4(), userId: req.user!.id, label, address, type: type || 'other' } })
  res.json(serializeAddress(row))
})

router.put('/me/addresses/:id', requireAuth, async (req: AuthRequest, res) => {
  const { label, address } = req.body
  const row = await prisma.savedAddress.updateMany({ where: { id: req.params.id, userId: req.user!.id }, data: { ...(label ? { label } : {}), ...(address ? { address } : {}) } })
  if (row.count === 0) { res.status(404).json({ error: 'Not found' }); return }
  const updated = await prisma.savedAddress.findUnique({ where: { id: req.params.id } })
  res.json(updated ? serializeAddress(updated) : null)
})

router.delete('/me/addresses/:id', requireAuth, async (req: AuthRequest, res) => {
  await prisma.savedAddress.deleteMany({ where: { id: req.params.id, userId: req.user!.id } })
  res.json({ ok: true })
})

router.post('/me/referral/apply', requireAuth, async (req: AuthRequest, res) => {
  const { code } = req.body
  if (!code) { res.status(400).json({ error: '請提供推薦碼' }); return }
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
  if (user?.referralBy) { res.status(400).json({ error: '已使用過推薦碼' }); return }
  const referrer = await prisma.user.findUnique({ where: { referralCode: code.toUpperCase() } })
  if (!referrer) { res.status(404).json({ error: '推薦碼無效' }); return }
  if (referrer.id === req.user!.id) { res.status(400).json({ error: '不可使用自己的推薦碼' }); return }
  await prisma.user.update({ where: { id: req.user!.id }, data: { referralBy: referrer.id } })
  await prisma.notification.create({ data: { id: uuidv4(), userId: referrer.id, type: 'success', title: '有新用戶使用了您的推薦碼', body: '推薦獎勵已計入您的帳戶' } })
  res.json({ ok: true, message: '推薦碼套用成功，首單享 NT$50 折扣' })
})

router.get('/me/referral/stats', requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { referralCode: true } })
  const code = user?.referralCode ?? await ensureReferralCode(req.user!.id, 'UF')
  const referredCount = await prisma.user.count({ where: { referralBy: req.user!.id } })
  res.json({ code, referred_count: referredCount, reward_total: referredCount * 50 })
})

// read-all must come before /:id
router.put('/me/notifications/read-all', requireAuth, async (req: AuthRequest, res) => {
  await prisma.notification.updateMany({ where: { userId: req.user!.id }, data: { read: true } })
  res.json({ ok: true })
})

router.get('/me/notifications', requireAuth, async (req: AuthRequest, res) => {
  const rows = await prisma.notification.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 30 })
  res.json(rows.map(serializeNotification))
})

router.put('/me/notifications/:id/read', requireAuth, async (req: AuthRequest, res) => {
  await prisma.notification.updateMany({ where: { id: req.params.id, userId: req.user!.id }, data: { read: true } })
  res.json({ ok: true })
})

export default router
