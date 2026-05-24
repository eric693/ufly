import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, Bell, User, ChevronRight } from 'lucide-react'
import Logo from './Logo'
import NotificationPanel from './NotificationPanel'

export default function CustomerNav() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifOpen, setNotifOpen]   = useState(false)
  const { pathname } = useLocation()

  const links = [
    { to: '/',         label: '首頁' },
    { to: '/order',    label: '立即下單' },
    { to: '/tracking', label: '追蹤訂單' },
    { to: '/history',  label: '歷史紀錄' },
  ]

  return (
    <>
      <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />

      {/* Desktop nav */}
      <header className="hidden md:flex fixed top-0 left-0 right-0 z-50 items-center justify-between
                         px-8 h-16 bg-surface-900/90 backdrop-blur-md border-b border-surface-700">
        <Link to="/" className="flex-shrink-0"><Logo /></Link>

        <nav className="flex items-center gap-1">
          {links.map(l => (
            <Link key={l.to} to={l.to}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors
                ${pathname === l.to
                  ? 'bg-surface-700 text-white'
                  : 'text-surface-200 hover:text-white hover:bg-surface-800'}`}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setNotifOpen(true)}
            className="p-2 rounded-xl text-surface-200 hover:text-white hover:bg-surface-700 transition-colors relative">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-white rounded-full" />
          </button>
          <Link to="/profile"
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-700
                       hover:bg-surface-600 transition-colors text-sm font-medium">
            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
              <User size={14} className="text-black" />
            </div>
            我的帳戶
          </Link>
          <Link to="/admin" className="btn-primary py-2 text-sm">
            後台管理 <ChevronRight size={14} />
          </Link>
        </div>
      </header>

      {/* Mobile nav */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between
                         px-4 h-14 bg-surface-900/95 backdrop-blur-md border-b border-surface-700">
        <Link to="/"><Logo size="sm" /></Link>
        <div className="flex items-center gap-1">
          <button onClick={() => setNotifOpen(true)} className="p-2 rounded-xl text-surface-200 relative">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-white rounded-full" />
          </button>
          <button onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-xl text-surface-200 hover:bg-surface-700 transition-colors">
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 pt-14" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <nav className="absolute top-0 right-0 w-64 h-full bg-surface-800 border-l border-surface-700
                          pt-6 pb-8 px-4 flex flex-col gap-1 animate-slide-up">
            {links.map(l => (
              <Link key={l.to} to={l.to} onClick={() => setMobileOpen(false)}
                className={`px-4 py-3 rounded-2xl text-sm font-medium transition-colors
                  ${pathname === l.to
                    ? 'bg-white/8 text-white'
                    : 'text-surface-200 hover:text-white hover:bg-surface-700'}`}>
                {l.label}
              </Link>
            ))}
            <Link to="/profile" onClick={() => setMobileOpen(false)}
              className="px-4 py-3 rounded-2xl text-sm font-medium text-surface-200 hover:text-white hover:bg-surface-700">
              個人資料
            </Link>
            <div className="mt-4 pt-4 border-t border-surface-700">
              <Link to="/admin" onClick={() => setMobileOpen(false)} className="btn-primary w-full text-sm">
                後台管理 <ChevronRight size={14} />
              </Link>
            </div>
          </nav>
        </div>
      )}
    </>
  )
}
