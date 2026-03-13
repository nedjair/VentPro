'use client'

import { ReactNode } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { ProtectedRouteSimple as ProtectedRoute } from '@/components/auth/protected-route-simple'

interface MainLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function MainLayout({ children, title, subtitle, actions }: MainLayoutProps) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background transition-colors duration-300">
        <div className="flex h-screen bg-background">
          {/* Sidebar */}
          <Sidebar />

          {/* Contenu principal */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
            {/* Header */}
            <Header
              title={title}
              subtitle={subtitle}
              actions={actions}
            />

            {/* Contenu */}
            <main className="premium-scrollbar flex-1 overflow-y-auto bg-background">
              <div className="px-6 py-6 xl:px-8 xl:py-7">
                {children}
              </div>
            </main>
          </div>
        </div>

        {/* NOTIFICATIONS POPUP COMPLÈTEMENT DÉSACTIVÉES */}
        {/* Moniteur de synchronisation et notifications popup supprimés pour une interface épurée */}
      </div>
    </ProtectedRoute>
  )
}
