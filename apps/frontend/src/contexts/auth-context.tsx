'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { api } from '@/lib/api'

// Types
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE'
  isActive: boolean
  companyId: string
  company?: {
    id: string
    name: string
    currency?: string
  }
  createdAt: string
  updatedAt: string
  lastLoginAt?: string | null
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
  updateUser: (userData: User) => void
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
  const [mounted, setMounted] = useState(false)

  const isAuthenticated = !!user && !!tokens

  // Gérer l'hydratation côté client
  useEffect(() => {
    setMounted(true)
  }, [])

  // Charger les données d'authentification depuis localStorage
  useEffect(() => {
    if (!mounted) return
    const loadAuthData = () => {
      try {
        const storedUser = localStorage.getItem('auth-user')
        const storedTokens = localStorage.getItem('auth-tokens')

        if (storedUser && storedTokens) {
          const userData = JSON.parse(storedUser)
          const tokensData = JSON.parse(storedTokens)



          // Vérifier si le token n'est pas expiré
          const now = Date.now()
          let tokenExpiry = tokensData.expiresAt || 0
          let accessToken = tokensData.accessToken

          // Gérer l'ancien format de tokens si nécessaire
          if (!tokenExpiry && tokensData.access) {
            // Ancien format: {"access": "date", "refresh": "date"}
            const accessDate = new Date(tokensData.access).getTime()
            // Considérer le token valide pendant 24h par défaut
            tokenExpiry = accessDate + (24 * 60 * 60 * 1000)
            accessToken = tokensData.access // Utiliser la date comme token temporairement
            console.log('🔄 Auth: Conversion de l\'ancien format de tokens')
          }



          // Ajouter une petite marge de 5 secondes pour éviter les problèmes de timing
          if (now <= tokenExpiry + 5000) {
            setUser(userData)
            // Normaliser la structure des tokens
            const normalizedTokens = {
              accessToken: accessToken || tokensData.accessToken,
              refreshToken: tokensData.refreshToken || tokensData.refresh,
              expiresAt: tokenExpiry,
              expiresIn: Math.floor((tokenExpiry - now) / 1000)
            }
            setTokens(normalizedTokens)
            api.setAuthToken(normalizedTokens.accessToken)
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
  }, [mounted])

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

  // Mettre à jour les données utilisateur
  const updateUser = (userData: User) => {
    try {
      setUser(userData)
      localStorage.setItem('auth-user', JSON.stringify(userData))
      console.log('✅ Auth: Données utilisateur mises à jour')
    } catch (error) {
      console.error('❌ Auth: Erreur lors de la mise à jour utilisateur:', error)
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
    isLoading: isLoading || !mounted,
    isAuthenticated: mounted ? isAuthenticated : false,
    login,
    logout,
    refreshAuth,
    updateUser,
  }

  // Éviter l'hydratation mismatch en affichant un loader côté serveur
  if (!mounted) {
    return (
      <AuthContext.Provider value={{
        user: null,
        tokens: null,
        isLoading: true,
        isAuthenticated: false,
        login,
        logout,
        refreshAuth,
        updateUser,
      }}>
        {children}
      </AuthContext.Provider>
    )
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
