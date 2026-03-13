'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/stores/auth'

interface ProtectedRouteSimpleProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Composant de protection de route simplifié qui évite les problèmes d'hydratation
 * en utilisant une approche plus directe et cohérente
 */
export function ProtectedRouteSimple({
  children,
  fallback
}: ProtectedRouteSimpleProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, isHydrated, isLoading } = useAuth()

  // Réutiliser le même état d'auth que le login et le sidebar.
  useEffect(() => {
    if (isHydrated && !isLoading && !isAuthenticated) {
      const redirect = pathname ? `?redirect=${encodeURIComponent(pathname)}` : ''
      router.replace(`/login${redirect}`)
    }
  }, [isAuthenticated, isHydrated, isLoading, pathname, router])

  if (!isHydrated || isLoading) {
    return fallback || (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return fallback || (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirection...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
