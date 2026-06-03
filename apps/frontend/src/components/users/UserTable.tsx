import { useState } from 'react'
import { Edit, Trash2, ToggleLeft, ToggleRight, ChevronLeft, ChevronRight, Key } from 'lucide-react'
import { User, PaginationResult, UserRole } from '@/types/user'

interface UserTableProps {
  users: User[]
  currentUser: Pick<User, 'id' | 'role'> & Partial<User>
  onEdit: (user: User) => void
  onDelete: (user: User) => void
  onToggleStatus: (user: User) => void
  onChangePassword: (user: User) => void
  pagination: PaginationResult
  onPageChange: (page: number) => void
}

export function UserTable({
  users,
  currentUser,
  onEdit,
  onDelete,
  onToggleStatus,
  onChangePassword,
  pagination,
  onPageChange
}: UserTableProps) {
  
  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800'
      case 'MANAGER':
        return 'bg-orange-100 text-orange-800'
      case 'EMPLOYEE':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrateur'
      case 'MANAGER':
        return 'Manager'
      case 'EMPLOYEE':
        return 'Employé'
      default:
        return role
    }
  }

  const canEditUser = (user: User) => {
    // Admin peut tout modifier
    if (currentUser.role === 'ADMIN') return true
    
    // Manager peut modifier les employés de sa compagnie
    if (currentUser.role === 'MANAGER') {
      return user.role === 'EMPLOYEE' && user.companyId === currentUser.companyId
    }
    
    return false
  }

  const canDeleteUser = (user: User) => {
    // Seuls les admins peuvent supprimer
    if (currentUser.role !== 'ADMIN') return false
    
    // Ne peut pas se supprimer soi-même
    if (user.id === currentUser.id) return false
    
    return true
  }

  const canToggleStatus = (user: User) => {
    // Admin peut tout modifier
    if (currentUser.role === 'ADMIN') {
      // Ne peut pas se désactiver soi-même
      return user.id !== currentUser.id
    }
    
    // Manager peut modifier les employés de sa compagnie
    if (currentUser.role === 'MANAGER') {
      return user.role === 'EMPLOYEE' && user.companyId === currentUser.companyId
    }
    
    return false
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR')
  }

  const generatePageNumbers = () => {
    const pages = []
    const maxVisiblePages = 5
    const { page, totalPages } = pagination
    
    let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2))
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }
    
    return pages
  }

  if (!users || users.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Aucun utilisateur trouvé</p>
      </div>
    )
  }

  return (
    <div>
      {/* Tableau */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Utilisateur
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rôle
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Entreprise
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Créé le
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dernière connexion
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users?.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </div>
                      {user.id === currentUser.id && (
                        <div className="text-xs text-blue-600">(Vous)</div>
                      )}
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{user.email}</div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                    {getRoleLabel(user.role)}
                  </span>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className={`text-sm ${user.isActive ? 'text-green-700' : 'text-red-700'}`}>
                      {user.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {user.company?.name || 'Non définie'}
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatDate(user.createdAt)}
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Jamais'}
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    {canEditUser(user) && (
                      <button
                        onClick={() => onEdit(user)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}

                    {canEditUser(user) && (
                      <button
                        onClick={() => onChangePassword(user)}
                        className="text-purple-600 hover:text-purple-900 p-1 rounded"
                        title="Changer le mot de passe"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                    )}

                    {canToggleStatus(user) && (
                      <button
                        onClick={() => onToggleStatus(user)}
                        className={`p-1 rounded ${user.isActive ? 'text-orange-600 hover:text-orange-900' : 'text-green-600 hover:text-green-900'}`}
                        title={user.isActive ? 'Désactiver' : 'Activer'}
                      >
                        {user.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                    )}
                    
                    {canDeleteUser(user) && (
                      <button
                        onClick={() => onDelete(user)}
                        className="text-red-600 hover:text-red-900 p-1 rounded"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Affichage de {((pagination.page - 1) * pagination.limit) + 1} à{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} sur{' '}
              {pagination.total} résultats
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={!pagination.hasPrev}
                className="flex items-center gap-1 px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Précédent
              </button>
              
              <div className="flex gap-1">
                {generatePageNumbers().map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`px-3 py-1 text-sm border rounded-md ${
                      pageNum === pagination.page
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={!pagination.hasNext}
                className="flex items-center gap-1 px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Suivant
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
