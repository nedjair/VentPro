'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Filter, Users, UserCheck, UserX, Edit, Trash2, UserCog } from 'lucide-react'
import { useAuth } from '@/stores/auth'
import { userService } from '@/services/userService'
import { User, UserFilters, PaginationOptions } from '@/types/user'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UserTable } from '@/components/users/UserTable'
import { UserFiltersComponent } from '@/components/users/UserFilters'
import { CreateUserModal } from '@/components/users/CreateUserModal'
import { EditUserModal } from '@/components/users/EditUserModal'
import { DeleteUserModal } from '@/components/users/DeleteUserModal'
import { ChangePasswordModal } from '@/components/users/ChangePasswordModal'
import { toast } from '@/components/ui/toast'

export function UserManagementSettings() {
  const router = useRouter()
  const { user: currentUser } = useAuth()
  const normalizedCurrentUserRole = (currentUser?.role || '').toUpperCase()
  
  // États
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<UserFilters>({})
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })
  
  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  
  // Statistiques
  const [stats, setStats] = useState({
    total: 0,
    admins: 0,
    managers: 0,
    employees: 0
  })

  // Vérifier les permissions
  useEffect(() => {
    if (!currentUser || !['ADMIN', 'MANAGER'].includes(normalizedCurrentUserRole)) {
      return
    }
  }, [currentUser, normalizedCurrentUserRole])

  // Charger les utilisateurs
  const loadUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const paginationOptions: PaginationOptions = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      }
      
      const searchFilters: UserFilters = {
        ...filters,
        search: searchTerm || undefined
      }
      
      const response = await userService.getUsers(searchFilters, paginationOptions)
      
      setUsers(response.users)
      setPagination(response.pagination)
      
    } catch (err) {
      console.error('Erreur lors du chargement des utilisateurs:', err)
      setError('Erreur lors du chargement des utilisateurs')
      toast.error('Erreur lors du chargement des utilisateurs')
    } finally {
      setLoading(false)
    }
  }

  // Charger les statistiques
  const loadStats = async () => {
    try {
      const statsData = await userService.getStats()
      setStats(statsData)
    } catch (err) {
      console.error('Erreur lors du chargement des statistiques:', err)
    }
  }

  // Effets
  useEffect(() => {
    if (currentUser && ['ADMIN', 'MANAGER'].includes(normalizedCurrentUserRole)) {
      loadUsers()
      loadStats()
    }
  }, [currentUser, normalizedCurrentUserRole, pagination.page, pagination.limit, filters, searchTerm])

  // Gestionnaires d'événements
  const handleSearch = (term: string) => {
    setSearchTerm(term)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleFiltersChange = (newFilters: UserFilters) => {
    setFilters(newFilters)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }

  const handleCreateUser = () => {
    setShowCreateModal(true)
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setShowEditModal(true)
  }

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user)
    setShowDeleteModal(true)
  }

  const handleChangePassword = (user: User) => {
    setSelectedUser(user)
    setShowPasswordModal(true)
  }

  const handleToggleStatus = async (user: User) => {
    try {
      await userService.toggleStatus(user.id, !user.isActive)
      toast.success(`Utilisateur ${!user.isActive ? 'activé' : 'désactivé'} avec succès`)
      loadUsers()
    } catch (err) {
      console.error('Erreur lors du changement de statut:', err)
      toast.error('Erreur lors du changement de statut')
    }
  }

  const handleUserCreated = () => {
    setShowCreateModal(false)
    loadUsers()
    loadStats()
    toast.success('Utilisateur créé avec succès')
  }

  const handleUserUpdated = () => {
    setShowEditModal(false)
    setSelectedUser(null)
    loadUsers()
    toast.success('Utilisateur mis à jour avec succès')
  }

  const handleUserDeleted = () => {
    setShowDeleteModal(false)
    setSelectedUser(null)
    loadUsers()
    loadStats()
    toast.success('Utilisateur supprimé avec succès')
  }

  const handlePasswordChanged = () => {
    setShowPasswordModal(false)
    setSelectedUser(null)
    toast.success('Mot de passe modifié avec succès')
  }

  // Si l'utilisateur n'a pas les permissions
  if (!currentUser || !['ADMIN', 'MANAGER'].includes(normalizedCurrentUserRole)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Gestion des Utilisateurs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <UserX className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Accès restreint</h3>
            <p className="mt-1 text-sm text-gray-500">
              Vous n'avez pas les permissions nécessaires pour accéder à la gestion des utilisateurs.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCog className="h-5 w-5" />
          Gestion des Utilisateurs
        </CardTitle>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Gérez les utilisateurs de votre entreprise
          </p>
          {normalizedCurrentUserRole === 'ADMIN' && (
            <Button
              onClick={handleCreateUser}
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nouvel Utilisateur
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <UserCheck className="w-6 h-6 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Administrateurs</p>
                <p className="text-xl font-bold text-gray-900">{stats.admins}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <UserCheck className="w-6 h-6 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Managers</p>
                <p className="text-xl font-bold text-gray-900">{stats.managers}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <UserX className="w-6 h-6 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Employés</p>
                <p className="text-xl font-bold text-gray-900">{stats.employees}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Barre de recherche et filtres */}
        <div className="bg-gray-50 p-4 rounded-lg border">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher par nom, prénom ou email..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filtres
            </Button>
          </div>
          
          {showFilters && (
            <div className="mt-4 pt-4 border-t">
              <UserFiltersComponent
                filters={filters}
                onFiltersChange={handleFiltersChange}
              />
            </div>
          )}
        </div>

        {/* Tableau des utilisateurs */}
        <div className="border rounded-lg">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Chargement des utilisateurs...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-600">{error}</p>
              <Button
                onClick={loadUsers}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                Réessayer
              </Button>
            </div>
          ) : (
            <UserTable
              users={users}
              currentUser={currentUser}
              onEdit={handleEditUser}
              onDelete={handleDeleteUser}
              onToggleStatus={handleToggleStatus}
              onChangePassword={handleChangePassword}
              pagination={pagination}
              onPageChange={handlePageChange}
            />
          )}
        </div>

        {/* Modales */}
        {showCreateModal && (
          <CreateUserModal
            onClose={() => setShowCreateModal(false)}
            onUserCreated={handleUserCreated}
          />
        )}
        
        {showEditModal && selectedUser && (
          <EditUserModal
            user={selectedUser}
            onClose={() => {
              setShowEditModal(false)
              setSelectedUser(null)
            }}
            onUserUpdated={handleUserUpdated}
          />
        )}
        
        {showDeleteModal && selectedUser && (
          <DeleteUserModal
            user={selectedUser}
            onClose={() => {
              setShowDeleteModal(false)
              setSelectedUser(null)
            }}
            onUserDeleted={handleUserDeleted}
          />
        )}

        {showPasswordModal && selectedUser && (
          <ChangePasswordModal
            userId={selectedUser.id}
            onClose={() => {
              setShowPasswordModal(false)
              setSelectedUser(null)
            }}
            onPasswordChanged={handlePasswordChanged}
          />
        )}
      </CardContent>
    </Card>
  )
}
