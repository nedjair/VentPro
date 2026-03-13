'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/stores/auth'

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
  const pathname = usePathname()
  
  const [isClient, setIsClient] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  
  // Store d'authentification
  const { isAuthenticated, isLoading, user, checkAuth } = useAuthStore()

  console.log('🔄 ProtectedRouteTimeout: Rendu', {
    isClient,
    authChecked,
    isAuthenticated,
    isLoading,
    user: user?.email,
    pathname,
    timestamp: new Date().toISOString()
  })

  // Utiliser setTimeout au lieu de useEffect pour forcer l'exécution côté client
  if (typeof window !== 'undefined' && !isClient) {
    console.log('🚀 ProtectedRouteTimeout: Détection côté client avec setTimeout')
    setTimeout(() => {
      console.log('⏰ ProtectedRouteTimeout: setTimeout exécuté')
      setIsClient(true)
      
      // Forcer la vérification d'authentification
      setTimeout(() => {
        console.log('🔍 ProtectedRouteTimeout: Vérification d\'authentification')
        checkAuth()
        setAuthChecked(true)
      }, 100)
    }, 0)
  }

  // Si nous ne sommes pas côté client, afficher le loader
  if (!isClient) {
    console.log('⏳ ProtectedRouteTimeout: Pas encore côté client')
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
    console.log('⏳ ProtectedRouteTimeout: Vérification d\'authentification en cours')
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
    console.log('🚫 ProtectedRouteTimeout: Non authentifié - Redirection vers /login')
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
    console.log('🚫 ProtectedRouteTimeout: Rôle insuffisant', { required: requiredRole, actual: user?.role })
    router.push('/unauthorized')
    return fallback || (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Accès non autorisé</p>
        </div>
      </div>
    )
  }

  // Tout est OK, afficher le contenu
  console.log('✅ ProtectedRouteTimeout: Authentification réussie - Affichage du contenu')
  return <>{children}</>
}
