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

// Hook simple pour vérifier l'authentification
function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated
}

export function ProtectedRoute({
  children,
  requiredRole,
  requiredPermission,
  fallback
}: ProtectedRouteProps) {
  console.log('🔍 ProtectedRoute: DÉBUT - Vérification de l\'authentification...')

  const router = useRouter()
  const pathname = usePathname()
  const [isClient, setIsClient] = useState(false)
  const [hasWaited, setHasWaited] = useState(false)

  // Utiliser le store Zustand pour l'authentification
  const { isAuthenticated, isLoading, user, isHydrated } = useAuthStore()

  console.log('📊 ProtectedRoute État DÉTAILLÉ:', {
    isAuthenticated,
    isLoading,
    user: user?.email,
    isClient,
    isHydrated,
    hasWaited,
    pathname,
    timestamp: new Date().toISOString(),
    localStorage_user: typeof window !== 'undefined' ? !!localStorage.getItem('auth-user') : 'N/A',
    localStorage_tokens: typeof window !== 'undefined' ? !!localStorage.getItem('auth-tokens') : 'N/A',
    cookie_token: typeof window !== 'undefined' ? document.cookie.includes('auth-token=') : 'N/A'
  })

  // Détecter l'hydratation côté client
  useEffect(() => {
    console.log('🔄 ProtectedRoute: Hydratation côté client')
    setIsClient(true)
  }, [])

  // Attendre un délai pour permettre à l'authentification de se charger
  useEffect(() => {
    if (isClient) {
      const timer = setTimeout(() => {
        console.log('⏰ ProtectedRoute: Délai d\'attente écoulé')
        setHasWaited(true)
      }, 1000) // Attendre 1 seconde

      return () => clearTimeout(timer)
    }
  }, [isClient])

  // Vérifier l'authentification côté client SEULEMENT après hydratation ET délai
  useEffect(() => {
    if (isClient && hasWaited && isHydrated && !isLoading) {
      console.log('🔄 ProtectedRoute useEffect DÉCLENCHÉ:', {
        isAuthenticated,
        isLoading,
        isHydrated,
        hasWaited,
        localStorage_user: !!localStorage.getItem('auth-user'),
        localStorage_tokens: !!localStorage.getItem('auth-tokens')
      })

      if (!isAuthenticated) {
        console.log('❌ ProtectedRoute: Non authentifié après vérification complète, redirection vers /login')
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`)
      } else {
        console.log('✅ ProtectedRoute: Authentifié dans useEffect')
      }
    }
  }, [isClient, hasWaited, isHydrated, isAuthenticated, isLoading, router, pathname])

  // Afficher un loader pendant la vérification (attendre hydratation ET délai)
  if (!isClient || isLoading || !isHydrated || !hasWaited) {
    console.log('⏳ ProtectedRoute: CHARGEMENT - Affichage du loader...', {
      isClient,
      isLoading,
      isHydrated,
      hasWaited
    })
    return fallback || (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" suppressHydrationWarning>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Vérification de l'authentification...</p>
        </div>
      </div>
    )
  }

  // Si pas authentifié, ne rien afficher (redirection en cours)
  if (!isAuthenticated) {
    console.log('🚫 ProtectedRoute: NON AUTHENTIFIÉ - Redirection en cours...')
    return null
  }

  console.log('✅ ProtectedRoute: AUTHENTIFIÉ - Affichage du contenu enfant')
  return <>{children}</>
}

// Hook pour vérifier les permissions
export function useRequireAuth(requiredRole?: string, requiredPermission?: string) {
  const router = useRouter()
  const pathname = usePathname()
  const isAuthenticated = useIsAuthenticated()
  const [isClient, setIsClient] = useState(false)

  // Détecter l'hydratation côté client
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isClient && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`)
    }
  }, [isAuthenticated, router, pathname, isClient])

  return isClient && isAuthenticated
}
