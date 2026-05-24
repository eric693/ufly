export type ServiceType =
  | 'document'
  | 'delivery'
  | 'purchase'
  | 'errand'
  | 'business'
  | 'custom'
  | 'key'
  | 'ticket'
  | 'gift'
  | 'designated'

export type SpeedTier = 'standard' | 'express' | 'priority' | 'urgent'

export type OrderStatus =
  | 'pending'
  | 'matching'
  | 'accepted'
  | 'pickup'
  | 'delivering'
  | 'completed'
  | 'cancelled'

export interface SpeedOption {
  id: SpeedTier
  label: string
  description: string
  timeRange: string
  surcharge: number
}

export interface Order {
  id: string
  createdAt: string
  service: ServiceType
  speed: SpeedTier
  status: OrderStatus
  pickup: { address: string; phone: string }
  delivery: { address: string; phone: string }
  item: { content: string; note: string }
  distance: number
  duration: number
  baseFee: number
  totalFee: number
  driver?: { name: string; phone: string; rating: number }
}

export interface Driver {
  id: string
  name: string
  phone: string
  status: 'online' | 'busy' | 'offline'
  rating: number
  completedOrders: number
  joinDate: string
  area: string
}

export interface DashboardStats {
  todayOrders: number
  todayRevenue: number
  activeDrivers: number
  completionRate: number
  pendingOrders: number
  avgDeliveryTime: number
}
