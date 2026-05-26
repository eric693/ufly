import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/requireAuth'

const router = Router()

const TIERS: Record<string, { monthlyFee: number; vouchers: number }> = {
  pro:        { monthlyFee: 299, vouchers: 3 },
  enterprise: { monthlyFee: 999, vouchers: 999 },
}

router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { subscriptionTier: true, subscription: true },
  })
  res.json({ tier: user?.subscriptionTier ?? 'free', subscription: user?.subscription ?? null })
})

router.post('/upgrade', requireAuth, async (req: AuthRequest, res) => {
  const { tier } = req.body
  if (!TIERS[tier]) { res.status(400).json({ error: '無效的訂閱方案' }); return }

  const cfg = TIERS[tier]
  const renewsAt = new Date()
  renewsAt.setMonth(renewsAt.getMonth() + 1)

  const existing = await prisma.subscription.findUnique({ where: { userId: req.user!.id } })

  try {
    await prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.subscription.update({
          where: { userId: req.user!.id },
          data: { tier, monthlyFee: cfg.monthlyFee, renewsAt, cancelledAt: null, vouchersLeft: cfg.vouchers },
        })
      } else {
        await tx.subscription.create({
          data: { id: uuidv4(), userId: req.user!.id, tier, monthlyFee: cfg.monthlyFee, renewsAt, vouchersLeft: cfg.vouchers },
        })
      }
      await tx.user.update({ where: { id: req.user!.id }, data: { subscriptionTier: tier } })
    })
    res.json({ ok: true, tier })
  } catch (e) {
    console.error('[subscription-upgrade]', e)
    res.status(500).json({ error: '訂閱升級失敗，請稍後再試' })
  }
})

router.delete('/cancel', requireAuth, async (req: AuthRequest, res) => {
  const sub = await prisma.subscription.findUnique({ where: { userId: req.user!.id } })
  if (!sub) { res.status(404).json({ error: '尚無訂閱' }); return }

  await prisma.$transaction(async (tx) => {
    await tx.subscription.update({ where: { userId: req.user!.id }, data: { cancelledAt: new Date() } })
    await tx.user.update({ where: { id: req.user!.id }, data: { subscriptionTier: 'free' } })
  })
  res.json({ ok: true })
})

export default router
