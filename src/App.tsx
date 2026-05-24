import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import CustomerLayout from './layouts/CustomerLayout'
import AdminLayout from './layouts/AdminLayout'

import Home from './pages/Home'
import CreateOrder from './pages/CreateOrder'
import OrderTracking from './pages/OrderTracking'
import OrderHistory from './pages/OrderHistory'
import Profile from './pages/Profile'
import Login from './pages/Login'
import AuthCallback from './pages/AuthCallback'

import DriverQueue from './pages/driver/DriverQueue'
import DriverOrderDetail from './pages/driver/DriverOrderDetail'
import { AdminRoute, DriverRoute } from './components/ProtectedRoute'

import Dashboard from './pages/admin/Dashboard'
import AdminOrders from './pages/admin/Orders'
import AdminDrivers from './pages/admin/Drivers'
import AdminCustomers from './pages/admin/Customers'
import AdminSettings from './pages/admin/Settings'
import Analytics from './pages/admin/Analytics'
import LiveMap from './pages/admin/LiveMap'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login"          element={<Login />} />
        <Route path="/auth/callback"  element={<AuthCallback />} />

        <Route element={<CustomerLayout />}>
          <Route path="/"         element={<Home />} />
          <Route path="/order"    element={<CreateOrder />} />
          <Route path="/tracking" element={<OrderTracking />} />
          <Route path="/history"  element={<OrderHistory />} />
          <Route path="/profile"  element={<Profile />} />
        </Route>

        <Route element={<DriverRoute />}>
          <Route path="/driver"            element={<DriverQueue />} />
          <Route path="/driver/order/:id"  element={<DriverOrderDetail />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index            element={<Dashboard />} />
            <Route path="orders"    element={<AdminOrders />} />
            <Route path="drivers"   element={<AdminDrivers />} />
            <Route path="map"       element={<LiveMap />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="settings"  element={<AdminSettings />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  )
}
