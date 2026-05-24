import { Router } from 'express'
import axios from 'axios'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../lib/prisma'
import { serializeUser } from '../lib/serializer'

const router = Router()
const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5173'
const API_URL  = process.env.API_URL      || 'http://localhost:3001'

function makeToken(payload: { id: string; name: string; role: string; email?: string | null; avatar?: string | null }) {
  return jwt.sign(
    { id: payload.id, name: payload.name, role: payload.role, email: payload.email, avatar: payload.avatar },
    process.env.JWT_SECRET!,
    { expiresIn: '30d' }
  )
}

async function findDriverByOAuth(params: { google_id?: string; line_id?: string; email?: string }) {
  if (params.google_id) {
    const d = await prisma.driver.findUnique({ where: { googleId: params.google_id } })
    if (d) return d
  }
  if (params.line_id) {
    const d = await prisma.driver.findUnique({ where: { lineId: params.line_id } })
    if (d) return d
  }
  if (params.email) {
    const d = await prisma.driver.findUnique({ where: { email: params.email } })
    if (d) return d
  }
  return null
}

async function findOrCreateUser(params: {
  google_id?: string; line_id?: string
  name: string; email?: string; avatar?: string
}) {
  const { google_id, line_id, name, email, avatar } = params

  let user = google_id
    ? await prisma.user.findUnique({ where: { googleId: google_id } })
    : await prisma.user.findUnique({ where: { lineId: line_id } })

  if (!user && email) user = await prisma.user.findUnique({ where: { email } })

  if (user) {
    return prisma.user.update({
      where: { id: user.id },
      data: {
        name, avatar: avatar ?? undefined,
        googleId: google_id ?? undefined,
        lineId:   line_id ?? undefined,
      },
    })
  }

  return prisma.user.create({
    data: {
      id: uuidv4(), name,
      email:    email    ?? undefined,
      avatar:   avatar   ?? undefined,
      googleId: google_id ?? undefined,
      lineId:   line_id  ?? undefined,
    },
  })
}

// GET /api/auth/google
router.get('/google', (_req, res) => {
  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID!,
    redirect_uri:  `${API_URL}/api/auth/google/callback`,
    response_type: 'code',
    scope:         'openid email profile',
    access_type:   'offline',
  })
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
})

router.get('/google/callback', async (req, res) => {
  const { code } = req.query
  if (!code) { res.redirect(`${FRONTEND}/login?error=cancelled`); return }
  try {
    const { data: tokens } = await axios.post('https://oauth2.googleapis.com/token', {
      code, grant_type: 'authorization_code',
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri:  `${API_URL}/api/auth/google/callback`,
    })
    const { data: profile } = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    // Check if this Google account belongs to a registered driver
    const driver = await findDriverByOAuth({ google_id: profile.id, email: profile.email })
    if (driver) {
      await prisma.driver.update({ where: { id: driver.id }, data: { googleId: profile.id } })
      res.redirect(`${FRONTEND}/auth/callback?token=${makeToken({ id: driver.id, name: driver.name, role: 'driver' })}`)
      return
    }
    const user = await findOrCreateUser({ google_id: profile.id, name: profile.name, email: profile.email, avatar: profile.picture })
    res.redirect(`${FRONTEND}/auth/callback?token=${makeToken(user)}`)
  } catch (e: any) {
    console.error('Google auth error:', e.message)
    res.redirect(`${FRONTEND}/login?error=failed`)
  }
})

// GET /api/auth/line
router.get('/line', (_req, res) => {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     process.env.LINE_CHANNEL_ID!,
    redirect_uri:  `${API_URL}/api/auth/line/callback`,
    state:         uuidv4(),
    scope:         'profile openid email',
  })
  res.redirect(`https://access.line.me/oauth2/v2.1/authorize?${params}`)
})

router.get('/line/callback', async (req, res) => {
  const { code } = req.query
  if (!code) { res.redirect(`${FRONTEND}/login?error=cancelled`); return }
  try {
    const { data: tokens } = await axios.post(
      'https://api.line.me/oauth2/v2.1/token',
      new URLSearchParams({
        grant_type: 'authorization_code', code: code as string,
        redirect_uri:  `${API_URL}/api/auth/line/callback`,
        client_id:     process.env.LINE_CHANNEL_ID!,
        client_secret: process.env.LINE_CHANNEL_SECRET!,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    )
    const { data: profile } = await axios.get('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    // Check if this LINE account belongs to a registered driver
    const driver = await findDriverByOAuth({ line_id: profile.userId })
    if (driver) {
      await prisma.driver.update({ where: { id: driver.id }, data: { lineId: profile.userId } })
      res.redirect(`${FRONTEND}/auth/callback?token=${makeToken({ id: driver.id, name: driver.name, role: 'driver' })}`)
      return
    }
    const user = await findOrCreateUser({ line_id: profile.userId, name: profile.displayName, avatar: profile.pictureUrl })
    res.redirect(`${FRONTEND}/auth/callback?token=${makeToken(user)}`)
  } catch (e: any) {
    console.error('Line auth error:', e.message)
    res.redirect(`${FRONTEND}/login?error=failed`)
  }
})

// POST /api/auth/driver  — driver login by phone number
router.post('/driver', async (req, res) => {
  const { phone } = req.body
  if (!phone) { res.status(400).json({ error: '請輸入電話號碼' }); return }
  const driver = await prisma.driver.findFirst({ where: { phone: phone.trim() } })
  if (!driver) { res.status(404).json({ error: '找不到此電話的司機帳號，請聯絡管理員' }); return }
  const token = jwt.sign(
    { id: driver.id, name: driver.name, role: 'driver' },
    process.env.JWT_SECRET!,
    { expiresIn: '30d' }
  )
  res.json({ token })
})

// GET /api/auth/me
router.get('/me', async (req, res) => {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) { res.json(null); return }
  try {
    const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET!) as { id: string; role?: string }

    // Driver token — look up in drivers table
    if (payload.role === 'driver') {
      const driver = await prisma.driver.findUnique({ where: { id: payload.id } })
      if (!driver) { res.json(null); return }
      res.json({
        id: driver.id, name: driver.name, role: 'driver',
        email: null, phone: driver.phone, avatar: null,
        rating: Number(driver.rating), total_orders: driver.totalTrips,
      })
      return
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, name: true, email: true, phone: true, avatar: true, role: true, rating: true, totalOrders: true, referralCode: true, createdAt: true },
    })
    res.json(user ? serializeUser(user) : null)
  } catch {
    res.json(null)
  }
})

export default router
