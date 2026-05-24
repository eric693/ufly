import { Navigate, Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export function AdminRoute() {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0d0f]">
      <Loader2 size={24} className="animate-spin text-gray-400" />
    </div>
  )
  if (!user || user.role !== 'admin') return <Navigate to="/login" replace />
  return <Outlet />
}

export function DriverRoute() {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 size={24} className="animate-spin text-paper-400" />
    </div>
  )
  if (!user || user.role !== 'driver') return <Navigate to="/driver/login" replace />
  return <Outlet />
}
