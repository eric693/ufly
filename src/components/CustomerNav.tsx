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
    { to: '/history',  label: '活動' },
  ]

  return (
    <>
      <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />

      <header className="hidden md:flex fixed top-0 left-0 right-0 z-50 items-center justify-between
                         px-8 h-16 bg-white border-b border-paper-200 shadow-sm">
        <Link to="/"><Logo /></Link>
        <nav className="flex items-center gap-1">
          {links.map(l => (
            <Link key={l.to} to={l.to}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors
                ${pathname === l.to ? 'bg-paper-900 text-white' : 'text-paper-700 hover:bg-paper-100 hover:text-paper-900'}`}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <button onClick={() => setNotifOpen(true)}
            className="p-2 rounded-xl text-paper-600 hover:bg-paper-100 transition-colors relative">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          <Link to="/profile"
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-paper-100 hover:bg-paper-200 transition-colors text-sm font-medium">
            <div className="w-6 h-6 rounded-full bg-paper-900 flex items-center justify-center">
              <User size={13} className="text-white" />
            </div>
            我的帳戶
          </Link>
          <Link to="/admin" className="btn-primary py-2 text-sm">後台 <ChevronRight size={14} /></Link>
        </div>
      </header>

      <header className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between
                         px-4 h-14 bg-white border-b border-paper-200 shadow-sm">
        <Link to="/"><Logo size="sm" /></Link>
        <div className="flex items-center gap-1">
          <button onClick={() => setNotifOpen(true)} className="p-2 rounded-xl text-paper-600 relative">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
          </button>
          <button onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-xl text-paper-600 hover:bg-paper-100">
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 pt-14" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <nav className="absolute top-0 right-0 w-64 h-full bg-white border-l border-paper-200
                          shadow-card-xl pt-6 pb-8 px-4 flex flex-col gap-1 animate-slide-up">
            {links.map(l => (
              <Link key={l.to} to={l.to} onClick={() => setMobileOpen(false)}
                className={`px-4 py-3 rounded-2xl text-sm font-medium transition-colors
                  ${pathname === l.to ? 'bg-paper-900 text-white' : 'text-paper-700 hover:bg-paper-100'}`}>
                {l.label}
              </Link>
            ))}
            <Link to="/profile" onClick={() => setMobileOpen(false)}
              className="px-4 py-3 rounded-2xl text-sm font-medium text-paper-700 hover:bg-paper-100">帳戶</Link>
            <div className="mt-4 pt-4 border-t border-paper-200">
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
