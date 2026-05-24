import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma'

export interface AuthRequest extends Request {
  user?: { id: string; role: string; name: string; email?: string; avatar?: string }
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return }
  try {
    req.user = jwt.verify(auth.slice(7), process.env.JWT_SECRET!) as AuthRequest['user']
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    prisma.user.findUnique({ where: { id: req.user!.id }, select: { role: true } })
      .then(dbUser => {
        if (!dbUser || dbUser.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return }
        next()
      })
      .catch(() => res.status(403).json({ error: 'Forbidden' }))
  })
}

export function requireDriver(req: AuthRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'driver') { res.status(403).json({ error: 'Forbidden' }); return }
    next()
  })
}
