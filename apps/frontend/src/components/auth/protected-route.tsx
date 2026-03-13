'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/stores/auth'
import { ClientOnly } from '@/components/common/client-only'
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
  const pathname = usePathname()

  // États d'hydratation en 3 étapes
  const [hydrationStep, setHydrationStep] = useState<HydrationStep>(HydrationStep.SERVER_SIDE)
  const [authCheckComplete, setAuthCheckComplete] = useState(false)

  // Store d'authentification
  const { isAuthenticated, isLoading, user, checkAuth } = useAuthStore()

  console.log('🔄 ProtectedRouteInner - Étape:', hydrationStep, {
    isAuthenticated,
    isLoading,
    user: user?.email,
    authCheckComplete,
    pathname,
    timestamp: new Date().toISOString()
  })

  // ÉTAPE 1: Détection du montage côté client
  useEffect(() => {
    console.log('🚀 ÉTAPE 1: Montage côté client détecté')
    setHydrationStep(HydrationStep.CLIENT_MOUNTED)
  }, [])

  // ÉTAPE 2: Vérification d'authentification après montage
  useEffect(() => {
    if (hydrationStep === HydrationStep.CLIENT_MOUNTED && !authCheckComplete) {
      console.log('🔍 ÉTAPE 2: Vérification d\'authentification...')

      // Vérifier les données stockées
      const hasStoredUser = localStorage.getItem('auth-user')
      const hasStoredTokens = localStorage.getItem('auth-tokens')

      console.log('📦 Données stockées:', {
        hasStoredUser: !!hasStoredUser,
        hasStoredTokens: !!hasStoredTokens,
        cookieToken: document.cookie.includes('auth-token=')
      })

      if (hasStoredUser && hasStoredTokens && !isAuthenticated) {
        console.log('🔄 Restauration de l\'authentification depuis le stockage...')
        checkAuth().finally(() => {
          setAuthCheckComplete(true)
          setHydrationStep(HydrationStep.AUTH_CHECKED)
        })
      } else {
        setAuthCheckComplete(true)
        setHydrationStep(HydrationStep.AUTH_CHECKED)
      }
    }
  }, [hydrationStep, authCheckComplete, isAuthenticated, checkAuth])

  // ÉTAPE 3: Finalisation après vérification d'authentification
  useEffect(() => {
    if (hydrationStep === HydrationStep.AUTH_CHECKED && authCheckComplete && !isLoading) {
      console.log('✅ ÉTAPE 3: Finalisation de l\'hydratation')

      if (!isAuthenticated) {
        const hasStoredAuth = localStorage.getItem('auth-user') && localStorage.getItem('auth-tokens')
        if (!hasStoredAuth) {
          console.log('❌ Non authentifié - Redirection vers /login')
          router.push(`/login?redirect=${encodeURIComponent(pathname)}`)
          return
        }
      }

      setHydrationStep(HydrationStep.READY)
    }
  }, [hydrationStep, authCheckComplete, isLoading, isAuthenticated, router, pathname])

  // Rendu conditionnel basé sur l'étape d'hydratation
  if (hydrationStep === HydrationStep.SERVER_SIDE) {
    console.log('⏳ RENDU: Hydratation côté serveur')
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
    console.log('⏳ RENDU: Vérification d\'authentification en cours')
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
    console.log('🚫 RENDU: Non authentifié - Redirection en cours')
    return null
  }

  if (hydrationStep === HydrationStep.READY && isAuthenticated) {
    console.log('✅ RENDU: Authentifié - Affichage du contenu')
    return <>{children}</>
  }

  // Fallback de sécurité
  console.log('⚠️ RENDU: État inattendu - Affichage du loader')
  return fallback || (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Chargement...</p>
      </div>
    </div>
  )
}

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
  console.log('🔄 ProtectedRoute: Début du rendu principal avec Dynamic Import')

  return <DynamicProtectedRouteInner {...props} />
}


