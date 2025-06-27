'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { api } from '@/lib/api'

// Types
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  companyId: string
  company?: {
    id: string
    name: string
    currency: string
  }
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

interface AuthContextType {
  user: User | null
  tokens: AuthTokens | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshAuth: () => Promise<void>
}

// Contexte
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Hook pour utiliser le contexte
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Provider
interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [tokens, setTokens] = useState<AuthTokens | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user && !!tokens

  // Charger les données d'authentification depuis localStorage
  useEffect(() => {
    const loadAuthData = () => {
      try {
        const storedUser = localStorage.getItem('auth-user')
        const storedTokens = localStorage.getItem('auth-tokens')

        if (storedUser && storedTokens) {
          const userData = JSON.parse(storedUser)
          const tokensData = JSON.parse(storedTokens)

          // Vérifier si le token n'est pas expiré
          const now = Date.now()
          const tokenExpiry = tokensData.expiresAt || 0

          if (now < tokenExpiry) {
            setUser(userData)
            setTokens(tokensData)
            api.setAuthToken(tokensData.accessToken)
            console.log('✅ Auth: Données d\'authentification restaurées')
          } else {
            console.log('⚠️ Auth: Token expiré, nettoyage')
            clearAuthData()
          }
        }
      } catch (error) {
        console.error('❌ Auth: Erreur lors du chargement des données:', error)
        clearAuthData()
      } finally {
        setIsLoading(false)
      }
    }

    loadAuthData()
  }, [])

  // Sauvegarder les données d'authentification
  const saveAuthData = (userData: User, tokensData: AuthTokens) => {
    try {
      // Calculer l'expiration du token (en millisecondes)
      const expiresAt = Date.now() + (tokensData.expiresIn * 1000)
      const tokensWithExpiry = { ...tokensData, expiresAt }

      localStorage.setItem('auth-user', JSON.stringify(userData))
      localStorage.setItem('auth-tokens', JSON.stringify(tokensWithExpiry))

      setUser(userData)
      setTokens(tokensWithExpiry)
      api.setAuthToken(tokensData.accessToken)

      console.log('✅ Auth: Données sauvegardées')
    } catch (error) {
      console.error('❌ Auth: Erreur lors de la sauvegarde:', error)
    }
  }

  // Nettoyer les données d'authentification
  const clearAuthData = () => {
    localStorage.removeItem('auth-user')
    localStorage.removeItem('auth-tokens')
    setUser(null)
    setTokens(null)
    api.clearAuthToken()
    console.log('🧹 Auth: Données nettoyées')
  }

  // Connexion
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true)
      console.log('🔐 Auth: Tentative de connexion pour:', email)

      const response = await api.login({ email, password })

      if (response.success && response.data) {
        const { user: userData, tokens: tokensData } = response.data

        if (userData && tokensData) {
          saveAuthData(userData, tokensData)
          console.log('✅ Auth: Connexion réussie')
        } else {
          throw new Error('Données d\'authentification manquantes dans la réponse')
        }
      } else {
        throw new Error(response.message || 'Erreur de connexion')
      }
    } catch (error) {
      console.error('❌ Auth: Erreur de connexion:', error)
      clearAuthData()
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Déconnexion
  const logout = async () => {
    try {
      setIsLoading(true)
      console.log('🚪 Auth: Déconnexion en cours')

      // Appeler l'API de déconnexion si possible
      if (tokens) {
        try {
          await api.logout()
        } catch (error) {
          console.warn('⚠️ Auth: Erreur lors de la déconnexion API (ignorée):', error)
        }
      }

      clearAuthData()
      console.log('✅ Auth: Déconnexion réussie')

      // Rediriger vers la page de connexion
      window.location.href = '/login'
    } catch (error) {
      console.error('❌ Auth: Erreur lors de la déconnexion:', error)
      clearAuthData()
    } finally {
      setIsLoading(false)
    }
  }

  // Rafraîchir l'authentification
  const refreshAuth = async () => {
    try {
      if (!tokens?.refreshToken) {
        throw new Error('Aucun refresh token disponible')
      }

      console.log('🔄 Auth: Rafraîchissement du token')
      const response = await api.refreshToken(tokens.refreshToken)

      if (response.success && response.data) {
        const { user: userData, tokens: tokensData } = response.data
        saveAuthData(userData, tokensData)
        console.log('✅ Auth: Token rafraîchi')
      } else {
        throw new Error('Erreur lors du rafraîchissement')
      }
    } catch (error) {
      console.error('❌ Auth: Erreur de rafraîchissement:', error)
      clearAuthData()
      throw error
    }
  }

  // Auto-refresh du token
  useEffect(() => {
    if (!tokens || !isAuthenticated) return

    const checkTokenExpiry = () => {
      const now = Date.now()
      const expiresAt = tokens.expiresAt || 0
      const timeUntilExpiry = expiresAt - now

      // Rafraîchir le token 5 minutes avant expiration
      if (timeUntilExpiry < 5 * 60 * 1000 && timeUntilExpiry > 0) {
        console.log('⏰ Auth: Token expire bientôt, rafraîchissement automatique')
        refreshAuth().catch(() => {
          console.log('❌ Auth: Échec du rafraîchissement automatique, déconnexion')
          logout()
        })
      }
    }

    // Vérifier immédiatement
    checkTokenExpiry()

    // Vérifier toutes les minutes
    const interval = setInterval(checkTokenExpiry, 60 * 1000)

    return () => clearInterval(interval)
  }, [tokens, isAuthenticated])

  const value: AuthContextType = {
    user,
    tokens,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshAuth,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook pour vérifier l'authentification
export const useRequireAuth = () => {
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const currentPath = window.location.pathname
      const redirectUrl = `/login?redirect=${encodeURIComponent(currentPath)}`
      window.location.href = redirectUrl
    }
  }, [isAuthenticated, isLoading])

  return { isAuthenticated, isLoading }
}
