import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../lib/api'
import Logo from '../../components/Logo'

export default function DriverLogin() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [phone, setPhone]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone.trim()) return
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/auth/driver', { phone: phone.trim() })
      await login(data.token)
      navigate('/driver', { replace: true })
    } catch (err: any) {
      setError(err?.response?.data?.error || '登入失敗，請確認電話號碼')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <Logo size="lg" dark />
          </div>
          <p className="text-white/50 text-sm">司機接單系統</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-red-400 text-sm">
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="text-white/60 text-xs mb-2 block">電話號碼</label>
            <div className="flex items-center gap-3 bg-white/8 border border-white/15 rounded-2xl px-4 py-4">
              <Phone size={18} className="text-white/40 flex-shrink-0" />
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="請輸入您的電話號碼"
                className="bg-transparent text-white placeholder-white/30 outline-none flex-1 text-sm"
                autoComplete="tel"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !phone.trim()}
            className="w-full flex items-center justify-center gap-2 bg-white text-black font-bold
                       rounded-2xl px-4 py-4 text-sm hover:bg-gray-100 transition-colors disabled:opacity-50">
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            {loading ? '登入中…' : '司機登入'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <a href="/login" className="text-white/30 text-xs hover:text-white/60 transition-colors">
            ← 返回一般登入
          </a>
        </div>

        <p className="text-center text-white/20 text-xs mt-4">
          電話號碼需由管理員事先登記
        </p>
      </div>
    </div>
  )
}
