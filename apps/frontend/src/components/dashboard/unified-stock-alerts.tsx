'use client'

import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  TrendingDown,
  Package,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  Activity
} from 'lucide-react'
import { useUnifiedAlerts } from '@/hooks/useUnifiedStockData'

export function UnifiedStockAlerts() {
  const router = useRouter()
  const {
    alerts,
    loading,
    error,
    refresh,
    forceRefresh,
    totalAlerts,
    criticalAlerts,
    warningAlerts,
    infoAlerts
  } = useUnifiedAlerts()

  // Calculer les compteurs par type d'alerte
  const alertCounts = {
    outOfStock: alerts.filter(a => a.type === 'OUT_OF_STOCK').length,
    lowStock: alerts.filter(a => a.type === 'LOW_STOCK').length,
    overStock: alerts.filter(a => a.type === 'OVERSTOCK').length,
    total: totalAlerts
  }

  const handleViewStockManagement = () => {
    router.push('/stocks')
  }

  const handleViewProducts = () => {
    router.push('/products')
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Activity className="h-5 w-5 mr-2 text-blue-600" />
            Alertes de Stock
          </h3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2 text-blue-600" />
            <span className="text-gray-600">Synchronisation...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
            Alertes de Stock
            <span className="ml-2 text-sm text-red-600">(Erreur de sync)</span>
          </h3>
        </div>
        <div className="p-6">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-400" />
            <p className="text-sm text-red-600 mb-3">{error}</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={refresh}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Réessayer
              </button>
              <button
                onClick={forceRefresh}
                className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Forcer
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Fonction pour obtenir l'icône et la couleur selon le type
  const getAlertConfig = (type: 'outOfStock' | 'lowStock' | 'overStock') => {
    switch (type) {
      case 'outOfStock':
        return {
          icon: AlertTriangle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          label: 'Rupture de stock',
          emoji: '🔴'
        }
      case 'lowStock':
        return {
          icon: TrendingDown,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          label: 'Stock faible',
          emoji: '🟠'
        }
      case 'overStock':
        return {
          icon: Package,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          label: 'Surstock',
          emoji: '🔵'
        }
    }
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Activity className="h-5 w-5 mr-2 text-blue-600" />
            Alertes de Stock
            {alertCounts.total > 0 && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                {alertCounts.total}
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
              title="Actualiser"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={handleViewStockManagement}
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center px-2 py-1 rounded hover:bg-blue-50"
            >
              Gérer
              <ExternalLink className="h-3 w-3 ml-1" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {alertCounts.total === 0 ? (
          <div className="text-center py-4">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-400" />
            <p className="text-sm font-medium text-gray-900">Aucune alerte de stock</p>
            <p className="text-xs text-gray-500 mt-1">Tous les produits ont un stock suffisant</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Résumé compact des alertes */}
            <div className="grid grid-cols-1 gap-3">
              {/* Rupture de stock */}
              {alertCounts.outOfStock > 0 && (
                <div
                  className={`${getAlertConfig('outOfStock').bgColor} ${getAlertConfig('outOfStock').borderColor} border rounded-lg p-4 cursor-pointer hover:shadow-sm transition-shadow`}
                  onClick={handleViewStockManagement}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <AlertTriangle className={`h-5 w-5 mr-3 ${getAlertConfig('outOfStock').color}`} />
                      <div>
                        <p className={`font-medium ${getAlertConfig('outOfStock').color}`}>
                          Rupture de stock
                        </p>
                        <p className="text-xs text-gray-600">
                          Produits sans stock disponible
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-2xl font-bold ${getAlertConfig('outOfStock').color}`}>
                        {alertCounts.outOfStock}
                      </span>
                      <p className="text-xs text-gray-500">produit{alertCounts.outOfStock > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Stock faible */}
              {alertCounts.lowStock > 0 && (
                <div
                  className={`${getAlertConfig('lowStock').bgColor} ${getAlertConfig('lowStock').borderColor} border rounded-lg p-4 cursor-pointer hover:shadow-sm transition-shadow`}
                  onClick={handleViewStockManagement}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <TrendingDown className={`h-5 w-5 mr-3 ${getAlertConfig('lowStock').color}`} />
                      <div>
                        <p className={`font-medium ${getAlertConfig('lowStock').color}`}>
                          Stock faible
                        </p>
                        <p className="text-xs text-gray-600">
                          Produits sous le seuil minimum
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-2xl font-bold ${getAlertConfig('lowStock').color}`}>
                        {alertCounts.lowStock}
                      </span>
                      <p className="text-xs text-gray-500">produit{alertCounts.lowStock > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Surstock */}
              {alertCounts.overStock > 0 && (
                <div
                  className={`${getAlertConfig('overStock').bgColor} ${getAlertConfig('overStock').borderColor} border rounded-lg p-4 cursor-pointer hover:shadow-sm transition-shadow`}
                  onClick={handleViewStockManagement}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Package className={`h-5 w-5 mr-3 ${getAlertConfig('overStock').color}`} />
                      <div>
                        <p className={`font-medium ${getAlertConfig('overStock').color}`}>
                          Surstock
                        </p>
                        <p className="text-xs text-gray-600">
                          Produits au-dessus du seuil maximum
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-2xl font-bold ${getAlertConfig('overStock').color}`}>
                        {alertCounts.overStock}
                      </span>
                      <p className="text-xs text-gray-500">produit{alertCounts.overStock > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Résumé total et actions */}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-600">
                  <Activity className="h-4 w-4 mr-2" />
                  <span>Total: <strong className="text-gray-900">{alertCounts.total}</strong> alerte{alertCounts.total > 1 ? 's' : ''} active{alertCounts.total > 1 ? 's' : ''}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleViewProducts}
                    className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
                  >
                    Voir produits
                  </button>
                  <button
                    onClick={handleViewStockManagement}
                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                  >
                    Gérer le stock
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
