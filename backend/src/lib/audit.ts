import { Request } from 'express'
import prisma from './prisma'

export async function auditLog(
  action: string,
  req?: Request,
  target?: string,
  detail?: string,
  userId?: string,
) {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || null) : null
    await prisma.auditLog.create({ data: { action, target: target || null, detail: detail || null, ip, userId: userId || null } })
  } catch {
    // audit log failure should never break the main flow
  }
}
