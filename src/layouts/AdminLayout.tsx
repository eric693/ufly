import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, ClipboardList, Users, Navigation,
  Settings, ChevronLeft, ChevronRight, Menu, X,
  Bell, Search, LogOut, BarChart2, Map,
} from 'lucide-react'
import Logo from '../components/Logo'
import NotificationPanel from '../components/NotificationPanel'

const NAV_ITEMS = [
  { to: '/admin',           icon: LayoutDashboard, label: '儀表板' },
  { to: '/admin/orders',    icon: ClipboardList,   label: '訂單管理' },
  { to: '/admin/drivers',   icon: Navigation,      label: '夥伴管理' },
  { to: '/admin/map',       icon: Map,             label: '即時地圖' },
  { to: '/admin/analytics', icon: BarChart2,       label: '數據分析' },
  { to: '/admin/customers', icon: Users,           label: '客戶管理' },
  { to: '/admin/settings',  icon: Settings,        label: '系統設定' },
]

export default function AdminLayout() {
  const { pathname } = useLocation()
  const [collapsed, setCollapsed]   = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifOpen, setNotifOpen]   = useState(false)

  return (
    <div className="min-h-screen bg-[#0d0d0f] flex">
      <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />

      {/* Sidebar — desktop */}
      <aside className={`hidden md:flex flex-col flex-shrink-0 admin-sidebar border-r border-surface-700
                         transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}>
        <div className={`flex items-center h-16 border-b border-surface-700 px-4
                         ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && <Logo size="sm" />}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-surface-300 hover:text-white hover:bg-surface-700 transition-colors">
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-1 overflow-hidden">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
            const active = pathname === to
            return (
              <Link key={to} to={to} title={collapsed ? label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150
                  ${active ? 'bg-white/10 text-white' : 'text-surface-300 hover:text-white hover:bg-surface-700'}`}>
                <Icon size={18} className="flex-shrink-0" />
                {!collapsed && <span className="text-sm font-medium">{label}</span>}
              </Link>
            )
          })}
        </nav>

        <div className={`border-t border-surface-700 p-3 ${collapsed ? 'flex justify-center' : ''}`}>
          <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl
                                   text-surface-400 hover:text-white hover:bg-surface-700 transition-colors text-sm">
            <LogOut size={18} className="flex-shrink-0" />
            {!collapsed && <span>返回前台</span>}
          </Link>
        </div>
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/70" />
          <aside className="absolute left-0 top-0 bottom-0 w-64 admin-sidebar border-r border-surface-700 flex flex-col">
            <div className="flex items-center justify-between h-16 px-4 border-b border-surface-700">
              <Logo size="sm" />
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg text-surface-300">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
                const active = pathname === to
                return (
                  <Link key={to} to={to} onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm
                      ${active ? 'bg-white/10 text-white' : 'text-surface-300 hover:text-white hover:bg-surface-700'}`}>
                    <Icon size={18} /> {label}
                  </Link>
                )
              })}
            </nav>
            <div className="border-t border-surface-700 p-3">
              <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-surface-400 hover:text-white text-sm">
                <LogOut size={18} /> 返回前台
              </Link>
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-surface-700 bg-[#0d0d0f] flex-shrink-0">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 rounded-xl text-surface-300 hover:bg-surface-700"
              onClick={() => setMobileOpen(true)}>
              <Menu size={20} />
            </button>
            <div className="hidden md:flex items-center gap-2 bg-surface-800 border border-surface-700
                            rounded-xl px-3 py-2 w-64">
              <Search size={16} className="text-surface-400" />
              <input className="bg-transparent text-sm placeholder-surface-400 text-white outline-none w-full"
                     placeholder="搜尋訂單、夥伴..." />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setNotifOpen(true)}
              className="p-2 rounded-xl text-surface-300 hover:text-white hover:bg-surface-700 relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-white rounded-full" />
            </button>
            <div className="flex items-center gap-2 pl-2 border-l border-surface-700">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <span className="text-white text-xs font-bold">管</span>
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-medium">管理員</div>
                <div className="text-surface-400 text-xs">admin@ufly.tw</div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
