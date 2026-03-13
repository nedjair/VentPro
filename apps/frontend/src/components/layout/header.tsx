'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell, Search, ShieldCheck } from 'lucide-react'

import { useAuth } from '@/stores/auth'
import {
  readHeaderNotifications,
  subscribeHeaderNotifications,
  type AppHeaderNotification,
} from '@/lib/header-notifications'

interface HeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

function getInitials(fullName: string) {
  return fullName
    .split(' ')
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2)
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const { user } = useAuth()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppHeaderNotification[]>([])
  const notificationsRef = useRef<HTMLDivElement | null>(null)

  const currentDate = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // On privilégie un libellé stable et lisible pour le bandeau profil.
  const fullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Admin'

  useEffect(() => {
    setNotifications(readHeaderNotifications())

    return subscribeHeaderNotifications((nextNotifications) => {
      setNotifications(nextNotifications)
    })
  }, [])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!notificationsRef.current?.contains(event.target as Node)) {
        setIsNotificationsOpen(false)
      }
    }

    if (isNotificationsOpen) {
      document.addEventListener('mousedown', handlePointerDown)
    }

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [isNotificationsOpen])

  return (
    <header className="border-b border-border/80 bg-[rgba(247,248,252,0.82)] backdrop-blur-xl transition-colors duration-300">
      <div className="px-6 py-5 xl:px-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[rgba(198,168,106,0.22)] bg-[rgba(198,168,106,0.1)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8B6A2D]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Pilotage premium
            </div>
            <h1 className="text-[2rem] font-semibold tracking-tight text-card-foreground">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
            <p className="mt-1 text-sm capitalize text-muted-foreground">{currentDate}</p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex min-w-[240px] items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-[0_12px_26px_rgba(19,33,54,0.05)]">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="Rechercher..."
                  className="w-full bg-transparent text-sm text-card-foreground outline-none placeholder:text-muted-foreground"
                  aria-label="Rechercher"
                />
              </label>

              <div className="relative" ref={notificationsRef}>
                <button
                  type="button"
                  className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground shadow-[0_12px_26px_rgba(19,33,54,0.05)] transition-all hover:text-card-foreground"
                  aria-label="Notifications"
                  aria-expanded={isNotificationsOpen}
                  title="Notifications"
                  onClick={() => setIsNotificationsOpen((current) => !current)}
                >
                  <Bell className="h-4 w-4" />
                  {notifications.length > 0 ? (
                    <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#E15858] ring-2 ring-white" />
                  ) : null}
                </button>

                {isNotificationsOpen ? (
                  <div className="absolute right-0 top-full z-50 mt-3 w-[360px] overflow-hidden rounded-3xl border border-border bg-card shadow-[0_24px_60px_rgba(19,33,54,0.16)]">
                    <div className="flex items-center justify-between border-b border-border px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-card-foreground">Notifications</p>
                        <p className="text-xs text-muted-foreground">{notifications.length} alerte{notifications.length > 1 ? 's' : ''}</p>
                      </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto p-3">
                      {notifications.length === 0 ? (
                        <div className="rounded-2xl bg-secondary px-4 py-6 text-center text-sm text-muted-foreground">
                          Aucune notification disponible.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className="rounded-2xl border border-border bg-secondary/40 px-4 py-3"
                            >
                              <p className="text-sm font-semibold text-card-foreground">{notification.title}</p>
                              <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5 shadow-[0_12px_26px_rgba(19,33,54,0.05)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-[0_12px_24px_rgba(41,83,138,0.22)]">
                  {getInitials(fullName)}
                </div>
                <div className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-card-foreground">{fullName}</span>
                  <span className="block truncate text-xs text-muted-foreground">Gérant PME</span>
                </div>
              </div>
            </div>

            {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
          </div>
        </div>
      </div>
    </header>
  )
}
