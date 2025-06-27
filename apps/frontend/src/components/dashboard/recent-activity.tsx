'use client'

import { useEffect, useState } from 'react'
import { UserPlus, CheckCircle, AlertTriangle, FileText } from 'lucide-react'
import { api } from '@/lib/api'

interface Activity {
  id: string
  type: string
  description: string
  date: string
}

// Données par défaut en cas d'erreur
const defaultActivities = [
  {
    id: '1',
    type: 'client',
    message: 'Nouveau client ajouté',
    details: 'Jean Dupont',
    time: '5 min',
    icon: UserPlus,
    color: 'blue',
  },
  {
    id: '2',
    type: 'order',
    message: 'Commande terminée',
    details: 'Commande #1234',
    time: '15 min',
    icon: CheckCircle,
    color: 'green',
  },
  {
    id: '3',
    type: 'product',
    message: 'Stock faible',
    details: 'Produit ABC',
    time: '1h',
    icon: AlertTriangle,
    color: 'orange',
  },
  {
    id: '4',
    type: 'invoice',
    message: 'Facture générée',
    details: 'Facture #5678',
    time: '2h',
    icon: FileText,
    color: 'purple',
  },
]

const colorClasses = {
  blue: 'text-blue-500',
  green: 'text-green-500',
  orange: 'text-orange-500',
  purple: 'text-purple-500',
}

export function RecentActivity() {
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadRecentActivity()
  }, [])

  const loadRecentActivity = async () => {
    try {
      console.log('🔍 Chargement de l\'activité récente...')
      // Pour l'instant, utilisons les données par défaut
      // TODO: Implémenter l'API getRecentActivity
      setActivities(defaultActivities)
      setError(null)
    } catch (err) {
      console.error('❌ Erreur lors du chargement de l\'activité récente:', err)
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
      // Utiliser les données par défaut en cas d'erreur
      setActivities(defaultActivities)
    } finally {
      setLoading(false)
    }
  }

  // Programmation défensive : s'assurer que activities est un tableau
  const safeActivities = Array.isArray(activities) ? activities : defaultActivities

  return (
    <div className="card">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Activité récente</h3>
          {loading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-700">
              Données d'activité non disponibles, affichage des données par défaut
            </p>
          </div>
        )}

        <div className="space-y-4">
          {safeActivities.length > 0 ? (
            safeActivities.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-3">
                <div className={`h-2 w-2 rounded-full bg-${activity.color}-500`} />
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-500">{activity.details} • il y a {activity.time}</p>
                </div>
                <activity.icon className={`h-4 w-4 ${colorClasses[activity.color as keyof typeof colorClasses]}`} />
              </div>
            ))
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500">Aucune activité récente</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
