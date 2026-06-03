'use client'

import { useState } from 'react'
import { 
  Play, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Database,
  Activity,
  Zap
} from 'lucide-react'
import { api } from '@/lib/api'

interface DiagnosticResult {
  timestamp: string
  endpoints: {
    dashboard: { success: boolean, data?: any, error?: string, responseTime: number }
    alerts: { success: boolean, data?: any, error?: string, responseTime: number }
    products: { success: boolean, data?: any, error?: string, responseTime: number }
  }
  calculations: {
    fromProducts: {
      totalProducts: number
      outOfStockProducts: number
      lowStockProducts: number
      overStockProducts: number
    }
    fromAlerts: {
      totalAlerts: number
      outOfStockAlerts: number
      lowStockAlerts: number
      overStockAlerts: number
    }
    fromDashboard: {
      totalProducts: number
      outOfStockProducts: number
      lowStockProducts: number
      activeAlerts: number
    }
  }
  inconsistencies: string[]
  recommendations: string[]
}

export function QuickStockDiagnostic() {
  const [result, setResult] = useState<DiagnosticResult | null>(null)
  const [loading, setLoading] = useState(false)

  const runQuickDiagnostic = async () => {
    setLoading(true)
    
    try {
      
      // Test des 3 endpoints principaux
      const startTime = Date.now()
      
      const [dashboardRes, alertsRes, productsRes] = await Promise.allSettled([
        api.get('/api/v1/stock/dashboard'),
        api.get('/api/v1/stock-alerts/alerts?isActive=true&limit=100'),
        api.get('/api/v1/products?limit=100')
      ])

      const endpoints = {
        dashboard: dashboardRes.status === 'fulfilled' 
          ? { 
              success: true, 
              data: dashboardRes.value.data.data,
              responseTime: Date.now() - startTime
            }
          : { 
              success: false, 
              error: dashboardRes.reason?.message || 'Erreur inconnue',
              responseTime: Date.now() - startTime
            },
        alerts: alertsRes.status === 'fulfilled'
          ? { 
              success: true, 
              data: alertsRes.value.data.data,
              responseTime: Date.now() - startTime
            }
          : { 
              success: false, 
              error: alertsRes.reason?.message || 'Erreur inconnue',
              responseTime: Date.now() - startTime
            },
        products: productsRes.status === 'fulfilled'
          ? { 
              success: true, 
              data: productsRes.value.data.data,
              responseTime: Date.now() - startTime
            }
          : { 
              success: false, 
              error: productsRes.reason?.message || 'Erreur inconnue',
              responseTime: Date.now() - startTime
            }
      }

      // Calculs basés sur les produits (source de vérité)
      let productsData = []
      if (endpoints.products.success) {
        productsData = Array.isArray(endpoints.products.data) 
          ? endpoints.products.data 
          : endpoints.products.data?.data || endpoints.products.data?.products || []
      }

      const fromProducts = {
        totalProducts: productsData.length,
        outOfStockProducts: productsData.filter((p: any) => (p.stockQuantity ?? p.stock ?? 0) === 0).length,
        lowStockProducts: productsData.filter((p: any) => {
          const stock = p.stockQuantity ?? p.stock ?? 0
          const minStock = p.minStock ?? p.min_stock ?? 0
          return stock > 0 && stock <= minStock && minStock > 0
        }).length,
        overStockProducts: productsData.filter((p: any) => {
          const stock = p.stockQuantity ?? p.stock ?? 0
          const maxStock = p.maxStock ?? p.max_stock ?? null
          return maxStock && stock > maxStock
        }).length
      }

      // Calculs basés sur les alertes
      let alertsData = []
      if (endpoints.alerts.success) {
        alertsData = Array.isArray(endpoints.alerts.data)
          ? endpoints.alerts.data
          : endpoints.alerts.data?.alerts || []
      }

      const fromAlerts = {
        totalAlerts: alertsData.length,
        outOfStockAlerts: alertsData.filter((a: any) => a.type === 'OUT_OF_STOCK').length,
        lowStockAlerts: alertsData.filter((a: any) => a.type === 'LOW_STOCK').length,
        overStockAlerts: alertsData.filter((a: any) => a.type === 'OVERSTOCK').length
      }

      // Données du dashboard
      const fromDashboard = endpoints.dashboard.success ? {
        totalProducts: endpoints.dashboard.data?.overview?.totalProducts ?? 0,
        outOfStockProducts: endpoints.dashboard.data?.overview?.outOfStockProducts ?? 0,
        lowStockProducts: endpoints.dashboard.data?.overview?.lowStockProducts ?? 0,
        activeAlerts: endpoints.dashboard.data?.activity?.activeAlerts ?? 0
      } : {
        totalProducts: 0,
        outOfStockProducts: 0,
        lowStockProducts: 0,
        activeAlerts: 0
      }

      // Détection des incohérences
      const inconsistencies: string[] = []
      const recommendations: string[] = []

      if (fromProducts.totalProducts !== fromDashboard.totalProducts) {
        inconsistencies.push(`Total produits: Produits=${fromProducts.totalProducts}, Dashboard=${fromDashboard.totalProducts}`)
      }

      if (fromProducts.outOfStockProducts !== fromDashboard.outOfStockProducts) {
        inconsistencies.push(`Ruptures: Produits=${fromProducts.outOfStockProducts}, Dashboard=${fromDashboard.outOfStockProducts}`)
      }

      if (fromProducts.lowStockProducts !== fromDashboard.lowStockProducts) {
        inconsistencies.push(`Stock faible: Produits=${fromProducts.lowStockProducts}, Dashboard=${fromDashboard.lowStockProducts}`)
      }

      if (fromAlerts.totalAlerts !== fromDashboard.activeAlerts) {
        inconsistencies.push(`Alertes actives: Alertes=${fromAlerts.totalAlerts}, Dashboard=${fromDashboard.activeAlerts}`)
      }

      if (fromProducts.outOfStockProducts !== fromAlerts.outOfStockAlerts) {
        inconsistencies.push(`Alertes rupture: Produits=${fromProducts.outOfStockProducts}, Alertes=${fromAlerts.outOfStockAlerts}`)
      }

      if (fromProducts.lowStockProducts !== fromAlerts.lowStockAlerts) {
        inconsistencies.push(`Alertes stock faible: Produits=${fromProducts.lowStockProducts}, Alertes=${fromAlerts.lowStockAlerts}`)
      }

      // Recommandations
      if (inconsistencies.length > 0) {
        recommendations.push('Utiliser les données des produits comme source de vérité')
        recommendations.push('Implémenter la logique unifiée côté frontend')
        recommendations.push('Synchroniser les données entre les différentes sources')
      }

      if (endpoints.dashboard.responseTime > 2000 || endpoints.alerts.responseTime > 2000 || endpoints.products.responseTime > 2000) {
        recommendations.push('Optimiser les performances des APIs (temps de réponse > 2s)')
      }

      const diagnosticResult: DiagnosticResult = {
        timestamp: new Date().toISOString(),
        endpoints,
        calculations: {
          fromProducts,
          fromAlerts,
          fromDashboard
        },
        inconsistencies,
        recommendations
      }

      setResult(diagnosticResult)

    } catch (error: any) {
      console.error('❌ Erreur lors du diagnostic:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-5 w-5 text-green-600" />
    ) : (
      <AlertTriangle className="h-5 w-5 text-red-600" />
    )
  }

  return (
    <div className="space-y-6">
      {/* Contrôles */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Database className="h-5 w-5 mr-2 text-blue-600" />
            Diagnostic Rapide des APIs Existantes
          </h3>
          <button
            onClick={runQuickDiagnostic}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {loading ? 'Diagnostic...' : 'Lancer le Diagnostic'}
          </button>
        </div>
        
        <p className="text-sm text-gray-600">
          Ce diagnostic teste les APIs existantes et détecte les incohérences entre les différentes sources de données.
        </p>
      </div>

      {/* Résultats */}
      {result && (
        <div className="space-y-6">
          {/* État des endpoints */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">État des APIs</h3>
            <div className="space-y-3">
              {Object.entries(result.endpoints).map(([name, endpoint]) => (
                <div key={name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center">
                    {getStatusIcon(endpoint.success)}
                    <div className="ml-3">
                      <div className="font-medium capitalize">{name}</div>
                      {!endpoint.success && (
                        <div className="text-sm text-red-600">{endpoint.error}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-600">
                      {endpoint.responseTime}ms
                    </div>
                    <div className={`text-sm font-medium ${endpoint.success ? 'text-green-600' : 'text-red-600'}`}>
                      {endpoint.success ? 'OK' : 'ERREUR'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Comparaison des données */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Comparaison des Sources</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Depuis Produits (Source de vérité)</h4>
                <div className="space-y-1 text-sm">
                  <div>Total: {result.calculations.fromProducts.totalProducts}</div>
                  <div>Ruptures: {result.calculations.fromProducts.outOfStockProducts}</div>
                  <div>Stock faible: {result.calculations.fromProducts.lowStockProducts}</div>
                  <div>Surstock: {result.calculations.fromProducts.overStockProducts}</div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Depuis Dashboard</h4>
                <div className="space-y-1 text-sm">
                  <div>Total: {result.calculations.fromDashboard.totalProducts}</div>
                  <div>Ruptures: {result.calculations.fromDashboard.outOfStockProducts}</div>
                  <div>Stock faible: {result.calculations.fromDashboard.lowStockProducts}</div>
                  <div>Alertes: {result.calculations.fromDashboard.activeAlerts}</div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Depuis Alertes</h4>
                <div className="space-y-1 text-sm">
                  <div>Total: {result.calculations.fromAlerts.totalAlerts}</div>
                  <div>Ruptures: {result.calculations.fromAlerts.outOfStockAlerts}</div>
                  <div>Stock faible: {result.calculations.fromAlerts.lowStockAlerts}</div>
                  <div>Surstock: {result.calculations.fromAlerts.overStockAlerts}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Incohérences */}
          {result.inconsistencies.length > 0 ? (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
                Incohérences Détectées ({result.inconsistencies.length})
              </h3>
              <div className="space-y-2">
                {result.inconsistencies.map((inc, index) => (
                  <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                    {inc}
                  </div>
                ))}
              </div>
              
              {result.recommendations.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-900 mb-2">Recommandations:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    {result.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-green-800 font-medium">Aucune incohérence détectée ! Toutes les données sont cohérentes.</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
