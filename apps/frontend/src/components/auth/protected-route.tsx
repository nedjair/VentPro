'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import ClientOnly from '@/components/common/client-only'
import { authStore, useAuthStore } from '@/stores/auth'
import dynamic from 'next/dynamic'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: string
  requiredPermission?: string
  fallback?: React.ReactNode
}

// Étapes d'hydratation
enum HydrationStep {
  SERVER_SIDE = 'SERVER_SIDE',
  CLIENT_MOUNTED = 'CLIENT_MOUNTED',
  AUTH_CHECKED = 'AUTH_CHECKED',
  READY = 'READY'
}

// Composant interne qui gère la logique d'authentification
function ProtectedRouteInner({
  children,
  requiredRole,
  requiredPermission,
  fallback
}: ProtectedRouteProps) {
  const router = useRouter()
  const pathname = usePathname() || '/'

  // États d'hydratation en 3 étapes
  const [hydrationStep, setHydrationStep] = useState<HydrationStep>(HydrationStep.SERVER_SIDE)
  const [authCheckComplete, setAuthCheckComplete] = useState(false)

  // Store d'authentification
  const { isAuthenticated, isLoading, user } = useAuthStore()

  // ÉTAPE 1: Détection du montage côté client
  useEffect(() => {
    setHydrationStep(HydrationStep.CLIENT_MOUNTED)
  }, [])

  // ÉTAPE 2: Vérification d'authentification après montage
  useEffect(() => {
    if (hydrationStep === HydrationStep.CLIENT_MOUNTED && !authCheckComplete) {

      // Vérifier les données stockées
      const hasStoredUser = localStorage.getItem('auth-user')
      const hasStoredTokens = localStorage.getItem('auth-tokens')

      if (hasStoredUser && hasStoredTokens && !isAuthenticated) {
        authStore.checkAuth().finally(() => {
          setAuthCheckComplete(true)
          setHydrationStep(HydrationStep.AUTH_CHECKED)
        })
      } else {
        setAuthCheckComplete(true)
        setHydrationStep(HydrationStep.AUTH_CHECKED)
      }
    }
  }, [hydrationStep, authCheckComplete, isAuthenticated])

  // ÉTAPE 3: Finalisation après vérification d'authentification
  useEffect(() => {
    if (hydrationStep === HydrationStep.AUTH_CHECKED && authCheckComplete && !isLoading) {

      if (!isAuthenticated) {
        const hasStoredAuth = localStorage.getItem('auth-user') && localStorage.getItem('auth-tokens')
        if (!hasStoredAuth) {
          router.push(`/login?redirect=${encodeURIComponent(pathname || '/')}`)
          return
        }
      }

      setHydrationStep(HydrationStep.READY)
    }
  }, [hydrationStep, authCheckComplete, isLoading, isAuthenticated, router, pathname])

  // Rendu conditionnel basé sur l'étape d'hydratation
  if (hydrationStep === HydrationStep.SERVER_SIDE) {
    return fallback || (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initialisation...</p>
        </div>
      </div>
    )
  }

  if (hydrationStep === HydrationStep.CLIENT_MOUNTED || !authCheckComplete || isLoading) {
    return fallback || (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Vérification de l'authentification...</p>
        </div>
      </div>
    )
  }

  if (hydrationStep === HydrationStep.AUTH_CHECKED && !isAuthenticated) {
    return null
  }

  if (hydrationStep === HydrationStep.READY && isAuthenticated) {
    return <>{children}</>
  }
  return fallback || (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Chargement...</p>
      </div>
    </div>
  )
}

// Fallback de compatibilité pour les usages directs.
export default ProtectedRoute

// Composant dynamique qui force le rendu côté client uniquement
const DynamicProtectedRouteInner = dynamic(
  () => Promise.resolve(ProtectedRouteInner),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement dynamique...</p>
        </div>
      </div>
    )
  }
)

// Composant principal qui utilise dynamic import pour forcer le rendu côté client
export function ProtectedRoute(props: ProtectedRouteProps) {

  return <DynamicProtectedRouteInner {...props} />
}

