'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  AlertTriangle, 
  TrendingDown, 
  Package, 
  ExternalLink,
  RefreshCw
} from 'lucide-react'
import { api } from '@/lib/api'

interface Product {
  id: string
  name: string
  sku?: string
  stockQuantity: number
  minStock: number
  unit: string
  category?: {
    name: string
  }
}

interface StockAlerts {
  lowStock: Product[]
  outOfStock: Product[]
  totalAlerts: number
}

export function StockAlerts() {
  const router = useRouter()
  const [alerts, setAlerts] = useState<StockAlerts | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadStockAlerts = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get('/api/v1/stock/alerts')

      if (response.data.success) {
        const alertsData = response.data.data
        // Programmation défensive pour les arrays
        const processedAlerts = {
          lowStock: Array.isArray(alertsData.lowStock) ? alertsData.lowStock : [],
          outOfStock: Array.isArray(alertsData.outOfStock) ? alertsData.outOfStock : [],
          totalAlerts: alertsData.totalAlerts || 0
        }

        setAlerts(processedAlerts)
        setLastUpdated(new Date())
      } else {
        console.error('❌ Erreur API:', response.data)
        setError('Erreur lors du chargement des alertes')
      }
    } catch (err: any) {
      console.error('❌ Erreur lors du chargement des alertes de stock:', err)
      console.error('   Status:', err.response?.status)
      console.error('   Data:', err.response?.data)
      setError(`Erreur lors du chargement des alertes: ${err.response?.status || err.message}`)
      // Programmation défensive - initialiser avec des arrays vides
      setAlerts({
        lowStock: [],
        outOfStock: [],
        totalAlerts: 0
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStockAlerts()

    // Mise à jour automatique toutes les 30 secondes
    const interval = setInterval(loadStockAlerts, 30000)

    return () => clearInterval(interval)
  }, [])

  const handleProductClick = (productId: string) => {
    router.push(`/products/${productId}`)
  }

  const handleViewAllStocks = () => {
    router.push('/stocks')
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
            Alertes de Stock
          </h3>
        </div>
        <div className="p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
            Alertes de Stock
          </h3>
        </div>
        <div className="p-6">
          <div className="text-center text-gray-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-400" />
            <p className="text-sm">{error}</p>
            <button
              onClick={loadStockAlerts}
              className="mt-2 text-blue-600 hover:text-blue-800 text-sm flex items-center mx-auto"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Réessayer
            </button>
          </div>
        </div>
      </div>
    )
  }

  const totalAlerts = (alerts?.outOfStock?.length || 0) + (alerts?.lowStock?.length || 0)

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
            Alertes de Stock
            {totalAlerts > 0 && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                {totalAlerts}
              </span>
            )}
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadStockAlerts}
              className="text-gray-600 hover:text-gray-800 text-sm flex items-center"
              title="Actualiser les alertes"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={handleViewAllStocks}
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
            >
              Voir tout
              <ExternalLink className="h-4 w-4 ml-1" />
            </button>
          </div>
        </div>
        {lastUpdated && (
          <p className="text-xs text-gray-500 mt-1">
            Dernière mise à jour : {lastUpdated.toLocaleTimeString('fr-FR')}
          </p>
        )}
      </div>

      <div className="p-6">
        {totalAlerts === 0 ? (
          <div className="text-center text-gray-500">
            <Package className="h-8 w-8 mx-auto mb-2 text-green-400" />
            <p className="text-sm">Aucune alerte de stock</p>
            <p className="text-xs text-gray-400 mt-1">Tous les produits ont un stock suffisant</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Produits en rupture de stock */}
            {Array.isArray(alerts?.outOfStock) && alerts.outOfStock.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-red-800 mb-2 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Rupture de stock ({alerts.outOfStock.length})
                </h4>
                <div className="space-y-2">
                  {alerts.outOfStock.slice(0, 3).map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
                      onClick={() => handleProductClick(product.id)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {product.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {product.sku && `SKU: ${product.sku} • `}
                              {product.category?.name}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-red-600">
                          0 {product.unit}
                        </p>
                        <p className="text-xs text-gray-500">
                          Min: {product.minStock}
                        </p>
                      </div>
                    </div>
                  ))}
                  {alerts.outOfStock.length > 3 && (
                    <p className="text-xs text-gray-500 text-center">
                      +{alerts.outOfStock.length - 3} autre(s) produit(s) en rupture
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Produits en stock faible */}
            {Array.isArray(alerts?.lowStock) && alerts.lowStock.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-orange-800 mb-2 flex items-center">
                  <TrendingDown className="h-4 w-4 mr-1" />
                  Stock faible ({alerts.lowStock.length})
                </h4>
                <div className="space-y-2">
                  {alerts.lowStock.slice(0, 3).map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors"
                      onClick={() => handleProductClick(product.id)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {product.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {product.sku && `SKU: ${product.sku} • `}
                              {product.category?.name}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-orange-600">
                          {product.stockQuantity} {product.unit}
                        </p>
                        <p className="text-xs text-gray-500">
                          Min: {product.minStock}
                        </p>
                      </div>
                    </div>
                  ))}
                  {alerts.lowStock.length > 3 && (
                    <p className="text-xs text-gray-500 text-center">
                      +{alerts.lowStock.length - 3} autre(s) produit(s) en stock faible
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Actions rapides */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <button
                  onClick={handleViewAllStocks}
                  className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Gérer les stocks
                </button>
                <button
                  onClick={loadStockAlerts}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
