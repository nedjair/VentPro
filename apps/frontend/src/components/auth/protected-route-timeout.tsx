'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authStore, useAuthStore } from '@/stores/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: string
  requiredPermission?: string
  fallback?: React.ReactNode
}

export function ProtectedRouteTimeout({
  children,
  requiredRole,
  requiredPermission,
  fallback
}: ProtectedRouteProps) {
  const router = useRouter()
  
  const [isClient, setIsClient] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  
  // Store d'authentification
  const { isAuthenticated, isLoading, user } = useAuthStore()

  useEffect(() => {
    setIsClient(true)

    // La vérification est déclenchée côté client pour éviter les faux positifs SSR.
    authStore.checkAuth()
      .catch(() => {
        // L'état d'erreur est déjà géré dans le store; on évite une seconde cascade.
      })
      .finally(() => {
        setAuthChecked(true)
      })
  }, [])

  // Si nous ne sommes pas côté client, afficher le loader
  if (!isClient) {
    return fallback || (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initialisation côté client...</p>
        </div>
      </div>
    )
  }

  // Si l'authentification n'a pas encore été vérifiée
  if (!authChecked || isLoading) {
    return fallback || (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Vérification de l'authentification...</p>
        </div>
      </div>
    )
  }

  // Si l'utilisateur n'est pas authentifié, rediriger vers la page de connexion
  if (!isAuthenticated) {
    router.push('/login')
    return fallback || (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirection...</p>
        </div>
      </div>
    )
  }

  // Vérification des rôles si requis
  if (requiredRole && user?.role !== requiredRole) {
    router.push('/unauthorized')
    return fallback || (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Accès non autorisé</p>
        </div>
      </div>
    )
  }
  return <>{children}</>
}
