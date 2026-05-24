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

export function disconnectSocket() {
  if (socket) { socket.disconnect(); socket = null }
}

export function reconnectSocket() {
  disconnectSocket()
  return getSocket()
}
