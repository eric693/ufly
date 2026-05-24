import { useState, useEffect, useRef } from 'react'
import { X, CheckCircle, Clock, Navigation, AlertCircle, Bell, Loader2 } from 'lucide-react'
import api from '../lib/api'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  read: number
  created_at: string
}

const ICONS: Record<string, React.ElementType> = {
  success: CheckCircle,
  info:    Clock,
  warning: AlertCircle,
  driver:  Navigation,
}
const COLORS: Record<string, string> = {
  success: 'text-emerald-600 bg-emerald-50',
  info:    'text-blue-500 bg-blue-50',
  warning: 'text-amber-500 bg-amber-50',
  driver:  'text-indigo-500 bg-indigo-50',
}

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '剛剛'
  if (mins < 60) return `${mins} 分鐘前`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} 小時前`
  return `${Math.floor(hrs / 24)} 天前`
}

interface Props { open: boolean; onClose: () => void }

export default function NotificationPanel({ open, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading]             = useState(false)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    api.get('/users/me/notifications')
      .then(r => setNotifications(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open])

  const markAllRead = async () => {
    try {
      await api.put('/users/me/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, read: 1 })))
    } catch { /* ignore */ }
  }

  if (!open) return null

  const unread = notifications.filter(n => !n.read).length

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/20" />
      <div ref={ref}
        className="absolute top-16 right-4 md:right-6 w-80 md:w-96 bg-white border border-paper-200
                   rounded-2xl shadow-card-xl overflow-hidden animate-slide-up">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-paper-200">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-paper-900" />
            <span className="font-bold text-sm text-paper-900">通知中心</span>
            {unread > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{unread}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {unread > 0 && (
              <button onClick={markAllRead} className="text-paper-500 text-xs hover:text-paper-900 transition-colors">
                全部已讀
              </button>
            )}
            <button onClick={onClose} className="text-paper-400 hover:text-paper-900 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto divide-y divide-paper-100">
          {loading ? (
            <div className="py-10 flex items-center justify-center">
              <Loader2 size={20} className="animate-spin text-paper-400" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-10 text-center text-paper-400 text-sm">目前沒有通知</div>
          ) : notifications.map(n => {
            const Icon = ICONS[n.type] ?? Bell
            const color = COLORS[n.type] ?? 'text-paper-500 bg-paper-100'
            return (
              <div key={n.id}
                className={`flex items-start gap-3 px-4 py-3.5 hover:bg-paper-50 transition-colors cursor-pointer
                  ${!n.read ? 'bg-paper-50' : 'bg-white'}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${color}`}>
                  <Icon size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-sm font-semibold ${!n.read ? 'text-paper-900' : 'text-paper-700'}`}>{n.title}</span>
                    {!n.read && <div className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0 mt-1.5" />}
                  </div>
                  <div className="text-paper-500 text-xs mt-0.5 leading-relaxed">{n.body}</div>
                  <div className="text-paper-400 text-xs mt-1">{relativeTime(n.created_at)}</div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="px-4 py-3 border-t border-paper-200 text-center">
          <span className="text-paper-400 text-xs">顯示最近 30 則通知</span>
        </div>
      </div>
    </div>
  )
}
