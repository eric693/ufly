export function serializeOrder(order: any) {
  if (!order) return null
  const { driver, user, ...o } = order
  return {
    id:               o.id,
    user_id:          o.userId,
    driver_id:        o.driverId,
    enterprise_id:    o.enterpriseId,
    service_type:     o.serviceType,
    status:           o.status,
    pickup_address:   o.pickupAddress,
    pickup_phone:     o.pickupPhone,
    delivery_address: o.deliveryAddress,
    delivery_phone:   o.deliveryPhone,
    item_content:     o.itemContent,
    item_note:        o.itemNote,
    speed_tier:       o.speedTier,
    base_fee:         o.baseFee,
    surcharge:        o.surcharge,
    discount:         o.discount,
    total_fee:        o.totalFee,
    advance_amount:   o.advanceAmount ?? 0,
    distance:         o.distance,
    pickup_lat:       o.pickupLat   ?? null,
    pickup_lng:       o.pickupLng   ?? null,
    delivery_lat:     o.deliveryLat ?? null,
    delivery_lng:     o.deliveryLng ?? null,
    duration:         o.duration,
    scheduled_at:     o.scheduledAt,
    rated:            o.rated ? 1 : 0,
    recurring_id:     o.recurringId,
    created_at:       o.createdAt,
    updated_at:       o.updatedAt,
    photo_url:        o.photoUrl     ?? null,
    driver_name:      driver?.name   ?? null,
    driver_phone:     driver?.phone  ?? null,
    driver_rating:    driver?.rating ?? null,
    driver_lat:       driver?.lat    ?? null,
    driver_lng:       driver?.lng    ?? null,
    customer_name:    user?.name     ?? null,
  }
}

export function serializeDriver(d: any) {
  return {
    id:           d.id,
    name:         d.name,
    email:        d.email,
    phone:        d.phone,
    area:         d.area,
    status:       d.status,
    rating:       d.rating,
    total_trips:  d.totalTrips,
    lat:          d.lat,
    lng:          d.lng,
    created_at:   d.createdAt,
  }
}

export function serializeUser(u: any) {
  return {
    id:            u.id,
    name:          u.name,
    email:         u.email,
    phone:         u.phone,
    avatar:        u.avatar,
    role:          u.role,
    rating:        u.rating,
    total_orders:  u.totalOrders,
    referral_code: u.referralCode,
    enterprise_id:      u.enterpriseId,
    subscription_tier:  u.subscriptionTier ?? 'free',
    created_at:         u.createdAt,
  }
}

export function serializeAddress(a: any) {
  return {
    id:         a.id,
    user_id:    a.userId,
    label:      a.label,
    address:    a.address,
    type:       a.type,
    created_at: a.createdAt,
  }
}

export function serializeNotification(n: any) {
  return {
    id:         n.id,
    user_id:    n.userId,
    type:       n.type,
    title:      n.title,
    body:       n.body,
    read:       n.read ? 1 : 0,
    created_at: n.createdAt,
  }
}

export function serializeRecurring(r: any) {
  return {
    id:               r.id,
    user_id:          r.userId,
    service_type:     r.serviceType,
    pickup_address:   r.pickupAddress,
    delivery_address: r.deliveryAddress,
    item_content:     r.itemContent,
    speed_tier:       r.speedTier,
    schedule:         r.schedule,
    active:           r.active ? 1 : 0,
    next_run:         r.nextRun,
    created_at:       r.createdAt,
  }
}
