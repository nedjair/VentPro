import axios from 'axios'
import { API_BASE_URL } from '@/lib/api-config'
import { 
  User, 
  CreateUserData, 
  UpdateUserData, 
  UserFilters, 
  PaginationOptions, 
  UsersResponse, 
  PasswordChangeData, 
  UserStats,
  ApiResponse 
} from '@/types/user'

// Instance axios avec configuration par défaut
const apiClient = axios.create({
  // Sans base publique explicite, utiliser les routes relatives servies par Next.js.
  baseURL: API_BASE_URL || undefined,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Intercepteur pour ajouter le token d'authentification
apiClient.interceptors.request.use(
  (config) => {
    // Essayer de récupérer le token depuis localStorage
    const storedTokens = localStorage.getItem('auth-tokens')
    let token = null

    if (storedTokens) {
      try {
        const tokens = JSON.parse(storedTokens)
        token = tokens.accessToken
      } catch (e) {
        console.warn('Erreur lors du parsing des tokens:', e)
      }
    }

    // Fallback: essayer de récupérer depuis le cookie
    if (!token) {
      const cookieMatch = document.cookie.match(/auth-token=([^;]+)/)
      if (cookieMatch) {
        token = cookieMatch[1]
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Intercepteur pour gérer les erreurs de réponse
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expiré ou invalide - nettoyer toutes les données d'auth
      localStorage.removeItem('auth-tokens')
      localStorage.removeItem('auth-user')
      document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const userService = {
  /**
   * Récupérer la liste des utilisateurs avec pagination et filtres
   */
  async getUsers(filters: UserFilters = {}, pagination: PaginationOptions): Promise<UsersResponse> {
    try {
      const params = new URLSearchParams()
      
      // Pagination
      params.append('page', pagination.page.toString())
      params.append('limit', pagination.limit.toString())
      
      if (pagination.sortBy) {
        params.append('sortBy', pagination.sortBy)
      }
      
      if (pagination.sortOrder) {
        params.append('sortOrder', pagination.sortOrder)
      }
      
      // Filtres
      if (filters.search) {
        params.append('search', filters.search)
      }
      
      if (filters.role) {
        params.append('role', filters.role)
      }
      
      if (filters.isActive !== undefined) {
        params.append('isActive', filters.isActive.toString())
      }
      
      if (filters.companyId) {
        params.append('companyId', filters.companyId)
      }
      
      const response = await apiClient.get<ApiResponse<UsersResponse>>(`/api/v1/users?${params.toString()}`)
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || response.data.message || 'Erreur lors de la récupération des utilisateurs')
      }
      
      return response.data.data
      
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error)
      throw error
    }
  },

  /**
   * Récupérer un utilisateur par ID
   */
  async getUserById(id: string): Promise<User> {
    try {
      const response = await apiClient.get<ApiResponse<User>>(`/api/v1/users/${id}`)
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || response.data.message || 'Utilisateur non trouvé')
      }
      
      return response.data.data
      
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', error)
      throw error
    }
  },

  /**
   * Créer un nouvel utilisateur
   */
  async createUser(userData: CreateUserData): Promise<User> {
    try {
      const response = await apiClient.post<ApiResponse<User>>('/api/v1/users', userData)
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || response.data.message || 'Erreur lors de la création de l\'utilisateur')
      }
      
      return response.data.data
      
    } catch (error) {
      if (axios.isAxiosError(error) && (error.response?.data?.error || error.response?.data?.message)) {
        throw new Error(error.response.data.error || error.response.data.message)
      }
      console.error('Erreur lors de la création de l\'utilisateur:', error)
      throw error
    }
  },

  /**
   * Mettre à jour un utilisateur
   */
  async updateUser(id: string, userData: UpdateUserData): Promise<User> {
    try {
      const response = await apiClient.put<ApiResponse<User>>(`/api/v1/users/${id}`, userData)
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || response.data.message || 'Erreur lors de la mise à jour de l\'utilisateur')
      }
      
      return response.data.data
      
    } catch (error) {
      if (axios.isAxiosError(error) && (error.response?.data?.error || error.response?.data?.message)) {
        throw new Error(error.response.data.error || error.response.data.message)
      }
      console.error('Erreur lors de la mise à jour de l\'utilisateur:', error)
      throw error
    }
  },

  /**
   * Changer le mot de passe d'un utilisateur
   */
  async changePassword(id: string, passwordData: PasswordChangeData): Promise<void> {
    try {
      const response = await apiClient.post<ApiResponse<void>>(`/api/v1/users/${id}/change-password`, passwordData)
      
      if (!response.data.success) {
        throw new Error(response.data.error || response.data.message || 'Erreur lors du changement de mot de passe')
      }
      
    } catch (error) {
      if (axios.isAxiosError(error) && (error.response?.data?.error || error.response?.data?.message)) {
        throw new Error(error.response.data.error || error.response.data.message)
      }
      console.error('Erreur lors du changement de mot de passe:', error)
      throw error
    }
  },

  /**
   * Activer/désactiver un utilisateur
   */
  async toggleStatus(id: string, isActive: boolean): Promise<User> {
    try {
      const response = await apiClient.patch<ApiResponse<User>>(`/api/v1/users/${id}/status`, { isActive })
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || response.data.message || 'Erreur lors du changement de statut')
      }
      
      return response.data.data
      
    } catch (error) {
      if (axios.isAxiosError(error) && (error.response?.data?.error || error.response?.data?.message)) {
        throw new Error(error.response.data.error || error.response.data.message)
      }
      console.error('Erreur lors du changement de statut:', error)
      throw error
    }
  },

  /**
   * Supprimer définitivement un utilisateur
   */
  async deleteUser(id: string): Promise<void> {
    try {
      const response = await apiClient.delete<ApiResponse<void>>(`/api/v1/users/${id}`)
      
      if (!response.data.success) {
        throw new Error(response.data.error || response.data.message || 'Erreur lors de la suppression de l\'utilisateur')
      }
      
    } catch (error) {
      if (axios.isAxiosError(error) && (error.response?.data?.error || error.response?.data?.message)) {
        throw new Error(error.response.data.error || error.response.data.message)
      }
      console.error('Erreur lors de la suppression de l\'utilisateur:', error)
      throw error
    }
  },

  /**
   * Récupérer les statistiques des utilisateurs
   */
  async getStats(): Promise<UserStats> {
    try {
      const response = await apiClient.get<ApiResponse<UserStats>>('/api/v1/users/stats')
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || response.data.message || 'Erreur lors de la récupération des statistiques')
      }
      
      return response.data.data
      
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error)
      throw error
    }
  }
}
