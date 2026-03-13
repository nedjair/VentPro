export type AppHeaderNotificationSource = string

export interface AppHeaderNotification {
  id: string
  source: AppHeaderNotificationSource
  title: string
  message: string
  createdAt: string
  href?: string
}

const STORAGE_KEY = 'ventespro:header-notifications'
const EVENT_NAME = 'ventespro:header-notifications-changed'
const LEGACY_STOCK_NOTIFICATION_SOURCE = 'stock-low'
const STOCK_NOTIFICATION_SOURCE = 'stock-status'
const STOCK_NOTIFICATION_TITLES = new Set(['Alerte stock faible', 'Rupture de stock'])

function isBrowser() {
  return typeof window !== 'undefined'
}

function dispatchNotifications(notifications: AppHeaderNotification[]) {
  if (!isBrowser()) {
    return
  }

  window.dispatchEvent(new CustomEvent<AppHeaderNotification[]>(EVENT_NAME, { detail: notifications }))
}

function writeHeaderNotifications(notifications: AppHeaderNotification[], dispatchEvent = true) {
  if (!isBrowser()) {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications))

  if (dispatchEvent) {
    dispatchNotifications(notifications)
  }
}

function isHeaderNotification(notification: unknown): notification is AppHeaderNotification {
  if (!notification || typeof notification !== 'object') {
    return false
  }

  const candidate = notification as Record<string, unknown>

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.source === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.message === 'string' &&
    typeof candidate.createdAt === 'string' &&
    (candidate.href === undefined || typeof candidate.href === 'string')
  )
}

function isStockNotificationSource(source: string) {
  return source === STOCK_NOTIFICATION_SOURCE || source === LEGACY_STOCK_NOTIFICATION_SOURCE
}

function isValidStockNotification(notification: AppHeaderNotification) {
  if (notification.source !== STOCK_NOTIFICATION_SOURCE) {
    return false
  }

  return STOCK_NOTIFICATION_TITLES.has(notification.title)
}

function sanitizeHeaderNotifications(notifications: unknown): AppHeaderNotification[] {
  if (!Array.isArray(notifications)) {
    return []
  }

  return notifications.filter(isHeaderNotification).filter((notification) => {
    if (!isStockNotificationSource(notification.source)) {
      return true
    }

    return isValidStockNotification(notification)
  })
}

export function readHeaderNotifications(): AppHeaderNotification[] {
  if (!isBrowser()) {
    return []
  }

  try {
    const rawNotifications = window.localStorage.getItem(STORAGE_KEY)
    const parsedNotifications = rawNotifications ? JSON.parse(rawNotifications) : []
    const sanitizedNotifications = sanitizeHeaderNotifications(parsedNotifications)

    if (rawNotifications && JSON.stringify(parsedNotifications) !== JSON.stringify(sanitizedNotifications)) {
      writeHeaderNotifications(sanitizedNotifications, false)
    }

    return sanitizedNotifications
  } catch {
    return []
  }
}

export function upsertHeaderNotificationsBySource(
  source: AppHeaderNotificationSource,
  notifications: AppHeaderNotification[]
) {
  if (!isBrowser()) {
    return
  }

  const preservedNotifications = readHeaderNotifications().filter(
    (notification) => notification.source !== source && !(source === STOCK_NOTIFICATION_SOURCE && notification.source === LEGACY_STOCK_NOTIFICATION_SOURCE)
  )

  const nextNotifications = [...preservedNotifications, ...notifications]
  writeHeaderNotifications(nextNotifications)
}

export function syncStockProductHeaderNotification(
  productId: string,
  notification: AppHeaderNotification | null
) {
  if (!isBrowser()) {
    return
  }

  const productNotificationIds = new Set([`stock-status-${productId}`, `stock-low-${productId}`])
  const nextNotifications = readHeaderNotifications().filter((existingNotification) => {
    if (!isStockNotificationSource(existingNotification.source)) {
      return true
    }

    return !productNotificationIds.has(existingNotification.id)
  })

  if (notification) {
    nextNotifications.push(notification)
  }

  writeHeaderNotifications(nextNotifications)
}

export function subscribeHeaderNotifications(
  listener: (notifications: AppHeaderNotification[]) => void
) {
  if (!isBrowser()) {
    return () => {}
  }

  const handleNotificationsChange = (event: Event) => {
    const customEvent = event as CustomEvent<AppHeaderNotification[]>
    listener(customEvent.detail ?? readHeaderNotifications())
  }

  window.addEventListener(EVENT_NAME, handleNotificationsChange as EventListener)

  return () => {
    window.removeEventListener(EVENT_NAME, handleNotificationsChange as EventListener)
  }
}