'use client'

import React from 'react'
import { api } from '@/lib/api'

// Types pour l'authentification
export interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE'
  permissions: string[]
  avatar?: string
  companyId?: string
  createdAt: string
  lastLoginAt?: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
  expiresAt?: number
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

function normalizeRole(role?: string): User['role'] {
  const normalizedRole = (role || 'EMPLOYEE').toUpperCase()
  return normalizedRole === 'ADMIN' || normalizedRole === 'MANAGER' || normalizedRole === 'EMPLOYEE'
    ? normalizedRole
    : 'EMPLOYEE'
}

function splitFullName(fullName?: string) {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  }
}

function normalizeAuthUser(user: any): User {
  const fullName = splitFullName(user?.fullName)
  const firstName = user?.firstName || fullName.firstName || ''
  const lastName = user?.lastName || fullName.lastName || ''
  const role = normalizeRole(user?.role)

  return {
    id: String(user?.id || ''),
    email: user?.email || '',
    firstName,
    lastName,
    role,
    permissions: role === 'ADMIN' ? ['*'] : ['read'],
    createdAt: user?.createdAt || new Date().toISOString(),
    lastLoginAt: user?.lastLoginAt || new Date().toISOString(),
  }
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

  // Persister l'authentification au même endroit pour tout le frontend.
  private persistAuth(user: User, tokens: AuthTokens) {
    api.setAuthToken(tokens.accessToken)

    if (typeof window !== 'undefined') {
      localStorage.setItem('auth-user', JSON.stringify(user))
      localStorage.setItem('auth-tokens', JSON.stringify(tokens))
      document.cookie = `auth-token=${tokens.accessToken}; path=/; max-age=${tokens.expiresIn || 86400}; SameSite=Lax`
    }
  }

  // Nettoyer le stockage partagé avec le middleware Next.js.
  private clearStoredAuth() {
    api.clearAuthToken()

    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth-user')
      localStorage.removeItem('auth-tokens')
      document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    }
  }

  // Méthode de connexion
  async login(credentials: LoginCredentials): Promise<void> {
    this.setState({ isLoading: true, error: null })

    try {
      const response = await api.login(credentials)

      if (response.success && response.data) {
        const { user, tokens } = response.data

        const authUser: User = normalizeAuthUser({
          ...user,
          lastLoginAt: new Date().toISOString(),
        })

        const authTokens: AuthTokens = {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: 86400, // 24h en secondes
        }

        this.persistAuth(authUser, authTokens)

        this.setState({
          user: authUser,
          tokens: authTokens,
          isAuthenticated: true,
          isLoading: false,
          error: null,
          isHydrated: true,
        })
      } else {
        throw new Error(response.message || 'Erreur de connexion')
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur de connexion'
      this.setState({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
      })
      throw error
    }
  }

  // Méthode de déconnexion
  logout(): void {
    this.clearStoredAuth()

    this.setState({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isHydrated: true,
    })

    if (typeof window !== 'undefined') {
      window.location.assign('/login')
    }
  }

  // Méthode pour vérifier l'authentification au démarrage
  async checkAuth(): Promise<void> {
    if (typeof window === 'undefined') return

    try {
      this.setState({ isLoading: true, error: null })

      const storedUser = localStorage.getItem('auth-user')
      const storedTokens = localStorage.getItem('auth-tokens')

      if (storedUser && storedTokens) {
        const user: User = normalizeAuthUser(JSON.parse(storedUser))
        const parsedTokens = JSON.parse(storedTokens)
        const tokens: AuthTokens = {
          accessToken: parsedTokens?.accessToken || '',
          refreshToken: parsedTokens?.refreshToken || '',
          expiresIn: Number(parsedTokens?.expiresIn || 86400),
        }

        if (tokens.accessToken) {
          this.persistAuth(user, tokens)
          this.setState({
            user,
            tokens,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            isHydrated: true,
          })
          return
        }
      }

      const cookieMatch = document.cookie.match(/auth-token=([^;]+)/)
      const token = cookieMatch?.[1]
      if (!token) {
        this.setState({
          user: null,
          tokens: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          isHydrated: true,
        })
        return
      }

      api.setAuthToken(token)
      const userResponse = await api.getProfile()

      if (!userResponse.success || !userResponse.data) {
        throw new Error(userResponse.message || 'Impossible de restaurer la session')
      }

      const user = normalizeAuthUser({
        ...userResponse.data,
        lastLoginAt: new Date().toISOString(),
      })
      const tokens: AuthTokens = {
        accessToken: token,
        refreshToken: '',
        expiresIn: 86400,
      }

      this.persistAuth(user, tokens)
      this.setState({
        user,
        tokens,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        isHydrated: true,
      })

    } catch (error) {
      this.clearAuth()
    }
  }

  updateUser(user: User): void {
    const currentTokens = this.state.tokens

    if (currentTokens) {
      this.persistAuth(user, currentTokens)
    }

    this.setState({
      user,
      isAuthenticated: Boolean(currentTokens),
      isHydrated: true,
    })
  }

  // Méthode pour nettoyer l'authentification
  clearAuth(): void {
    this.clearStoredAuth()

    this.setState({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isHydrated: true,
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
      authStore.checkAuth().catch(error => {
        console.error('Erreur lors de la vérification d\'authentification:', error)
      })
    }
  }, [isClient, state.isHydrated])

  // Créer des fonctions wrapper pour éviter les problèmes de binding
  const login = React.useCallback(async (credentials: LoginCredentials) => {
    return authStore.login(credentials)
  }, [])

  const logout = React.useCallback(() => {
    return authStore.logout()
  }, [])

  const updateUser = React.useCallback((user: User) => {
    return authStore.updateUser(user)
  }, [])

  const clearError = React.useCallback(() => {
    return authStore.clearError()
  }, [])

  const hasRole = React.useCallback((role: string) => {
    return authStore.hasRole(role)
  }, [])

  const hasPermission = React.useCallback((permission: string) => {
    return authStore.hasPermission(permission)
  }, [])

  const isAdmin = React.useCallback(() => {
    return authStore.isAdmin()
  }, [])

  return {
    ...state,
    login,
    logout,
    clearError,
    hasRole,
    hasPermission,
    isAdmin,
    updateUser,
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
    const handleStateChange = (state: AuthState) => {
      setIsAuthenticated(state.isAuthenticated)
      setIsHydrated(state.isHydrated)
    }

    const unsubscribe = authStore.subscribe(handleStateChange)

    // Initialiser immédiatement avec l'état actuel du store
    const currentState = authStore.getState()
    setIsAuthenticated(currentState.isAuthenticated)
    setIsHydrated(currentState.isHydrated)

    return unsubscribe
  }, [])

  // Initialiser l'authentification côté client après hydratation
  React.useEffect(() => {
    if (isClient && !isHydrated) {
      authStore.checkAuth().catch(error => {
        console.error('Erreur lors de la vérification d\'authentification:', error)
      })
    }
  }, [isClient, isHydrated])

  // Retourner l'état d'authentification si on est côté client
  return isClient ? isAuthenticated : false
}

// Alias pour compatibilité avec les composants existants
export const useAuthStore = useAuth
