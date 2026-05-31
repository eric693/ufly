import { useEffect, useRef } from 'react'

/**
 * Hold a screen Wake Lock while `active` is true so the phone doesn't sleep —
 * keeps the driver's GPS (watchPosition) flowing while the app is open.
 * Re-acquires automatically when the tab becomes visible again.
 *
 * Note: this only mitigates *foreground* sleeping. True background GPS (app
 * minimised / screen off) requires a native wrapper (Capacitor + background
 * geolocation) — the web platform cannot do it.
 */
export function useWakeLock(active: boolean) {
  const lockRef = useRef<any>(null)

  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return

    let cancelled = false
    const acquire = async () => {
      try {
        const lock = await (navigator as any).wakeLock.request('screen')
        if (cancelled) { try { await lock.release() } catch {} return }
        lockRef.current = lock
      } catch { /* denied or unsupported — ignore */ }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && active && !lockRef.current) acquire()
    }

    acquire()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      try { lockRef.current?.release?.() } catch {}
      lockRef.current = null
    }
  }, [active])
}
