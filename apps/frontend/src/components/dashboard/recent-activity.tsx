'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle, CreditCard, FileText, Package2, ShoppingCart, UserPlus } from 'lucide-react'
import { api } from '@/lib/api'

interface ActivityItem {
  id: string
  type: string
  title: string
  description: string
  timestamp: string
}

const iconByType: Record<string, typeof UserPlus> = {
  CLIENT: UserPlus,
  ORDER: ShoppingCart,
  INVOICE: FileText,
  PAYMENT: CreditCard,
  PURCHASE: Package2,
  DELIVERY: CheckCircle,
}

const toneByType: Record<string, string> = {
  CLIENT: 'bg-blue-500 text-blue-500',
  ORDER: 'bg-emerald-500 text-emerald-500',
  INVOICE: 'bg-violet-500 text-violet-500',
  PAYMENT: 'bg-amber-500 text-amber-500',
  PURCHASE: 'bg-cyan-500 text-cyan-500',
  DELIVERY: 'bg-lime-500 text-lime-500',
}

function formatRelativeTime(timestamp: string): string {
  const diffMs = Date.now() - new Date(timestamp).getTime()
  const diffMinutes = Math.max(Math.floor(diffMs / 60000), 0)

  if (diffMinutes < 60) {
    return `${diffMinutes} min`
  }

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return `${diffHours} h`
  }

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} j`
}

export function RecentActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadRecentActivity = useCallback(async () => {
    try {
      const response = await api.getDashboardActivity(8)

      if (response.success && Array.isArray(response.data)) {
        setActivities(response.data)
        setError(null)
        return
      }

      throw new Error('Activité récente non disponible')
    } catch (err) {
      console.error('❌ Erreur lors du chargement de l\'activité récente:', err)
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
      setActivities([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRecentActivity()
  }, [loadRecentActivity])

  const safeActivities = Array.isArray(activities) ? activities : []

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
              Les données d'activité n'ont pas pu être chargées. Le widget reste vide pour éviter d'afficher de faux événements.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {safeActivities.length > 0 ? (
            safeActivities.map((activity) => {
              const Icon = iconByType[activity.type] || FileText
              const tone = toneByType[activity.type] || 'bg-slate-500 text-slate-500'

              return (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`h-2 w-2 rounded-full ${tone.split(' ')[0]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.title}</p>
                    <p className="text-xs text-gray-500">{activity.description} • il y a {formatRelativeTime(activity.timestamp)}</p>
                  </div>
                  <Icon className={`h-4 w-4 ${tone.split(' ')[1]}`} />
                </div>
              )
            })
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

