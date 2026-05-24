import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function getRoleFromToken(token: string): string {
  try {
    return JSON.parse(atob(token.split('.')[1])).role ?? 'customer'
  } catch { return 'customer' }
}

export default function AuthCallback() {
  const [params] = useSearchParams()
  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const token = params.get('token')
    if (token) {
      const role = getRoleFromToken(token)
      login(token).then(() => {
        if (role === 'admin')  navigate('/admin',  { replace: true })
        else if (role === 'driver') navigate('/driver', { replace: true })
        else navigate('/', { replace: true })
      })
    } else {
      navigate('/login?error=failed', { replace: true })
    }
  }, [])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white text-sm">登入中...</div>
    </div>
  )
}
