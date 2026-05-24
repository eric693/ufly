import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import api from '../lib/api'

interface User {
  id: string
  name: string
  email?: string
  phone?: string
  avatar?: string
  role: 'customer' | 'admin'
  rating: number
  total_orders: number
}

interface AuthCtx {
  user: User | null
  loading: boolean
  login: (token: string) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
}

const Ctx = createContext<AuthCtx>({} as AuthCtx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchMe = async () => {
    try {
      const { data } = await api.get('/auth/me')
      setUser(data)
    } catch {
      setUser(null)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('ufly_token')
    if (token) fetchMe().finally(() => setLoading(false))
    else setLoading(false)
  }, [])

  const login = async (token: string) => {
    localStorage.setItem('ufly_token', token)
    await fetchMe()
  }

  const logout = () => {
    localStorage.removeItem('ufly_token')
    setUser(null)
  }

  return (
    <Ctx.Provider value={{ user, loading, login, logout, refresh: fetchMe }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
