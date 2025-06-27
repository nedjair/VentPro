'use client'

import { useRouter } from 'next/navigation'
import { 
  AlertTriangle, 
  TrendingDown, 
  Package, 
  Activity,
  RefreshCw
} from 'lucide-react'
import { useUnifiedAlerts } from '@/hooks/useUnifiedStockData'

interface CompactStockSummaryProps {
  showTitle?: boolean
  showActions?: boolean
  variant?: 'default' | 'minimal' | 'inline'
}

export function CompactStockSummary({ 
  showTitle = true, 
  showActions = true,
  variant = 'default'
}: CompactStockSummaryProps) {
  const router = useRouter()
  const { 
    alerts, 
    loading, 
    error, 
    refresh,
    totalAlerts
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

  if (loading) {
    return (
      <div className={variant === 'inline' ? 'flex items-center gap-2' : 'bg-white rounded-lg border p-4'}>
        <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
        <span className="text-sm text-gray-600">Sync...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={variant === 'inline' ? 'flex items-center gap-2' : 'bg-white rounded-lg border p-4'}>
        <AlertTriangle className="h-4 w-4 text-red-500" />
        <span className="text-sm text-red-600">Erreur sync</span>
        <button onClick={refresh} className="text-xs text-blue-600 hover:text-blue-800">
          Retry
        </button>
      </div>
    )
  }

  // Version inline ultra-compacte
  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-3 text-sm">
        {showTitle && (
          <span className="text-gray-600 font-medium">Stock:</span>
        )}
        {alertCounts.outOfStock > 0 && (
          <div className="flex items-center gap-1 text-red-600">
            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
            <span className="font-medium">{alertCounts.outOfStock}</span>
          </div>
        )}
        {alertCounts.lowStock > 0 && (
          <div className="flex items-center gap-1 text-orange-600">
            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
            <span className="font-medium">{alertCounts.lowStock}</span>
          </div>
        )}
        {alertCounts.overStock > 0 && (
          <div className="flex items-center gap-1 text-blue-600">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <span className="font-medium">{alertCounts.overStock}</span>
          </div>
        )}
        {alertCounts.total === 0 && (
          <span className="text-green-600 text-sm">✓ OK</span>
        )}
        {showActions && alertCounts.total > 0 && (
          <button
            onClick={handleViewStockManagement}
            className="text-blue-600 hover:text-blue-800 text-xs underline"
          >
            Gérer
          </button>
        )}
      </div>
    )
  }

  // Version minimale
  if (variant === 'minimal') {
    return (
      <div className="bg-white rounded-lg border p-3">
        {showTitle && (
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900 flex items-center">
              <Activity className="h-4 w-4 mr-2 text-blue-600" />
              Alertes Stock
            </h4>
            {showActions && (
              <button
                onClick={refresh}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            {alertCounts.outOfStock > 0 && (
              <div className="text-center">
                <div className="text-lg font-bold text-red-600">{alertCounts.outOfStock}</div>
                <div className="text-xs text-red-600">Rupture</div>
              </div>
            )}
            {alertCounts.lowStock > 0 && (
              <div className="text-center">
                <div className="text-lg font-bold text-orange-600">{alertCounts.lowStock}</div>
                <div className="text-xs text-orange-600">Faible</div>
              </div>
            )}
            {alertCounts.overStock > 0 && (
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">{alertCounts.overStock}</div>
                <div className="text-xs text-blue-600">Surstock</div>
              </div>
            )}
            {alertCounts.total === 0 && (
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">0</div>
                <div className="text-xs text-green-600">Alertes</div>
              </div>
            )}
          </div>
          
          {showActions && alertCounts.total > 0 && (
            <button
              onClick={handleViewStockManagement}
              className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
            >
              Gérer
            </button>
          )}
        </div>
      </div>
    )
  }

  // Version par défaut (compacte mais complète)
  return (
    <div className="bg-white rounded-lg border">
      {showTitle && (
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900 flex items-center">
              <Activity className="h-4 w-4 mr-2 text-blue-600" />
              Alertes de Stock
              {alertCounts.total > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  {alertCounts.total}
                </span>
              )}
            </h3>
            {showActions && (
              <div className="flex items-center gap-2">
                <button
                  onClick={refresh}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
                {alertCounts.total > 0 && (
                  <button
                    onClick={handleViewStockManagement}
                    className="text-blue-600 hover:text-blue-800 text-xs"
                  >
                    Gérer
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="p-4">
        {alertCounts.total === 0 ? (
          <div className="text-center py-2">
            <div className="text-green-600 text-sm font-medium">✓ Aucune alerte</div>
            <div className="text-xs text-gray-500">Stock suffisant</div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div 
              className={`p-2 rounded cursor-pointer hover:bg-red-50 ${alertCounts.outOfStock > 0 ? 'bg-red-50' : 'opacity-50'}`}
              onClick={alertCounts.outOfStock > 0 ? handleViewStockManagement : undefined}
            >
              <AlertTriangle className={`h-5 w-5 mx-auto mb-1 ${alertCounts.outOfStock > 0 ? 'text-red-600' : 'text-gray-400'}`} />
              <div className={`text-lg font-bold ${alertCounts.outOfStock > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                {alertCounts.outOfStock}
              </div>
              <div className="text-xs text-gray-600">Rupture</div>
            </div>
            
            <div 
              className={`p-2 rounded cursor-pointer hover:bg-orange-50 ${alertCounts.lowStock > 0 ? 'bg-orange-50' : 'opacity-50'}`}
              onClick={alertCounts.lowStock > 0 ? handleViewStockManagement : undefined}
            >
              <TrendingDown className={`h-5 w-5 mx-auto mb-1 ${alertCounts.lowStock > 0 ? 'text-orange-600' : 'text-gray-400'}`} />
              <div className={`text-lg font-bold ${alertCounts.lowStock > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                {alertCounts.lowStock}
              </div>
              <div className="text-xs text-gray-600">Faible</div>
            </div>
            
            <div 
              className={`p-2 rounded cursor-pointer hover:bg-blue-50 ${alertCounts.overStock > 0 ? 'bg-blue-50' : 'opacity-50'}`}
              onClick={alertCounts.overStock > 0 ? handleViewStockManagement : undefined}
            >
              <Package className={`h-5 w-5 mx-auto mb-1 ${alertCounts.overStock > 0 ? 'text-blue-600' : 'text-gray-400'}`} />
              <div className={`text-lg font-bold ${alertCounts.overStock > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                {alertCounts.overStock}
              </div>
              <div className="text-xs text-gray-600">Surstock</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
