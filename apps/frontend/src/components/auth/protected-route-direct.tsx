'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: string
  requiredPermission?: string
  fallback?: React.ReactNode
}

export function ProtectedRouteDirect({
  children,
  requiredRole,
  requiredPermission,
  fallback
}: ProtectedRouteProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [authState, setAuthState] = useState<{
    isChecked: boolean
    isAuthenticated: boolean
    user: any
    error?: string
    isMounted: boolean
  }>({ isChecked: false, isAuthenticated: false, user: null, isMounted: false })

  // Gérer l'hydratation côté client
  useEffect(() => {
    setAuthState(prev => ({ ...prev, isMounted: true }))
  }, [])

  // Vérification de l'authentification après hydratation
  useEffect(() => {
    if (!authState.isMounted) return

    try {
      // Vérifier localStorage
      const userStr = localStorage.getItem('auth-user')
      const tokensStr = localStorage.getItem('auth-tokens')
      
      if (userStr && tokensStr) {
        try {
          const user = JSON.parse(userStr)
          const tokens = JSON.parse(tokensStr)
          
          // Vérifier si le token n'est pas expiré
          if (tokens.accessToken) {
            // Décoder le JWT pour vérifier l'expiration (simple)
            try {
              const payload = JSON.parse(atob(tokens.accessToken.split('.')[1]))
              const now = Math.floor(Date.now() / 1000)
              
              if (payload.exp && payload.exp > now) {
                setAuthState(prev => ({
                  ...prev,
                  isChecked: true,
                  isAuthenticated: true,
                  user: user
                }))
              } else {
                setAuthState(prev => ({
                  ...prev,
                  isChecked: true,
                  isAuthenticated: false,
                  user: null,
                  error: 'Token expiré'
                }))
              }
            } catch (e) {
              // Si on ne peut pas décoder le token, on considère l'utilisateur comme authentifié
              // car les données sont présentes
              setAuthState(prev => ({
                ...prev,
                isChecked: true,
                isAuthenticated: true,
                user: user
              }))
            }
          } else {
            setAuthState(prev => ({
              ...prev,
              isChecked: true,
              isAuthenticated: false,
              user: null,
              error: 'Pas de token d\'accès'
            }))
          }
        } catch (e) {
          setAuthState(prev => ({
            ...prev,
            isChecked: true,
            isAuthenticated: false,
            user: null,
            error: 'Erreur parsing données'
          }))
        }
      } else {
        setAuthState(prev => ({
          ...prev,
          isChecked: true,
          isAuthenticated: false,
          user: null,
          error: 'Pas de données d\'authentification'
        }))
      }
    } catch (e) {
      setAuthState(prev => ({
        ...prev,
        isChecked: true,
        isAuthenticated: false,
        user: null,
        error: 'Erreur vérification'
      }))
    }
  }, [authState.isMounted, authState.isChecked])

  // Pendant l'hydratation ou la vérification, afficher un loader cohérent
  if (!authState.isMounted || !authState.isChecked) {
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
  if (!authState.isAuthenticated) {

    // Redirection immédiate
    router.push('/login')

    return fallback || (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirection vers la connexion...</p>
        </div>
      </div>
    )
  }

  // Vérification des rôles si requis
  if (requiredRole && authState.user?.role !== requiredRole) {
    
    return fallback || (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Accès non autorisé</p>
          <p className="text-sm text-gray-600 mt-2">
            Rôle requis: {requiredRole}, votre rôle: {authState.user?.role}
          </p>
        </div>
      </div>
    )
  }
  
  return <>{children}</>
}
