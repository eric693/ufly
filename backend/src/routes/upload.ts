import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { requireAuth, AuthRequest } from '../middleware/requireAuth'
import prisma from '../lib/prisma'

const router = Router()

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
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
router.post('/proof/:orderId', requireAuth, upload.single('photo'), async (req: AuthRequest, res) => {
  if (!req.file) { res.status(400).json({ error: '請上傳圖片' }); return }

  const order = await prisma.order.findUnique({ where: { id: req.params.orderId } })
  if (!order) { res.status(404).json({ error: '訂單不存在' }); return }
  if (order.driverId !== req.user!.id) { res.status(403).json({ error: '無權限' }); return }

  const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 4010}`
  const photoUrl = `${baseUrl}/uploads/${req.file.filename}`

  await prisma.order.update({ where: { id: order.id }, data: { photoUrl } })
  res.json({ ok: true, photo_url: photoUrl })
})

export default router
