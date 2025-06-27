'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Wifi, 
  WifiOff,
  Bell,
  X
} from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { useUnifiedStockData } from '@/hooks/useUnifiedStockData'

interface StockSyncMonitorProps {
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left'
  showNotifications?: boolean
  autoHide?: boolean
}

interface SyncNotification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: Date
  autoHide?: boolean
}

export function StockSyncMonitor({ 
  position = 'bottom-right',
  showNotifications = true,
  autoHide = true
}: StockSyncMonitorProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [notifications, setNotifications] = useState<SyncNotification[]>([])
  const [syncHistory, setSyncHistory] = useState<Array<{
    timestamp: Date
    success: boolean
    duration: number
    changes: number
  }>>([])

  const { 
    dashboard, 
    alerts, 
    products, 
    loading, 
    error, 
    lastUpdate, 
    refresh, 
    forceRefresh 
  } = useUnifiedStockData()

  const prevDataRef = useRef<{
    alertsCount: number
    lowStockCount: number
    outOfStockCount: number
  }>({ alertsCount: 0, lowStockCount: 0, outOfStockCount: 0 })

  // Surveiller les changements de données
  useEffect(() => {
    if (!lastUpdate) return

    const currentData = {
      alertsCount: alerts.length,
      lowStockCount: dashboard.lowStockProducts,
      outOfStockCount: dashboard.outOfStockProducts
    }

    const prevData = prevDataRef.current
    let changes = 0
    let notifications: SyncNotification[] = []

    // Détecter les changements d'alertes
    if (currentData.alertsCount !== prevData.alertsCount) {
      changes++
      const diff = currentData.alertsCount - prevData.alertsCount
      notifications.push({
        id: `alerts-${Date.now()}`,
        type: diff > 0 ? 'warning' : 'success',
        title: 'Alertes mises à jour',
        message: diff > 0 
          ? `${diff} nouvelle${diff > 1 ? 's' : ''} alerte${diff > 1 ? 's' : ''}`
          : `${Math.abs(diff)} alerte${Math.abs(diff) > 1 ? 's' : ''} résolue${Math.abs(diff) > 1 ? 's' : ''}`,
        timestamp: new Date(),
        autoHide: true
      })
    }

    // Détecter les changements de stock faible
    if (currentData.lowStockCount !== prevData.lowStockCount) {
      changes++
      const diff = currentData.lowStockCount - prevData.lowStockCount
      notifications.push({
        id: `low-stock-${Date.now()}`,
        type: diff > 0 ? 'warning' : 'success',
        title: 'Stock faible',
        message: diff > 0 
          ? `${diff} produit${diff > 1 ? 's' : ''} en stock faible`
          : `${Math.abs(diff)} produit${Math.abs(diff) > 1 ? 's' : ''} réapprovisionné${Math.abs(diff) > 1 ? 's' : ''}`,
        timestamp: new Date(),
        autoHide: true
      })
    }

    // Détecter les changements de rupture
    if (currentData.outOfStockCount !== prevData.outOfStockCount) {
      changes++
      const diff = currentData.outOfStockCount - prevData.outOfStockCount
      notifications.push({
        id: `out-stock-${Date.now()}`,
        type: diff > 0 ? 'error' : 'success',
        title: 'Rupture de stock',
        message: diff > 0 
          ? `${diff} produit${diff > 1 ? 's' : ''} en rupture`
          : `${Math.abs(diff)} produit${Math.abs(diff) > 1 ? 's' : ''} réapprovisionné${Math.abs(diff) > 1 ? 's' : ''}`,
        timestamp: new Date(),
        autoHide: true
      })
    }

    // Ajouter les notifications
    if (notifications.length > 0 && showNotifications) {
      setNotifications(prev => [...notifications, ...prev].slice(0, 10))
    }

    // Ajouter à l'historique de synchronisation
    setSyncHistory(prev => [{
      timestamp: lastUpdate,
      success: !error,
      duration: 0, // À calculer si nécessaire
      changes
    }, ...prev].slice(0, 20))

    // Mettre à jour la référence
    prevDataRef.current = currentData
  }, [lastUpdate, alerts.length, dashboard.lowStockProducts, dashboard.outOfStockProducts, error, showNotifications])

  // Auto-masquer les notifications
  useEffect(() => {
    if (!autoHide) return

    const timer = setInterval(() => {
      setNotifications(prev => 
        prev.filter(notif => 
          !notif.autoHide || 
          Date.now() - notif.timestamp.getTime() < 5000
        )
      )
    }, 1000)

    return () => clearInterval(timer)
  }, [autoHide])

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4'
      case 'top-left':
        return 'top-4 left-4'
      case 'bottom-left':
        return 'bottom-4 left-4'
      default:
        return 'bottom-4 right-4'
    }
  }

  const getSyncStatus = () => {
    if (loading) return { icon: RefreshCw, color: 'text-blue-500', label: 'Synchronisation...' }
    if (error) return { icon: WifiOff, color: 'text-red-500', label: 'Erreur de sync' }
    return { icon: Wifi, color: 'text-green-500', label: 'Synchronisé' }
  }

  const status = getSyncStatus()
  const StatusIcon = status.icon

  return (
    <>
      {/* Moniteur principal */}
      <div className={`fixed ${getPositionClasses()} z-50`}>
        <div className="bg-white shadow-lg rounded-lg border">
          {/* Indicateur compact */}
          <div 
            className="flex items-center gap-2 p-3 cursor-pointer hover:bg-gray-50"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <StatusIcon className={`h-4 w-4 ${status.color} ${loading ? 'animate-spin' : ''}`} />
            <span className="text-sm font-medium">{status.label}</span>
            {dashboard.activeAlerts > 0 && (
              <Badge variant="destructive" className="text-xs">
                {dashboard.activeAlerts}
              </Badge>
            )}
          </div>

          {/* Panneau étendu */}
          {isExpanded && (
            <div className="border-t p-4 w-80">
              <div className="space-y-3">
                {/* Informations de synchronisation */}
                <div className="text-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">État de la synchronisation</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={refresh}>
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={forceRefresh}>
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-1 text-xs text-gray-600">
                    <div>Dernière MAJ: {lastUpdate ? lastUpdate.toLocaleTimeString('fr-FR') : 'Jamais'}</div>
                    <div>Produits: {products.length}</div>
                    <div>Alertes: {alerts.length}</div>
                    <div className="flex gap-2">
                      <span className="text-red-600">🔴 {dashboard.outOfStockProducts}</span>
                      <span className="text-orange-600">🟠 {dashboard.lowStockProducts}</span>
                      <span className="text-blue-600">🔵 {dashboard.overStockProducts}</span>
                    </div>
                  </div>
                </div>

                {/* Historique récent */}
                {syncHistory.length > 0 && (
                  <div className="text-sm">
                    <div className="font-medium mb-2">Historique récent</div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {syncHistory.slice(0, 5).map((sync, index) => (
                        <div key={index} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1">
                            {sync.success ? (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            ) : (
                              <AlertTriangle className="h-3 w-3 text-red-500" />
                            )}
                            <span>{sync.timestamp.toLocaleTimeString('fr-FR')}</span>
                          </div>
                          {sync.changes > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {sync.changes} changement{sync.changes > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {error && (
                  <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                    {error}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      {showNotifications && notifications.length > 0 && (
        <div className={`fixed ${position.includes('right') ? 'right-4' : 'left-4'} ${position.includes('top') ? 'top-20' : 'bottom-20'} z-40 space-y-2`}>
          {notifications.slice(0, 3).map((notification) => (
            <div
              key={notification.id}
              className="bg-white shadow-lg rounded-lg border p-3 w-80 animate-in slide-in-from-right"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  {notification.type === 'success' && <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />}
                  {notification.type === 'error' && <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />}
                  {notification.type === 'warning' && <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />}
                  {notification.type === 'info' && <Bell className="h-4 w-4 text-blue-500 mt-0.5" />}
                  <div className="flex-1">
                    <div className="font-medium text-sm">{notification.title}</div>
                    <div className="text-xs text-gray-600">{notification.message}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {notification.timestamp.toLocaleTimeString('fr-FR')}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeNotification(notification.id)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
