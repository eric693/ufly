import { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma'

interface SocketUser { id: string; role: string; name: string }

export function setupSocketIO(io: Server) {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string
    if (!token) return next(new Error('Authentication required'))
    try {
      const user = jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] }) as SocketUser;
      (socket as any).user = user;
      (socket as any).role = user.role
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket: Socket) => {
    const user: SocketUser = (socket as any).user
    socket.join(`user:${user.id}`)
    if (user.role === 'admin')  socket.join('admin')
    if (user.role === 'driver') socket.join('drivers')

    socket.on('driver:setStatus', async (status: string) => {
      if (user.role !== 'driver') return
      if (!['online', 'offline', 'busy'].includes(status)) return
      await prisma.driver.update({ where: { id: user.id }, data: { status } })
      io.to('admin').emit('driver:statusChange', { driverId: user.id, status })
    })

    socket.on('driver:location', async (payload: { lat: number; lng: number }) => {
      if (user.role !== 'driver') return
      const lat = Number(payload?.lat)
      const lng = Number(payload?.lng)
      if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return
      try {
        await prisma.driver.update({ where: { id: user.id }, data: { lat, lng } })
        io.to('admin').emit('driver:locationUpdate', { driverId: user.id, lat, lng })
        const activeOrder = await prisma.order.findFirst({
          where: { driverId: user.id, status: { in: ['accepted', 'pickup', 'delivering'] } },
          select: { userId: true },
        })
        if (activeOrder) {
          io.to(`user:${activeOrder.userId}`).emit('driver:locationUpdate', { driverId: user.id, lat, lng })
        }
      } catch (e) { console.error('[socket:driver:location]', e) }
    })

    socket.on('disconnect', () => {
      socket.leave(`user:${user.id}`)
      if (user.role === 'admin')  socket.leave('admin')
      if (user.role === 'driver') socket.leave('drivers')
    })
  })

  // Broadcast real driver positions to admin every 5s
  setInterval(async () => {
    const drivers = await prisma.driver.findMany({
      where: { status: { not: 'offline' } },
      select: { id: true, name: true, status: true, area: true, lat: true, lng: true, rating: true },
    })
    io.to('admin').emit('drivers:positions', drivers)
  }, 5000)
}
