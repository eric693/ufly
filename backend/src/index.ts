import 'dotenv/config'
import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import cors from 'cors'

import authRouter       from './routes/auth'
import usersRouter      from './routes/users'
import ordersRouter     from './routes/orders'
import enterprisesRouter from './routes/enterprises'
import adminRouter      from './routes/admin'
import driversRouter    from './routes/drivers'
import { setupSocketIO } from './socket'

const app    = express()
const server = http.createServer(app)
const io     = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true },
  path: '/socket.io',
})

app.set('io', io)
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }))
app.use(express.json())

app.use('/api/auth',        authRouter)
app.use('/api/users',       usersRouter)
app.use('/api/orders',      ordersRouter)
app.use('/api/enterprises', enterprisesRouter)
app.use('/api/admin',       adminRouter)
app.use('/api/drivers',     driversRouter)

app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }))

setupSocketIO(io)

const PORT = process.env.PORT || 3001
server.listen(PORT, () => console.log(`Ufly backend running on :${PORT}`))
