import { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma'

interface SocketUser { id: string; role: string; name: string }

export function setupSocketIO(io: Server) {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string
    if (!token) { (socket as any).role = 'guest'; return next() }
    try {
      const user = jwt.verify(token, process.env.JWT_SECRET!) as SocketUser;
      (socket as any).user = user;
      (socket as any).role = user.role
    } catch {
      (socket as any).role = 'guest'
    }
    next()
  })

  io.on('connection', (socket: Socket) => {
    const user: SocketUser | undefined = (socket as any).user
    if (user) {
      socket.join(`user:${user.id}`)
      if (user.role === 'admin') socket.join('admin')
      if (user.role === 'driver') socket.join('drivers')
    }

    socket.on('driver:setStatus', async (status: string) => {
      if ((socket as any).role !== 'driver' || !user) return
      if (!['online', 'offline', 'busy'].includes(status)) return
      await prisma.driver.update({ where: { id: user.id }, data: { status } })
      io.to('admin').emit('driver:statusChange', { driverId: user.id, status })
    })

    socket.on('driver:location', async (payload: { lat: number; lng: number }) => {
      if ((socket as any).role !== 'driver' || !user) return
      await prisma.driver.update({ where: { id: user.id }, data: { lat: payload.lat, lng: payload.lng } })
      io.to('admin').emit('driver:locationUpdate', { driverId: user.id, ...payload })
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
