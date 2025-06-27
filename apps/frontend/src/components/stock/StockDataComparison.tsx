'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  BarChart3,
  TrendingDown,
  Package
} from 'lucide-react'
import { api } from '@/lib/api'

interface EndpointData {
  name: string
  endpoint: string
  data: any
  error?: string
  loading: boolean
  lastUpdate?: Date
}

interface ComparisonMetrics {
  totalProducts: number
  lowStockProducts: number
  outOfStockProducts: number
  overStockProducts: number
  activeAlerts: number
  totalAlerts: number
}

export function StockDataComparison() {
  const [endpoints, setEndpoints] = useState<EndpointData[]>([
    {
      name: 'Dashboard Stock',
      endpoint: '/api/v1/stock/dashboard',
      data: null,
      loading: false
    },
    {
      name: 'Alertes Stock',
      endpoint: '/api/v1/stock-alerts/alerts?isActive=true&limit=100',
      data: null,
      loading: false
    },
    {
      name: 'Produits',
      endpoint: '/api/v1/products?limit=100',
      data: null,
      loading: false
    },
    {
      name: 'Stocks (Table)',
      endpoint: '/api/v1/stock?limit=100',
      data: null,
      loading: false
    }
  ])

  const [comparison, setComparison] = useState<{
    metrics: ComparisonMetrics[]
    inconsistencies: string[]
    lastCheck: Date | null
  }>({
    metrics: [],
    inconsistencies: [],
    lastCheck: null
  })

  const fetchEndpointData = async (index: number) => {
    setEndpoints(prev => prev.map((ep, i) => 
      i === index ? { ...ep, loading: true, error: undefined } : ep
    ))

    try {
      const endpoint = endpoints[index]
      const response = await api.get(endpoint.endpoint)
      
      setEndpoints(prev => prev.map((ep, i) => 
        i === index ? { 
          ...ep, 
          data: response.data, 
          loading: false, 
          lastUpdate: new Date() 
        } : ep
      ))
    } catch (error: any) {
      setEndpoints(prev => prev.map((ep, i) => 
        i === index ? { 
          ...ep, 
          error: error.response?.data?.message || error.message, 
          loading: false 
        } : ep
      ))
    }
  }

  const fetchAllData = async () => {
    const promises = endpoints.map((_, index) => fetchEndpointData(index))
    await Promise.all(promises)
  }

  const analyzeData = () => {
    const metrics: ComparisonMetrics[] = []
    const inconsistencies: string[] = []

    endpoints.forEach((endpoint, index) => {
      if (!endpoint.data || endpoint.error) return

      let metric: ComparisonMetrics = {
        totalProducts: 0,
        lowStockProducts: 0,
        outOfStockProducts: 0,
        overStockProducts: 0,
        activeAlerts: 0,
        totalAlerts: 0
      }

      try {
        switch (endpoint.name) {
          case 'Dashboard Stock':
            if (endpoint.data.success && endpoint.data.data) {
              const data = endpoint.data.data
              metric = {
                totalProducts: data.overview?.totalProducts || 0,
                lowStockProducts: data.overview?.lowStockProducts || 0,
                outOfStockProducts: data.overview?.outOfStockProducts || 0,
                overStockProducts: data.overview?.overStockProducts || 0,
                activeAlerts: data.activity?.activeAlerts || 0,
                totalAlerts: data.activity?.activeAlerts || 0
              }
            }
            break

          case 'Alertes Stock':
            if (endpoint.data.success && Array.isArray(endpoint.data.data)) {
              const alerts = endpoint.data.data
              metric = {
                totalProducts: 0,
                lowStockProducts: alerts.filter((a: any) => a.type === 'LOW_STOCK').length,
                outOfStockProducts: alerts.filter((a: any) => a.type === 'OUT_OF_STOCK').length,
                overStockProducts: alerts.filter((a: any) => a.type === 'OVERSTOCK').length,
                activeAlerts: alerts.length,
                totalAlerts: alerts.length
              }
            }
            break

          case 'Produits':
            if (endpoint.data.success && endpoint.data.data) {
              const products = endpoint.data.data.data || endpoint.data.data || []
              const lowStock = products.filter((p: any) => 
                p.stockQuantity > 0 && 
                p.stockQuantity <= (p.minStock || 0) && 
                (p.minStock || 0) > 0
              ).length
              const outOfStock = products.filter((p: any) => p.stockQuantity === 0).length
              const overStock = products.filter((p: any) => 
                p.maxStock && p.stockQuantity > p.maxStock
              ).length

              metric = {
                totalProducts: products.length,
                lowStockProducts: lowStock,
                outOfStockProducts: outOfStock,
                overStockProducts: overStock,
                activeAlerts: lowStock + outOfStock + overStock,
                totalAlerts: lowStock + outOfStock + overStock
              }
            }
            break

          case 'Stocks (Table)':
            if (endpoint.data.success && Array.isArray(endpoint.data.data)) {
              const stocks = endpoint.data.data
              const lowStock = stocks.filter((s: any) => 
                s.quantiteActuelle > 0 && 
                s.quantiteActuelle <= (s.quantiteMinimale || 0) && 
                (s.quantiteMinimale || 0) > 0
              ).length
              const outOfStock = stocks.filter((s: any) => s.quantiteActuelle === 0).length
              const overStock = stocks.filter((s: any) => 
                s.quantiteMaximale && s.quantiteActuelle > s.quantiteMaximale
              ).length

              metric = {
                totalProducts: stocks.length,
                lowStockProducts: lowStock,
                outOfStockProducts: outOfStock,
                overStockProducts: overStock,
                activeAlerts: lowStock + outOfStock + overStock,
                totalAlerts: lowStock + outOfStock + overStock
              }
            }
            break
        }

        metrics.push(metric)
      } catch (error) {
        console.error(`Erreur analyse ${endpoint.name}:`, error)
      }
    })

    // Détecter les incohérences
    if (metrics.length >= 2) {
      const reference = metrics[0] // Dashboard comme référence
      
      metrics.slice(1).forEach((metric, index) => {
        const endpointName = endpoints[index + 1].name
        
        if (metric.lowStockProducts !== reference.lowStockProducts) {
          inconsistencies.push(
            `${endpointName}: Stock faible ${metric.lowStockProducts} vs Dashboard ${reference.lowStockProducts}`
          )
        }
        
        if (metric.outOfStockProducts !== reference.outOfStockProducts) {
          inconsistencies.push(
            `${endpointName}: Rupture ${metric.outOfStockProducts} vs Dashboard ${reference.outOfStockProducts}`
          )
        }
        
        if (metric.activeAlerts !== reference.activeAlerts && reference.activeAlerts > 0) {
          inconsistencies.push(
            `${endpointName}: Alertes ${metric.activeAlerts} vs Dashboard ${reference.activeAlerts}`
          )
        }
      })
    }

    setComparison({
      metrics,
      inconsistencies,
      lastCheck: new Date()
    })
  }

  useEffect(() => {
    const validEndpoints = endpoints.filter(ep => ep.data && !ep.error)
    if (validEndpoints.length >= 2) {
      analyzeData()
    }
  }, [endpoints])

  const getStatusColor = (hasError: boolean, loading: boolean) => {
    if (loading) return 'text-blue-500'
    if (hasError) return 'text-red-500'
    return 'text-green-500'
  }

  const getStatusIcon = (hasError: boolean, loading: boolean) => {
    if (loading) return RefreshCw
    if (hasError) return AlertTriangle
    return CheckCircle
  }

  return (
    <div className="space-y-6">
      {/* Contrôles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Comparaison des Endpoints
            </span>
            <Button onClick={fetchAllData} disabled={endpoints.some(ep => ep.loading)}>
              <RefreshCw className={`h-4 w-4 mr-1 ${endpoints.some(ep => ep.loading) ? 'animate-spin' : ''}`} />
              Tester tous
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {endpoints.map((endpoint, index) => {
              const StatusIcon = getStatusIcon(!!endpoint.error, endpoint.loading)
              return (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{endpoint.name}</h4>
                    <StatusIcon className={`h-4 w-4 ${getStatusColor(!!endpoint.error, endpoint.loading)} ${endpoint.loading ? 'animate-spin' : ''}`} />
                  </div>
                  <div className="text-xs text-gray-600 mb-2">
                    {endpoint.endpoint}
                  </div>
                  {endpoint.error ? (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                      {endpoint.error}
                    </div>
                  ) : endpoint.data ? (
                    <div className="text-xs text-green-600">
                      ✅ Données chargées
                      {endpoint.lastUpdate && (
                        <div className="text-gray-500 mt-1">
                          {endpoint.lastUpdate.toLocaleTimeString('fr-FR')}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => fetchEndpointData(index)}
                      disabled={endpoint.loading}
                    >
                      Tester
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Métriques comparées */}
      {comparison.metrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Métriques Comparées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Endpoint</th>
                    <th className="text-center p-2">Total Produits</th>
                    <th className="text-center p-2">Stock Faible</th>
                    <th className="text-center p-2">Rupture</th>
                    <th className="text-center p-2">Surstock</th>
                    <th className="text-center p-2">Alertes</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.metrics.map((metric, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2 font-medium">{endpoints[index]?.name}</td>
                      <td className="text-center p-2">{metric.totalProducts}</td>
                      <td className="text-center p-2">
                        <span className="text-orange-600">{metric.lowStockProducts}</span>
                      </td>
                      <td className="text-center p-2">
                        <span className="text-red-600">{metric.outOfStockProducts}</span>
                      </td>
                      <td className="text-center p-2">
                        <span className="text-blue-600">{metric.overStockProducts}</span>
                      </td>
                      <td className="text-center p-2">{metric.activeAlerts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Incohérences détectées */}
      {comparison.inconsistencies.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Incohérences Détectées ({comparison.inconsistencies.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {comparison.inconsistencies.map((inconsistency, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span>{inconsistency}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* État de cohérence */}
      {comparison.lastCheck && (
        <Card className={comparison.inconsistencies.length === 0 ? "border-green-200 bg-green-50" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {comparison.inconsistencies.length === 0 ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-green-800 font-medium">Données cohérentes</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <span className="text-red-800 font-medium">Incohérences détectées</span>
                  </>
                )}
              </div>
              <div className="text-sm text-gray-600">
                Dernière vérification: {comparison.lastCheck.toLocaleString('fr-FR')}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
