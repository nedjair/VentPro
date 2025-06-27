'use client'

import React from 'react'
import { api } from '@/lib/api'

// Types pour l'authentification
export interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role: 'ADMIN' | 'MANAGER' | 'USER' | 'READONLY'
  permissions: string[]
  avatar?: string
  createdAt: string
  lastLoginAt?: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
}

export interface AuthState {
  user: User | null
  tokens: AuthTokens | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  isHydrated: boolean
}

// Hook pour détecter si on est côté client après hydratation
function useIsClient() {
  const [isClient, setIsClient] = React.useState(false)

  React.useEffect(() => {
    setIsClient(true)
  }, [])

  return isClient
}

// Store d'authentification simple (sans Zustand)
class AuthStore {
  private state: AuthState = {
    user: null,
    tokens: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    isHydrated: false,
  }

  private listeners: Array<(state: AuthState) => void> = []

  // Méthodes pour s'abonner aux changements d'état
  subscribe(listener: (state: AuthState) => void) {
    this.listeners.push(listener)
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  // Méthode pour notifier les changements
  private notify() {
    this.listeners.forEach(listener => listener(this.state))
  }

  // Méthode pour mettre à jour l'état
  private setState(updates: Partial<AuthState>) {
    this.state = { ...this.state, ...updates }
    this.notify()
  }

  // Getter pour l'état
  getState(): AuthState {
    return this.state
  }

  // Méthode de connexion
  async login(credentials: LoginCredentials): Promise<void> {
    console.log('🔍 Store: Début de la méthode login')
    this.setState({ isLoading: true, error: null })

    try {
      console.log('🔍 Store: Appel API login...')
      // Appel API réel
      const response = await api.login(credentials)
      console.log('🔍 Store: Réponse API reçue:', response)

      if (response.success && response.data) {
        console.log('✅ Store: Réponse API valide, traitement des données...')
        const { user, tokens } = response.data

        // Transformer les données utilisateur
        const authUser: User = {
          id: user.id.toString(),
          email: user.email,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          role: user.role as User['role'],
          permissions: user.role === 'ADMIN' ? ['*'] : ['read'],
          createdAt: user.createdAt || new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        }

        const authTokens: AuthTokens = {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: 86400, // 24h en secondes
        }

        console.log('🔍 Store: Utilisateur transformé:', authUser)
        console.log('🔍 Store: Tokens créés:', {
          accessToken: tokens.accessToken ? tokens.accessToken.substring(0, 20) + '...' : 'N/A',
          expiresIn: authTokens.expiresIn
        })

        // Configurer l'API avec le token
        api.setAuthToken(authTokens.accessToken)

        // Stocker dans localStorage et cookies
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth-user', JSON.stringify(authUser))
          localStorage.setItem('auth-tokens', JSON.stringify(authTokens))

          // Stocker le token dans un cookie pour le middleware
          document.cookie = `auth-token=${authTokens.accessToken}; path=/; max-age=${authTokens.expiresIn}; SameSite=Lax`
          console.log('✅ Store: Données stockées dans localStorage et cookie')
        }

        this.setState({
          user: authUser,
          tokens: authTokens,
          isAuthenticated: true,
          isLoading: false,
          error: null,
          isHydrated: true, // Marquer comme hydraté après une connexion réussie
        })

        console.log('✅ Store: État mis à jour, isAuthenticated =', true)
        console.log('✅ Store: État final:', {
          isAuthenticated: this.state.isAuthenticated,
          user: this.state.user?.email,
          hasToken: !!this.state.tokens?.accessToken,
          isHydrated: this.state.isHydrated
        })

        // Forcer une notification supplémentaire après un délai pour s'assurer que les composants sont mis à jour
        setTimeout(() => {
          console.log('🔄 Store: Notification forcée après connexion')
          this.notify()
        }, 100)

      } else {
        console.log('❌ Store: Réponse API invalide:', response)
        throw new Error(response.message || 'Erreur de connexion')
      }

    } catch (error) {
      console.error('❌ Store: Erreur dans login:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur de connexion'
      this.setState({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
      })
      console.log('❌ Store: État mis à jour avec erreur:', errorMessage)
      throw error
    }
  }

  // Méthode de déconnexion
  logout(): void {
    // Nettoyer l'API
    api.clearAuthToken()

    // Nettoyer localStorage et cookies
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth-user')
      localStorage.removeItem('auth-tokens')

      // Supprimer le cookie
      document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    }

    this.setState({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })

    // Rediriger vers la page de connexion
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }

  // Méthode pour vérifier l'authentification au démarrage
  checkAuth(): void {
    if (typeof window === 'undefined') return

    try {
      console.log('🔍 checkAuth: Début de la vérification')

      // Vérifier d'abord le localStorage
      const storedUser = localStorage.getItem('auth-user')
      const storedTokens = localStorage.getItem('auth-tokens')

      console.log('🔍 checkAuth: localStorage user:', !!storedUser)
      console.log('🔍 checkAuth: localStorage tokens:', !!storedTokens)

      if (storedUser && storedTokens) {
        const user: User = JSON.parse(storedUser)
        const tokens: AuthTokens = JSON.parse(storedTokens)

        // Configurer l'API avec le token
        api.setAuthToken(tokens.accessToken)

        // Restaurer le cookie si nécessaire
        if (!document.cookie.includes('auth-token=')) {
          document.cookie = `auth-token=${tokens.accessToken}; path=/; max-age=${tokens.expiresIn || 86400}; SameSite=Lax`
        }

        this.setState({
          user,
          tokens,
          isAuthenticated: true,
          isLoading: false,
          error: null,
          isHydrated: true,
        })

        console.log('✅ checkAuth: Authentification restaurée depuis localStorage')
        console.log('✅ checkAuth: État après restauration:', {
          isAuthenticated: this.state.isAuthenticated,
          isHydrated: this.state.isHydrated,
          user: this.state.user?.email
        })

        // Forcer une notification pour s'assurer que les composants sont mis à jour
        setTimeout(() => {
          console.log('🔄 checkAuth: Notification forcée après restauration localStorage')
          this.notify()
        }, 50)
        return
      }

      // Si pas de localStorage, vérifier le cookie
      const cookieMatch = document.cookie.match(/auth-token=([^;]+)/)
      if (cookieMatch) {
        const token = cookieMatch[1]
        console.log('🔍 checkAuth: Token trouvé dans cookie:', token ? token.substring(0, 20) + '...' : 'undefined')

        // Créer un utilisateur temporaire basé sur le token
        // En production, on devrait décoder le JWT ou faire un appel API
        const tempUser: User = {
          id: 'temp-user',
          email: 'admin@gestion-dz.com',
          firstName: 'Admin',
          lastName: 'User',
          role: 'ADMIN',
          permissions: ['*'],
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        }

        const tempTokens: AuthTokens = {
          accessToken: token || '',
          refreshToken: token || '',
          expiresIn: 86400,
        }

        // Configurer l'API avec le token
        if (token) {
          api.setAuthToken(token)
        }

        // Essayer de stocker à nouveau dans localStorage
        try {
          localStorage.setItem('auth-user', JSON.stringify(tempUser))
          localStorage.setItem('auth-tokens', JSON.stringify(tempTokens))
          console.log('✅ checkAuth: Données sauvegardées dans localStorage')
        } catch (e) {
          console.warn('⚠️ checkAuth: Impossible de sauvegarder dans localStorage:', e)
        }

        this.setState({
          user: tempUser,
          tokens: tempTokens,
          isAuthenticated: true,
          isLoading: false,
          error: null,
          isHydrated: true,
        })

        console.log('✅ checkAuth: Authentification restaurée depuis cookie')
        return
      }

      // Aucune authentification trouvée
      console.log('🔍 checkAuth: Aucune authentification trouvée')
      this.setState({
        isHydrated: true,
      })

    } catch (error) {
      console.error('❌ checkAuth: Erreur lors de la vérification:', error)
      this.clearAuth()
      this.setState({
        isHydrated: true,
      })
    }
  }

  // Méthode pour nettoyer l'authentification
  clearAuth(): void {
    api.clearAuthToken()

    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth-user')
      localStorage.removeItem('auth-tokens')

      // Supprimer le cookie
      document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    }

    this.setState({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })
  }

  // Méthode pour effacer les erreurs
  clearError(): void {
    this.setState({ error: null })
  }

  // Utilitaires
  hasRole(role: string): boolean {
    return this.state.user?.role === role
  }

  hasPermission(permission: string): boolean {
    const user = this.state.user
    if (!user) return false

    // Les admins ont toutes les permissions
    if (user.role === 'ADMIN') return true

    return user.permissions.includes(permission)
  }

  isAdmin(): boolean {
    return this.state.user?.role === 'ADMIN'
  }
}

// Instance globale du store
export const authStore = new AuthStore()

// Hook React pour utiliser le store d'authentification
export function useAuth() {
  const [state, setState] = React.useState(authStore.getState())
  const isClient = useIsClient()

  React.useEffect(() => {
    const unsubscribe = authStore.subscribe(setState)
    return unsubscribe
  }, [])

  // Initialiser l'authentification côté client après hydratation
  React.useEffect(() => {
    if (isClient && !state.isHydrated) {
      authStore.checkAuth()
    }
  }, [isClient, state.isHydrated])

  return {
    ...state,
    login: authStore.login.bind(authStore),
    logout: authStore.logout.bind(authStore),
    clearError: authStore.clearError.bind(authStore),
    hasRole: authStore.hasRole.bind(authStore),
    hasPermission: authStore.hasPermission.bind(authStore),
    isAdmin: authStore.isAdmin.bind(authStore),
  }
}

// Hook pour récupérer uniquement l'utilisateur
export function useUser() {
  const [user, setUser] = React.useState(authStore.getState().user)

  React.useEffect(() => {
    const unsubscribe = authStore.subscribe((state) => setUser(state.user))
    return unsubscribe
  }, [])

  return user
}

// Hook pour vérifier si l'utilisateur est authentifié
export function useIsAuthenticated() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false) // Toujours false côté serveur
  const [isHydrated, setIsHydrated] = React.useState(false)
  const isClient = useIsClient()

  React.useEffect(() => {
    const unsubscribe = authStore.subscribe((state) => {
      setIsAuthenticated(state.isAuthenticated)
      setIsHydrated(state.isHydrated)
    })

    // Initialiser immédiatement avec l'état actuel du store
    const currentState = authStore.getState()
    setIsAuthenticated(currentState.isAuthenticated)
    setIsHydrated(currentState.isHydrated)

    return unsubscribe
  }, [])

  // Initialiser l'authentification côté client après hydratation
  React.useEffect(() => {
    if (isClient && !isHydrated) {
      authStore.checkAuth()
    }
  }, [isClient, isHydrated])

  // Retourner l'état d'authentification si on est côté client
  return isClient ? isAuthenticated : false
}

// Alias pour compatibilité avec les composants existants
export const useAuthStore = useAuth
