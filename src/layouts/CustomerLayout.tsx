import { Outlet } from 'react-router-dom'
import CustomerNav from '../components/CustomerNav'
import MobileBottomNav from '../components/MobileBottomNav'

export default function CustomerLayout() {
  return (
    <div className="min-h-screen bg-paper-100">
      <CustomerNav />
      <main className="pt-14 md:pt-16 pb-20 md:pb-0">
        <Outlet />
      </main>
      <MobileBottomNav />
    </div>
  )
}
