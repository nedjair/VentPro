import { useState, useEffect, useCallback } from 'react'
import { userService } from '@/services/userService'
import { User, UserFilters, PaginationOptions, UserStats } from '@/types/user'

interface UseUsersOptions {
  initialFilters?: UserFilters
  initialPagination?: Partial<PaginationOptions>
  autoLoad?: boolean
}

interface UseUsersReturn {
  // Données
  users: User[]
  stats: UserStats | null
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  
  // États
  loading: boolean
  error: string | null
  
  // Filtres et recherche
  filters: UserFilters
  searchTerm: string
  
  // Actions
  loadUsers: () => Promise<void>
  loadStats: () => Promise<void>
  setFilters: (filters: UserFilters) => void
  setSearchTerm: (term: string) => void
  setPage: (page: number) => void
  setLimit: (limit: number) => void
  refresh: () => Promise<void>
  
  // Actions CRUD
  createUser: (userData: any) => Promise<void>
  updateUser: (userId: string, userData: any) => Promise<void>
  deleteUser: (userId: string) => Promise<void>
  toggleUserStatus: (userId: string, isActive: boolean) => Promise<void>
  changePassword: (userId: string, passwordData: any) => Promise<void>
}

export function useUsers(options: UseUsersOptions = {}): UseUsersReturn {
  const {
    initialFilters = {},
    initialPagination = { page: 1, limit: 10 },
    autoLoad = true
  } = options

  // États pour les données
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // États pour la pagination
  const [pagination, setPagination] = useState({
    page: initialPagination.page || 1,
    limit: initialPagination.limit || 10,
    total: 0,
    totalPages: 0
  })

  // États pour les filtres et recherche
  const [filters, setFiltersState] = useState<UserFilters>(initialFilters)
  const [searchTerm, setSearchTermState] = useState('')

  // Chargement des utilisateurs
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const paginationOptions: PaginationOptions = {
        page: pagination.page,
        limit: pagination.limit
      }

      const result = await userService.getUsers(filters, paginationOptions, searchTerm)

      setUsers(result.users || [])
      setPagination(prev => ({
        ...prev,
        total: result.pagination.total,
        totalPages: result.pagination.totalPages
      }))
    } catch (err: any) {
      console.error('Erreur lors du chargement des utilisateurs:', err)
      setError(err.message || 'Erreur lors du chargement des utilisateurs')
    } finally {
      setLoading(false)
    }
  }, [filters, pagination.page, pagination.limit, searchTerm])

  // Chargement des statistiques
  const loadStats = useCallback(async () => {
    try {
      const statsData = await userService.getStats()
      setStats(statsData)
    } catch (err: any) {
      console.error('Erreur lors du chargement des statistiques:', err)
    }
  }, [])

  // Actions pour les filtres et pagination
  const setFilters = useCallback((newFilters: UserFilters) => {
    setFiltersState(newFilters)
    setPagination(prev => ({ ...prev, page: 1 })) // Reset à la page 1
  }, [])

  const setSearchTerm = useCallback((term: string) => {
    setSearchTermState(term)
    setPagination(prev => ({ ...prev, page: 1 })) // Reset à la page 1
  }, [])

  const setPage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }, [])

  const setLimit = useCallback((limit: number) => {
    setPagination(prev => ({ ...prev, limit, page: 1 })) // Reset à la page 1
  }, [])

  // Rafraîchissement complet
  const refresh = useCallback(async () => {
    await Promise.all([loadUsers(), loadStats()])
  }, [loadUsers, loadStats])

  // Actions CRUD
  const createUser = useCallback(async (userData: any) => {
    try {
      setError(null)
      await userService.createUser(userData)
      await refresh()
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création de l\'utilisateur')
      throw err
    }
  }, [refresh])

  const updateUser = useCallback(async (userId: string, userData: any) => {
    try {
      setError(null)
      await userService.updateUser(userId, userData)
      await refresh()
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour de l\'utilisateur')
      throw err
    }
  }, [refresh])

  const deleteUser = useCallback(async (userId: string) => {
    try {
      setError(null)
      await userService.deleteUser(userId)
      await refresh()
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression de l\'utilisateur')
      throw err
    }
  }, [refresh])

  const toggleUserStatus = useCallback(async (userId: string, isActive: boolean) => {
    try {
      setError(null)
      await userService.updateUser(userId, { isActive })
      await refresh()
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour du statut')
      throw err
    }
  }, [refresh])

  const changePassword = useCallback(async (userId: string, passwordData: any) => {
    try {
      setError(null)
      await userService.changePassword(userId, passwordData)
      // Pas besoin de refresh pour le changement de mot de passe
    } catch (err: any) {
      setError(err.message || 'Erreur lors du changement de mot de passe')
      throw err
    }
  }, [])

  // Chargement initial
  useEffect(() => {
    if (autoLoad) {
      loadUsers()
    }
  }, [loadUsers, autoLoad])

  useEffect(() => {
    if (autoLoad) {
      loadStats()
    }
  }, [loadStats, autoLoad])

  return {
    // Données
    users,
    stats,
    pagination,
    
    // États
    loading,
    error,
    
    // Filtres et recherche
    filters,
    searchTerm,
    
    // Actions
    loadUsers,
    loadStats,
    setFilters,
    setSearchTerm,
    setPage,
    setLimit,
    refresh,
    
    // Actions CRUD
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    changePassword
  }
}
