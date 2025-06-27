'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { 
  AlertTriangle, 
  CheckCircle, 
  X, 
  Eye, 
  EyeOff,
  RefreshCw,
  Filter,
  Package,
  Clock
} from 'lucide-react'
import { useStockAlerts, StockAlert } from '../../hooks/useRealTimeStock'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

interface StockAlertsProps {
  showFilters?: boolean
  maxHeight?: string
}

export function StockAlerts({ showFilters = true, maxHeight = "600px" }: StockAlertsProps) {
  const { 
    alerts, 
    loading, 
    error, 
    pagination,
    fetchAlerts, 
    markAsRead, 
    resolveAlert, 
    deleteAlert,
    checkAlerts 
  } = useStockAlerts()

  const [filters, setFilters] = useState({
    type: '',
    severity: '',
    isRead: undefined as boolean | undefined,
    isActive: true,
  })

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    fetchAlerts(newFilters)
  }

  const getAlertIcon = (type: StockAlert['type']) => {
    switch (type) {
      case 'OUT_OF_STOCK':
        return <Package className="h-4 w-4" />
      case 'LOW_STOCK':
        return <AlertTriangle className="h-4 w-4" />
      case 'OVERSTOCK':
        return <Package className="h-4 w-4" />
      case 'NEGATIVE_STOCK':
        return <X className="h-4 w-4" />
      case 'EXPIRY_WARNING':
        return <Clock className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  const getAlertColor = (severity: StockAlert['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'HIGH':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'LOW':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getSeverityBadge = (severity: StockAlert['severity']) => {
    const variants = {
      CRITICAL: 'destructive',
      HIGH: 'secondary',
      MEDIUM: 'outline',
      LOW: 'outline'
    } as const

    return (
      <Badge variant={variants[severity] || 'outline'} className="text-xs">
        {severity === 'CRITICAL' ? 'Critique' :
         severity === 'HIGH' ? 'Élevé' :
         severity === 'MEDIUM' ? 'Moyen' : 'Faible'}
      </Badge>
    )
  }

  const getTypeLabel = (type: StockAlert['type']) => {
    switch (type) {
      case 'OUT_OF_STOCK':
        return 'Rupture de stock'
      case 'LOW_STOCK':
        return 'Stock faible'
      case 'OVERSTOCK':
        return 'Surstock'
      case 'NEGATIVE_STOCK':
        return 'Stock négatif'
      case 'EXPIRY_WARNING':
        return 'Expiration proche'
      default:
        return type
    }
  }

  if (loading && alerts.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Chargement des alertes...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Alertes de Stock ({alerts.length})
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={checkAlerts}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Vérifier
            </Button>
            <Button variant="outline" size="sm" onClick={() => fetchAlerts(filters)}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filtres */}
        {showFilters && (
          <div className="flex flex-wrap gap-2 pt-4">
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="px-3 py-1 border rounded-md text-sm"
            >
              <option value="">Tous les types</option>
              <option value="OUT_OF_STOCK">Rupture de stock</option>
              <option value="LOW_STOCK">Stock faible</option>
              <option value="OVERSTOCK">Surstock</option>
              <option value="NEGATIVE_STOCK">Stock négatif</option>
              <option value="EXPIRY_WARNING">Expiration proche</option>
            </select>

            <select
              value={filters.severity}
              onChange={(e) => handleFilterChange('severity', e.target.value)}
              className="px-3 py-1 border rounded-md text-sm"
            >
              <option value="">Toutes les priorités</option>
              <option value="CRITICAL">Critique</option>
              <option value="HIGH">Élevé</option>
              <option value="MEDIUM">Moyen</option>
              <option value="LOW">Faible</option>
            </select>

            <select
              value={filters.isRead === undefined ? '' : filters.isRead.toString()}
              onChange={(e) => handleFilterChange('isRead', 
                e.target.value === '' ? undefined : e.target.value === 'true'
              )}
              className="px-3 py-1 border rounded-md text-sm"
            >
              <option value="">Toutes</option>
              <option value="false">Non lues</option>
              <option value="true">Lues</option>
            </select>

            <select
              value={filters.isActive.toString()}
              onChange={(e) => handleFilterChange('isActive', e.target.value === 'true')}
              className="px-3 py-1 border rounded-md text-sm"
            >
              <option value="true">Actives</option>
              <option value="false">Résolues</option>
            </select>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {error && (
          <div className="flex items-center text-red-600 mb-4">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <span>{error}</span>
          </div>
        )}

        <div 
          className="space-y-3 overflow-y-auto"
          style={{ maxHeight }}
        >
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p>Aucune alerte de stock</p>
              <p className="text-sm">Tous vos stocks sont dans les seuils normaux</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border transition-all ${
                  getAlertColor(alert.severity)
                } ${!alert.isRead ? 'border-l-4' : ''} ${
                  !alert.isActive ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="mt-1">
                      {getAlertIcon(alert.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">{alert.title}</h4>
                        {getSeverityBadge(alert.severity)}
                        {!alert.isRead && (
                          <Badge variant="outline" className="text-xs">
                            Nouveau
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-700 mb-2">{alert.message}</p>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <span>{getTypeLabel(alert.type)}</span>
                        <span>•</span>
                        <span>{alert.product.name}</span>
                        {alert.product.sku && (
                          <>
                            <span>•</span>
                            <span>{alert.product.sku}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>
                          {formatDistanceToNow(new Date(alert.createdAt), { 
                            addSuffix: true, 
                            locale: fr 
                          })}
                        </span>
                      </div>

                      {alert.currentStock !== undefined && alert.thresholdValue !== undefined && (
                        <div className="mt-2 text-xs">
                          <span className="font-medium">Stock actuel: {alert.currentStock}</span>
                          <span className="text-gray-600 ml-2">
                            (Seuil: {alert.thresholdValue})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 ml-2">
                    {!alert.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(alert.id)}
                        title="Marquer comme lu"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {alert.isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => resolveAlert(alert.id)}
                        title="Résoudre"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteAlert(alert.id)}
                      title="Supprimer"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="text-sm text-gray-600">
              Page {pagination.page} sur {pagination.totalPages} 
              ({pagination.total} alertes)
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => fetchAlerts({ ...filters, page: pagination.page - 1 })}
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchAlerts({ ...filters, page: pagination.page + 1 })}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
