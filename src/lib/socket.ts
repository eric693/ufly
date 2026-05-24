import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    const token = localStorage.getItem('ufly_token')
    socket = io('/', {
      path: '/socket.io',
      auth: { token: token || '' },
      transports: ['websocket', 'polling'],
    })
  }
  return socket
}

export function reconnectSocket() {
  if (socket) { socket.disconnect(); socket = null }
  return getSocket()
}
