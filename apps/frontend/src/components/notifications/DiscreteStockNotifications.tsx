'use client'

import { useState, useEffect } from 'react'
import {
  AlertTriangle,
  TrendingDown,
  Package,
  X,
  Bell,
  BellOff,
  RefreshCw
} from 'lucide-react'
import { useUnifiedAlerts } from '@/hooks/useUnifiedStockData'
import UserPreferencesService from '@/services/userPreferences'

interface NotificationItem {
  id: string
  type: 'info' | 'warning' | 'error'
  title: string
  message: string
  timestamp: Date
  dismissed: boolean
}

export function DiscreteStockNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isEnabled, setIsEnabled] = useState(() => {
    // Utiliser le service de préférences utilisateur
    return UserPreferencesService.areStockPopupsEnabled()
  })
  const [lastAlertCounts, setLastAlertCounts] = useState<any>(null)
  const [isTemporarilyDisabled, setIsTemporarilyDisabled] = useState(false)

  // DÉSACTIVATION PERMANENTE: Les popups sont désactivés par défaut
  // Ce composant ne s'affiche que si explicitement activé par l'utilisateur
  if (!isEnabled) {
    return null // Retour anticipé pour éviter tout rendu
  }
  
  const { 
    alerts, 
    totalAlerts,
    loading,
    error
  } = useUnifiedAlerts()

  // Calculer les compteurs actuels
  const currentCounts = {
    total: totalAlerts,
    outOfStock: alerts.filter(a => a.type === 'OUT_OF_STOCK').length,
    lowStock: alerts.filter(a => a.type === 'LOW_STOCK').length,
    overStock: alerts.filter(a => a.type === 'OVERSTOCK').length
  }

  // Écouter les événements de correction automatique et changements de paramètres
  useEffect(() => {
    const handleStockCorrection = () => {
      console.log('🔧 Correction automatique détectée - Désactivation temporaire des notifications')
      setIsTemporarilyDisabled(true)
      clearAllNotifications()

      // Réactiver après 30 secondes
      setTimeout(() => {
        setIsTemporarilyDisabled(false)
        console.log('🔔 Notifications réactivées après correction')
      }, 30000)
    }

    const handleNotificationSettingsChanged = (event: any) => {
      const { enabled } = event.detail
      setIsEnabled(enabled)
      if (!enabled) {
        clearAllNotifications()
      }
    }

    window.addEventListener('stockCorrectionExecuted', handleStockCorrection)
    window.addEventListener('notificationSettingsChanged', handleNotificationSettingsChanged)

    return () => {
      window.removeEventListener('stockCorrectionExecuted', handleStockCorrection)
      window.removeEventListener('notificationSettingsChanged', handleNotificationSettingsChanged)
    }
  }, [])

  // Détecter les changements et créer des notifications discrètes
  useEffect(() => {
    if (!isEnabled || isTemporarilyDisabled || loading || error || !lastAlertCounts) {
      if (!loading && !error && lastAlertCounts === null) {
        setLastAlertCounts(currentCounts)
      }
      return
    }

    const changes = []

    // Détecter les nouvelles ruptures de stock
    if (currentCounts.outOfStock > lastAlertCounts.outOfStock) {
      const newOutOfStock = currentCounts.outOfStock - lastAlertCounts.outOfStock
      changes.push({
        id: `out-of-stock-${Date.now()}`,
        type: 'error' as const,
        title: 'Nouvelle rupture de stock',
        message: `${newOutOfStock} produit${newOutOfStock > 1 ? 's sont' : ' est'} maintenant en rupture`,
        timestamp: new Date(),
        dismissed: false
      })
    }

    // Détecter les nouveaux stocks faibles
    if (currentCounts.lowStock > lastAlertCounts.lowStock) {
      const newLowStock = currentCounts.lowStock - lastAlertCounts.lowStock
      changes.push({
        id: `low-stock-${Date.now()}`,
        type: 'warning' as const,
        title: 'Nouveau stock faible',
        message: `${newLowStock} produit${newLowStock > 1 ? 's ont' : ' a'} un stock faible`,
        timestamp: new Date(),
        dismissed: false
      })
    }

    // Détecter les améliorations (stocks reconstitués)
    if (currentCounts.outOfStock < lastAlertCounts.outOfStock) {
      const reconstituted = lastAlertCounts.outOfStock - currentCounts.outOfStock
      changes.push({
        id: `stock-restored-${Date.now()}`,
        type: 'info' as const,
        title: 'Stock reconstitué',
        message: `${reconstituted} produit${reconstituted > 1 ? 's ont' : ' a'} été réapprovisionné${reconstituted > 1 ? 's' : ''}`,
        timestamp: new Date(),
        dismissed: false
      })
    }

    if (changes.length > 0) {
      setNotifications(prev => [...prev, ...changes])
      
      // Auto-dismiss après 10 secondes
      changes.forEach(change => {
        setTimeout(() => {
          dismissNotification(change.id)
        }, 10000)
      })
    }

    setLastAlertCounts(currentCounts)
  }, [currentCounts.total, currentCounts.outOfStock, currentCounts.lowStock, isEnabled, loading, error])

  const dismissNotification = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, dismissed: true } : notif
      )
    )
    
    // Supprimer complètement après l'animation
    setTimeout(() => {
      setNotifications(prev => prev.filter(notif => notif.id !== id))
    }, 300)
  }

  const clearAllNotifications = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, dismissed: true }))
    )
    setTimeout(() => {
      setNotifications([])
    }, 300)
  }

  const toggleNotifications = () => {
    const newState = !isEnabled
    setIsEnabled(newState)
    UserPreferencesService.toggleStockPopups(newState)

    if (!newState) {
      clearAllNotifications()
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <TrendingDown className="h-4 w-4 text-orange-500" />
      case 'info':
        return <Package className="h-4 w-4 text-blue-500" />
      default:
        return <Bell className="h-4 w-4 text-gray-500" />
    }
  }

  const getNotificationColors = (type: string) => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'warning':
        return 'bg-orange-50 border-orange-200 text-orange-800'
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  const activeNotifications = notifications.filter(n => !n.dismissed)

  if (!isEnabled) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={toggleNotifications}
          className="p-2 bg-gray-100 text-gray-600 rounded-full shadow-lg hover:bg-gray-200 transition-colors"
          title="Activer les notifications de stock"
        >
          <BellOff className="h-5 w-5" />
        </button>
      </div>
    )
  }

  if (isTemporarilyDisabled) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-3 shadow-lg max-w-sm">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <div className="text-sm">
              <div className="font-medium">Correction en cours</div>
              <div className="text-xs opacity-75">Notifications temporairement désactivées</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {/* Bouton de contrôle */}
      <div className="flex justify-end">
        <div className="flex items-center gap-2">
          {activeNotifications.length > 1 && (
            <button
              onClick={clearAllNotifications}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded bg-white shadow-sm border"
            >
              Tout effacer
            </button>
          )}
          <button
            onClick={toggleNotifications}
            className="p-2 bg-white text-gray-600 rounded-full shadow-lg hover:bg-gray-50 transition-colors border"
            title="Désactiver les notifications de stock"
          >
            <Bell className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="space-y-2 max-w-sm">
        {activeNotifications.slice(-3).map((notification) => (
          <div
            key={notification.id}
            className={`
              ${getNotificationColors(notification.type)}
              border rounded-lg p-3 shadow-lg
              transform transition-all duration-300 ease-in-out
              ${notification.dismissed ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
            `}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2 flex-1">
                {getNotificationIcon(notification.type)}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">
                    {notification.title}
                  </div>
                  <div className="text-xs mt-1 opacity-90">
                    {notification.message}
                  </div>
                  <div className="text-xs mt-1 opacity-75">
                    {notification.timestamp.toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
              <button
                onClick={() => dismissNotification(notification.id)}
                className="ml-2 text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Indicateur de notifications supplémentaires */}
      {activeNotifications.length > 3 && (
        <div className="text-center">
          <div className="inline-flex items-center px-2 py-1 bg-white border rounded-full shadow-sm text-xs text-gray-600">
            +{activeNotifications.length - 3} notification{activeNotifications.length - 3 > 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  )
}
