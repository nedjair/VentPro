import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { UserFilters, UserRole } from '@/types/user'

interface UserFiltersComponentProps {
  filters: UserFilters
  onFiltersChange: (filters: UserFilters) => void
}

export function UserFiltersComponent({ filters, onFiltersChange }: UserFiltersComponentProps) {
  const [localFilters, setLocalFilters] = useState<UserFilters>(filters)

  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  const handleFilterChange = (key: keyof UserFilters, value: any) => {
    const newFilters = {
      ...localFilters,
      [key]: value === '' ? undefined : value
    }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const clearFilters = () => {
    const emptyFilters: UserFilters = {}
    setLocalFilters(emptyFilters)
    onFiltersChange(emptyFilters)
  }

  const hasActiveFilters = Object.values(localFilters).some(value => value !== undefined && value !== '')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Filtres</h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
          >
            <X className="w-4 h-4" />
            Effacer les filtres
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Filtre par rôle */}
        <div>
          <label htmlFor="role-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Rôle
          </label>
          <select
            id="role-filter"
            value={localFilters.role || ''}
            onChange={(e) => handleFilterChange('role', e.target.value as UserRole)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Tous les rôles</option>
            <option value="ADMIN">Administrateur</option>
            <option value="MANAGER">Manager</option>
            <option value="EMPLOYEE">Employé</option>
          </select>
        </div>

        {/* Filtre par statut */}
        <div>
          <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Statut
          </label>
          <select
            id="status-filter"
            value={localFilters.isActive === undefined ? '' : localFilters.isActive.toString()}
            onChange={(e) => {
              const value = e.target.value
              handleFilterChange('isActive', value === '' ? undefined : value === 'true')
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Tous les statuts</option>
            <option value="true">Actif</option>
            <option value="false">Inactif</option>
          </select>
        </div>

        {/* Filtre par entreprise (si admin) */}
        <div>
          <label htmlFor="company-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Entreprise
          </label>
          <input
            type="text"
            id="company-filter"
            placeholder="ID de l'entreprise"
            value={localFilters.companyId || ''}
            onChange={(e) => handleFilterChange('companyId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Indicateurs de filtres actifs */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {localFilters.role && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              Rôle: {localFilters.role === 'ADMIN' ? 'Administrateur' : localFilters.role === 'MANAGER' ? 'Manager' : 'Employé'}
              <button
                onClick={() => handleFilterChange('role', undefined)}
                className="hover:bg-blue-200 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          
          {localFilters.isActive !== undefined && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              Statut: {localFilters.isActive ? 'Actif' : 'Inactif'}
              <button
                onClick={() => handleFilterChange('isActive', undefined)}
                className="hover:bg-green-200 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          
          {localFilters.companyId && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
              Entreprise: {localFilters.companyId}
              <button
                onClick={() => handleFilterChange('companyId', undefined)}
                className="hover:bg-purple-200 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
