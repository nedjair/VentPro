import { Users, UserCheck, UserX, Shield, Building, Calendar } from 'lucide-react'
import { UserStats as UserStatsType } from '@/types/user'

interface UserStatsProps {
  stats: UserStatsType
  loading?: boolean
}

export function UserStats({ stats, loading = false }: UserStatsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow-sm border animate-pulse">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-200 rounded"></div>
              <div className="ml-4 flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const statItems = [
    {
      label: 'Total utilisateurs',
      value: stats.total,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      label: 'Utilisateurs actifs',
      value: stats.active,
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      label: 'Utilisateurs inactifs',
      value: stats.inactive,
      icon: UserX,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      label: 'Administrateurs',
      value: stats.byRole?.ADMIN || 0,
      icon: Shield,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((item, index) => {
        const Icon = item.icon
        return (
          <div key={index} className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className={`p-2 rounded-lg ${item.bgColor}`}>
                <Icon className={`w-6 h-6 ${item.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{item.label}</p>
                <p className="text-2xl font-bold text-gray-900">{item.value}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Composant pour les statistiques détaillées
interface DetailedUserStatsProps {
  stats: UserStatsType
  loading?: boolean
}

export function DetailedUserStats({ stats, loading = false }: DetailedUserStatsProps) {
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition par rôle</h3>
      
      <div className="space-y-4">
        {/* Administrateurs */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Shield className="w-5 h-5 text-purple-600 mr-3" />
            <span className="text-sm font-medium text-gray-700">Administrateurs</span>
          </div>
          <div className="flex items-center">
            <span className="text-lg font-bold text-gray-900 mr-2">
              {stats.byRole?.ADMIN || 0}
            </span>
            <span className="text-sm text-gray-500">
              ({stats.total > 0 ? Math.round(((stats.byRole?.ADMIN || 0) / stats.total) * 100) : 0}%)
            </span>
          </div>
        </div>

        {/* Managers */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Building className="w-5 h-5 text-blue-600 mr-3" />
            <span className="text-sm font-medium text-gray-700">Managers</span>
          </div>
          <div className="flex items-center">
            <span className="text-lg font-bold text-gray-900 mr-2">
              {stats.byRole?.MANAGER || 0}
            </span>
            <span className="text-sm text-gray-500">
              ({stats.total > 0 ? Math.round(((stats.byRole?.MANAGER || 0) / stats.total) * 100) : 0}%)
            </span>
          </div>
        </div>

        {/* Employés */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Users className="w-5 h-5 text-green-600 mr-3" />
            <span className="text-sm font-medium text-gray-700">Employés</span>
          </div>
          <div className="flex items-center">
            <span className="text-lg font-bold text-gray-900 mr-2">
              {stats.byRole?.EMPLOYEE || 0}
            </span>
            <span className="text-sm text-gray-500">
              ({stats.total > 0 ? Math.round(((stats.byRole?.EMPLOYEE || 0) / stats.total) * 100) : 0}%)
            </span>
          </div>
        </div>
      </div>

      {/* Barre de progression */}
      <div className="mt-4">
        <div className="flex text-xs text-gray-600 mb-1">
          <span>Répartition des rôles</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="flex h-2 rounded-full overflow-hidden">
            <div 
              className="bg-purple-600" 
              style={{ 
                width: `${stats.total > 0 ? ((stats.byRole?.ADMIN || 0) / stats.total) * 100 : 0}%` 
              }}
            ></div>
            <div 
              className="bg-blue-600" 
              style={{ 
                width: `${stats.total > 0 ? ((stats.byRole?.MANAGER || 0) / stats.total) * 100 : 0}%` 
              }}
            ></div>
            <div 
              className="bg-green-600" 
              style={{ 
                width: `${stats.total > 0 ? ((stats.byRole?.EMPLOYEE || 0) / stats.total) * 100 : 0}%` 
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  )
}
