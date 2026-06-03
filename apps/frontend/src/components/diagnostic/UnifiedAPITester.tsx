'use client'

import { useState } from 'react'
import { 
  Play, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Database,
  Zap,
  Activity
} from 'lucide-react'
import { api } from '@/lib/api'

interface APITestResult {
  endpoint: string
  success: boolean
  data?: any
  error?: string
  responseTime: number
  timestamp: string
}

interface UnifiedComparison {
  dashboard: {
    unified: {
      totalProducts?: number
      outOfStock?: number
      lowStock?: number
      activeAlerts?: number
    }
    legacy: {
      totalProducts?: number
      outOfStock?: number
      lowStock?: number
      activeAlerts?: number
    }
  }
  alerts: {
    unified: {
      total?: number
      outOfStock?: number
      lowStock?: number
      overStock?: number
    }
    legacy: {
      total?: number
      outOfStock?: number
      lowStock?: number
      overStock?: number
    }
  }
  inconsistencies: string[]
}

export function UnifiedAPITester() {
  const [results, setResults] = useState<APITestResult[]>([])
  const [loading, setLoading] = useState(false)
  const [comparison, setComparison] = useState<UnifiedComparison | null>(null)

  const testEndpoint = async (name: string, url: string): Promise<APITestResult> => {
    const startTime = Date.now()
    const timestamp = new Date().toISOString()

    try {
      const response = await api.get(url)
      const responseTime = Date.now() - startTime

      return {
        endpoint: name,
        success: response.data.success,
        data: response.data.data,
        responseTime,
        timestamp
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime
      return {
        endpoint: name,
        success: false,
        error: error.response?.data?.message || error.message,
        responseTime,
        timestamp
      }
    }
  }

  const runUnifiedAPITests = async () => {
    setLoading(true)
    setResults([])
    setComparison(null)

    try {

      // Test des nouvelles APIs unifiées
      const unifiedTests = await Promise.all([
        testEndpoint('Unified Dashboard', '/api/v1/stock-alerts/unified/dashboard'),
        testEndpoint('Unified Alerts', '/api/v1/stock-alerts/unified/alerts?limit=50'),
        testEndpoint('Unified Counts', '/api/v1/stock-alerts/unified/counts'),
        testEndpoint('Unified Diagnostic', '/api/v1/stock-alerts/unified/diagnostic'),
      ])

      // Test des anciennes APIs pour comparaison
      const legacyTests = await Promise.all([
        testEndpoint('Legacy Dashboard', '/api/v1/stock/dashboard'),
        testEndpoint('Legacy Alerts', '/api/v1/stock-alerts/alerts?isActive=true&limit=50'),
        testEndpoint('Products', '/api/v1/products?limit=50'),
      ])

      const allResults = [...unifiedTests, ...legacyTests]
      setResults(allResults)

      // Analyse comparative
      const unifiedDashboard = unifiedTests.find(r => r.endpoint === 'Unified Dashboard')
      const legacyDashboard = legacyTests.find(r => r.endpoint === 'Legacy Dashboard')
      const unifiedAlerts = unifiedTests.find(r => r.endpoint === 'Unified Alerts')
      const legacyAlerts = legacyTests.find(r => r.endpoint === 'Legacy Alerts')
      const unifiedCounts = unifiedTests.find(r => r.endpoint === 'Unified Counts')

      if (unifiedDashboard?.success && legacyDashboard?.success && unifiedCounts?.success) {
        const comparison: UnifiedComparison = {
          dashboard: {
            unified: {
              totalProducts: unifiedDashboard.data.overview?.totalProducts,
              outOfStock: unifiedDashboard.data.overview?.outOfStockProducts,
              lowStock: unifiedDashboard.data.overview?.lowStockProducts,
              activeAlerts: unifiedDashboard.data.activity?.activeAlerts,
            },
            legacy: {
              totalProducts: legacyDashboard.data.overview?.totalProducts,
              outOfStock: legacyDashboard.data.overview?.outOfStockProducts,
              lowStock: legacyDashboard.data.overview?.lowStockProducts,
              activeAlerts: legacyDashboard.data.activity?.activeAlerts,
            }
          },
          alerts: {
            unified: {
              total: unifiedCounts.data.total,
              outOfStock: unifiedCounts.data.outOfStock,
              lowStock: unifiedCounts.data.lowStock,
              overStock: unifiedCounts.data.overStock,
            },
            legacy: {
              total: Array.isArray(legacyAlerts?.data) ? legacyAlerts.data.length : 0,
              outOfStock: Array.isArray(legacyAlerts?.data) ? legacyAlerts.data.filter((a: any) => a.type === 'OUT_OF_STOCK').length : 0,
              lowStock: Array.isArray(legacyAlerts?.data) ? legacyAlerts.data.filter((a: any) => a.type === 'LOW_STOCK').length : 0,
              overStock: Array.isArray(legacyAlerts?.data) ? legacyAlerts.data.filter((a: any) => a.type === 'OVERSTOCK').length : 0,
            }
          },
          inconsistencies: []
        }

        // Détecter les incohérences
        const dashInconsistencies: string[] = []
        if (comparison.dashboard.unified.totalProducts !== comparison.dashboard.legacy.totalProducts) {
          dashInconsistencies.push('Total produits différent')
        }
        if (comparison.dashboard.unified.outOfStock !== comparison.dashboard.legacy.outOfStock) {
          dashInconsistencies.push('Ruptures de stock différentes')
        }
        if (comparison.dashboard.unified.lowStock !== comparison.dashboard.legacy.lowStock) {
          dashInconsistencies.push('Stock faible différent')
        }
        if (comparison.dashboard.unified.activeAlerts !== comparison.dashboard.legacy.activeAlerts) {
          dashInconsistencies.push('Alertes actives différentes')
        }

        const alertInconsistencies: string[] = []
        if (comparison.alerts.unified.total !== comparison.alerts.legacy.total) {
          alertInconsistencies.push('Total alertes différent')
        }
        if (comparison.alerts.unified.outOfStock !== comparison.alerts.legacy.outOfStock) {
          alertInconsistencies.push('Alertes rupture différentes')
        }
        if (comparison.alerts.unified.lowStock !== comparison.alerts.legacy.lowStock) {
          alertInconsistencies.push('Alertes stock faible différentes')
        }

        comparison.inconsistencies = [...dashInconsistencies, ...alertInconsistencies]
        setComparison(comparison)
      }

    } catch (error: any) {
      console.error('❌ Erreur lors des tests:', error)
    } finally {
      setLoading(false)
    }
  }

  const syncUnifiedAlerts = async () => {
    try {
      const response = await api.post('/api/v1/stock-alerts/unified/sync')
      
      // Relancer les tests après synchronisation
      await runUnifiedAPITests()
    } catch (error: any) {
      console.error('❌ Erreur lors de la synchronisation:', error)
    }
  }

  const forceRefresh = async () => {
    try {
      const response = await api.post('/api/v1/stock-alerts/unified/refresh')
      
      // Relancer les tests après rafraîchissement
      await runUnifiedAPITests()
    } catch (error: any) {
      console.error('❌ Erreur lors du rafraîchissement:', error)
    }
  }

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-5 w-5 text-green-600" />
    ) : (
      <AlertTriangle className="h-5 w-5 text-red-600" />
    )
  }

  const getStatusColor = (success: boolean) => {
    return success ? 'text-green-600' : 'text-red-600'
  }

  return (
    <div className="space-y-6">
      {/* Contrôles */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Database className="h-5 w-5 mr-2 text-blue-600" />
          Test des APIs Unifiées
        </h3>
        
        <div className="flex gap-3">
          <button
            onClick={runUnifiedAPITests}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {loading ? 'Test en cours...' : 'Tester les APIs'}
          </button>
          
          <button
            onClick={syncUnifiedAlerts}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Synchroniser
          </button>
          
          <button
            onClick={forceRefresh}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            <Zap className="h-4 w-4 mr-2" />
            Rafraîchir
          </button>
        </div>
      </div>

      {/* Résultats des tests */}
      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Résultats des Tests</h3>
          
          <div className="space-y-3">
            {results.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center">
                  {getStatusIcon(result.success)}
                  <div className="ml-3">
                    <div className="font-medium text-gray-900">{result.endpoint}</div>
                    {!result.success && (
                      <div className="text-sm text-red-600">{result.error}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-600">
                    {result.responseTime}ms
                  </div>
                  <div className={`text-sm font-medium ${getStatusColor(result.success)}`}>
                    {result.success ? 'OK' : 'ERREUR'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparaison */}
      {comparison && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Activity className="h-5 w-5 mr-2 text-blue-600" />
            Comparaison Unified vs Legacy
          </h3>
          
          {comparison.inconsistencies.length === 0 ? (
            <div className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-green-800 font-medium">Toutes les données sont cohérentes !</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                <span className="text-red-800 font-medium">
                  {comparison.inconsistencies.length} incohérence(s) détectée(s)
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">API Unifiée</h4>
                  <div className="space-y-1 text-sm">
                    <div>Produits: {comparison.dashboard.unified.totalProducts}</div>
                    <div>Ruptures: {comparison.dashboard.unified.outOfStock}</div>
                    <div>Stock faible: {comparison.dashboard.unified.lowStock}</div>
                    <div>Alertes: {comparison.dashboard.unified.activeAlerts}</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">API Legacy</h4>
                  <div className="space-y-1 text-sm">
                    <div>Produits: {comparison.dashboard.legacy.totalProducts}</div>
                    <div>Ruptures: {comparison.dashboard.legacy.outOfStock}</div>
                    <div>Stock faible: {comparison.dashboard.legacy.lowStock}</div>
                    <div>Alertes: {comparison.dashboard.legacy.activeAlerts}</div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Incohérences:</h4>
                <ul className="list-disc list-inside text-sm text-red-600">
                  {comparison.inconsistencies.map((inc: string, index: number) => (
                    <li key={index}>{inc}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
