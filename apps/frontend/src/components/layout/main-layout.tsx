'use client'

import { ReactNode, useState, useEffect } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { StockSyncMonitor } from '@/components/stock/StockSyncMonitor'
import { DiscreteStockNotifications } from '@/components/notifications/DiscreteStockNotifications'
import UserPreferencesService from '@/services/userPreferences'

interface MainLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
  actions?: ReactNode
  showStockMonitor?: boolean
}

export function MainLayout({ children, title, subtitle, actions, showStockMonitor = true }: MainLayoutProps) {
  console.log('🏗️ MainLayout: RENDU - title:', title)

  const [showNotifications, setShowNotifications] = useState(false)

  useEffect(() => {
    // Vérifier les préférences utilisateur au montage
    setShowNotifications(UserPreferencesService.areStockPopupsEnabled())

    // Écouter les changements de préférences
    const handlePreferencesChange = (event: any) => {
      setShowNotifications(event.detail.stockNotifications.popupsEnabled)
    }

    window.addEventListener('userPreferencesChanged', handlePreferencesChange)
    return () => window.removeEventListener('userPreferencesChanged', handlePreferencesChange)
  }, [])

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="flex h-screen">
          {/* Sidebar */}
          <Sidebar />

          {/* Contenu principal */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <Header
              title={title}
              subtitle={subtitle}
              actions={actions}
            />

            {/* Contenu */}
            <main className="flex-1 overflow-y-auto">
              <div className="px-6 py-6">
                {children}
              </div>
            </main>
          </div>
        </div>

        {/* Moniteur de synchronisation des stocks */}
        {showStockMonitor && <StockSyncMonitor />}

        {/* Notifications popup - Affichées seulement si activées par l'utilisateur */}
        {showNotifications && <DiscreteStockNotifications />}
      </div>
    </ProtectedRoute>
  )
}
