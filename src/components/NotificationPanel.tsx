import { useEffect, useRef } from 'react'
import { X, CheckCircle, Clock, Navigation, AlertCircle, Bell } from 'lucide-react'

interface Notification {
  id: string
  type: 'success' | 'info' | 'warning' | 'driver'
  title: string
  body: string
  time: string
  read: boolean
}

const NOTIFICATIONS: Notification[] = [
  { id: '1', type: 'success',  title: '訂單已送達',    body: 'UF240001 — 王小明已完成配送',              time: '5 分鐘前',  read: false },
  { id: '2', type: 'driver',   title: '夥伴已接單',    body: 'UF240004 — 陳美玲正在前往取件地點',         time: '18 分鐘前', read: false },
  { id: '3', type: 'info',     title: '訂單媒合中',    body: 'UF240006 — 正在尋找附近的任務夥伴',         time: '32 分鐘前', read: true  },
  { id: '4', type: 'warning',  title: '系統公告',      body: '今晚 11:00–11:30 進行系統維護，服務暫停',    time: '1 小時前',  read: true  },
  { id: '5', type: 'success',  title: '訂單已送達',    body: 'UF240003 — 李大華已完成配送',              time: '2 小時前',  read: true  },
]

const ICONS = {
  success: CheckCircle,
  info:    Clock,
  warning: AlertCircle,
  driver:  Navigation,
}
const COLORS = {
  success: 'text-emerald-600 bg-emerald-50',
  info:    'text-blue-500 bg-blue-50',
  warning: 'text-amber-500 bg-amber-50',
  driver:  'text-indigo-500 bg-indigo-50',
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function NotificationPanel({ open, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  if (!open) return null

  const unread = NOTIFICATIONS.filter(n => !n.read).length

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/20" />
      <div ref={ref}
        className="absolute top-16 right-4 md:right-6 w-80 md:w-96 bg-white border border-paper-200
                   rounded-2xl shadow-card-xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-paper-200">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-paper-900" />
            <span className="font-bold text-sm text-paper-900">通知中心</span>
            {unread > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{unread}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button className="text-paper-500 text-xs hover:text-paper-900 transition-colors">全部已讀</button>
            <button onClick={onClose} className="text-paper-400 hover:text-paper-900 transition-colors"><X size={16} /></button>
          </div>
        </div>

        {/* List */}
        <div className="max-h-96 overflow-y-auto divide-y divide-paper-100">
          {NOTIFICATIONS.map(n => {
            const Icon = ICONS[n.type]
            return (
              <div key={n.id}
                className={`flex items-start gap-3 px-4 py-3.5 hover:bg-paper-50 transition-colors cursor-pointer
                  ${!n.read ? 'bg-paper-50' : 'bg-white'}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${COLORS[n.type]}`}>
                  <Icon size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-sm font-semibold ${!n.read ? 'text-paper-900' : 'text-paper-700'}`}>{n.title}</span>
                    {!n.read && <div className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0 mt-1.5" />}
                  </div>
                  <div className="text-paper-500 text-xs mt-0.5 leading-relaxed">{n.body}</div>
                  <div className="text-paper-400 text-xs mt-1">{n.time}</div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="px-4 py-3 border-t border-paper-200 text-center">
          <button className="text-paper-600 text-sm hover:text-paper-900 transition-colors">查看全部通知</button>
        </div>
      </div>
    </div>
  )
}
