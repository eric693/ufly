import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function AuthCallback() {
  const [params] = useSearchParams()
  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const token = params.get('token')
    if (token) {
      login(token).then(() => navigate('/', { replace: true }))
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
