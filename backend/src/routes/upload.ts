import { randomBytes } from 'crypto'
import { Router } from 'express'
import { Server } from 'socket.io'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { requireDriver, AuthRequest } from '../middleware/requireAuth'
import prisma from '../lib/prisma'
import { serializeOrder } from '../lib/serializer'

const router = Router()

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${randomBytes(16).toString('hex')}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp)$/.test(file.mimetype)) cb(null, true)
    else cb(new Error('只接受 JPG/PNG/WebP 圖片'))
  },
})

// POST /api/upload/proof/:orderId — driver uploads delivery proof photo
router.post('/proof/:orderId', requireDriver, upload.single('photo'), async (req: AuthRequest, res) => {
  if (!req.file) { res.status(400).json({ error: '請上傳圖片' }); return }

  const order = await prisma.order.findUnique({ where: { id: req.params.orderId } })
  if (!order) { res.status(404).json({ error: '訂單不存在' }); return }
  if (order.driverId !== req.user!.id) { res.status(403).json({ error: '無權限' }); return }
  if (!['delivering', 'completed'].includes(order.status)) { res.status(400).json({ error: '只有配送中或已完成的訂單可上傳照片' }); return }

  const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 4010}`
  const photoUrl = `${baseUrl}/uploads/${req.file.filename}`

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { photoUrl },
    include: { driver: true },
  })

  // Notify customer and admin that the proof photo is available
  const io: Server | null = req.app.get('io')
  if (io) {
    const serialized = serializeOrder(updated)
    io.to(`user:${order.userId}`).emit('order:update', serialized)
    io.to('admin').emit('order:update', serialized)
  }

  res.json({ ok: true, photo_url: photoUrl })
})

export default router
