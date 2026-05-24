import { Link, useLocation } from 'react-router-dom'
import { Home, PlusCircle, MapPin, Clock, User } from 'lucide-react'
import { useI18n } from '../contexts/I18nContext'

export default function MobileBottomNav() {
  const { pathname } = useLocation()
  const { t } = useI18n()

  const tabs = [
    { to: '/',         icon: Home,       label: t.nav.home },
    { to: '/order',    icon: PlusCircle, label: t.nav.order },
    { to: '/tracking', icon: MapPin,     label: t.nav.tracking },
    { to: '/history',  icon: Clock,      label: t.nav.history },
    { to: '/profile',  icon: User,       label: t.nav.profile },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50
                    bg-white border-t border-paper-200 shadow-card-xl
                    flex items-center justify-around px-2 pb-safe-area-inset-bottom">
      {tabs.map(({ to, icon: Icon, label }) => {
        const active = pathname === to
        return (
          <Link key={to} to={to}
            className={`flex flex-col items-center gap-0.5 py-3 px-3 rounded-2xl
                        transition-colors min-w-0 flex-1 relative
                        ${active ? 'text-paper-900' : 'text-paper-500 hover:text-paper-900'}`}>
            <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
            <span className={`text-[10px] font-medium ${active ? 'font-bold' : ''}`}>{label}</span>
            {active && (
              <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-paper-900 rounded-full" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
