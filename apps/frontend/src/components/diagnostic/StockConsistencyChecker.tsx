'use client'

import { useState, useEffect } from 'react'
import { 
  Play, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Database,
  Activity,
  TrendingUp,
  TrendingDown,
  Package
} from 'lucide-react'
import { useUnifiedStockData } from '@/hooks/useUnifiedStockData'
import { api } from '@/lib/api'

interface ConsistencyReport {
  timestamp: string
  endpoints: {
    dashboard: { success: boolean, data?: any, error?: string }
    alerts: { success: boolean, data?: any, error?: string }
    products: { success: boolean, data?: any, error?: string }
  }
  calculations: {
    totalProducts: number
    outOfStockProducts: number
    lowStockProducts: number
    overStockProducts: number
    totalAlerts: number
  }
  inconsistencies: {
    field: string
    expected: any
    actual: any
    source: string
  }[]
  summary: {
    totalIssues: number
    isConsistent: boolean
  }
}

export function StockConsistencyChecker() {
  const [report, setReport] = useState<ConsistencyReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [autoCheck, setAutoCheck] = useState(false)
  
  const { 
    dashboard, 
    alerts, 
    products, 
    loading: unifiedLoading, 
    error: unifiedError,
    refresh: refreshUnified
  } = useUnifiedStockData()

  const runConsistencyCheck = async () => {
    setLoading(true)
    
    try {
      console.log('🔍 Démarrage du contrôle de cohérence...')
      
      // 1. Appel direct des endpoints pour comparaison
      const [dashboardRes, alertsRes, productsRes] = await Promise.allSettled([
        api.get('/api/v1/stock/dashboard'),
        api.get('/api/v1/stock-alerts/alerts?isActive=true&limit=100'),
        api.get('/api/v1/products?limit=100')
      ])

      const endpoints = {
        dashboard: dashboardRes.status === 'fulfilled' 
          ? { success: true, data: dashboardRes.value.data.data }
          : { success: false, error: dashboardRes.reason?.message },
        alerts: alertsRes.status === 'fulfilled'
          ? { success: true, data: alertsRes.value.data.data }
          : { success: false, error: alertsRes.reason?.message },
        products: productsRes.status === 'fulfilled'
          ? { success: true, data: productsRes.value.data.data }
          : { success: false, error: productsRes.reason?.message }
      }

      // 2. Calculs basés sur les données des produits
      let productsData = []
      if (endpoints.products.success) {
        productsData = Array.isArray(endpoints.products.data) 
          ? endpoints.products.data 
          : endpoints.products.data?.data || endpoints.products.data?.products || []
      }

      let alertsData = []
      if (endpoints.alerts.success) {
        alertsData = Array.isArray(endpoints.alerts.data)
          ? endpoints.alerts.data
          : endpoints.alerts.data?.alerts || []
      }

      const calculations = {
        totalProducts: productsData.length,
        outOfStockProducts: productsData.filter(p => (p.stockQuantity ?? p.stock ?? 0) === 0).length,
        lowStockProducts: productsData.filter(p => {
          const stock = p.stockQuantity ?? p.stock ?? 0
          const minStock = p.minStock ?? p.min_stock ?? 0
          return stock > 0 && stock <= minStock && minStock > 0
        }).length,
        overStockProducts: productsData.filter(p => {
          const stock = p.stockQuantity ?? p.stock ?? 0
          const maxStock = p.maxStock ?? p.max_stock ?? null
          return maxStock && stock > maxStock
        }).length,
        totalAlerts: alertsData.length
      }

      // 3. Détection des incohérences
      const inconsistencies: any[] = []

      // Comparaison avec le dashboard
      if (endpoints.dashboard.success) {
        const dashData = endpoints.dashboard.data
        const dashTotal = dashData.overview?.totalProducts ?? dashData.totalProducts ?? 0
        const dashOutOfStock = dashData.overview?.outOfStockProducts ?? dashData.outOfStockProducts ?? 0
        const dashLowStock = dashData.overview?.lowStockProducts ?? dashData.lowStockProducts ?? 0
        const dashActiveAlerts = dashData.activity?.activeAlerts ?? dashData.activeAlerts ?? 0

        if (dashTotal !== calculations.totalProducts) {
          inconsistencies.push({
            field: 'Total produits',
            expected: calculations.totalProducts,
            actual: dashTotal,
            source: 'Dashboard vs Produits'
          })
        }

        if (dashOutOfStock !== calculations.outOfStockProducts) {
          inconsistencies.push({
            field: 'Produits en rupture',
            expected: calculations.outOfStockProducts,
            actual: dashOutOfStock,
            source: 'Dashboard vs Produits'
          })
        }

        if (dashLowStock !== calculations.lowStockProducts) {
          inconsistencies.push({
            field: 'Produits en stock faible',
            expected: calculations.lowStockProducts,
            actual: dashLowStock,
            source: 'Dashboard vs Produits'
          })
        }

        if (dashActiveAlerts !== calculations.totalAlerts) {
          inconsistencies.push({
            field: 'Alertes actives',
            expected: calculations.totalAlerts,
            actual: dashActiveAlerts,
            source: 'Dashboard vs Alertes'
          })
        }
      }

      // Comparaison avec les données unifiées
      if (dashboard && !unifiedLoading && !unifiedError) {
        if (dashboard.totalProducts !== calculations.totalProducts) {
          inconsistencies.push({
            field: 'Total produits (Hook unifié)',
            expected: calculations.totalProducts,
            actual: dashboard.totalProducts,
            source: 'Hook unifié vs Produits'
          })
        }

        if (dashboard.outOfStockProducts !== calculations.outOfStockProducts) {
          inconsistencies.push({
            field: 'Rupture de stock (Hook unifié)',
            expected: calculations.outOfStockProducts,
            actual: dashboard.outOfStockProducts,
            source: 'Hook unifié vs Produits'
          })
        }

        if (dashboard.lowStockProducts !== calculations.lowStockProducts) {
          inconsistencies.push({
            field: 'Stock faible (Hook unifié)',
            expected: calculations.lowStockProducts,
            actual: dashboard.lowStockProducts,
            source: 'Hook unifié vs Produits'
          })
        }

        if (dashboard.activeAlerts !== calculations.totalAlerts) {
          inconsistencies.push({
            field: 'Alertes actives (Hook unifié)',
            expected: calculations.totalAlerts,
            actual: dashboard.activeAlerts,
            source: 'Hook unifié vs Alertes'
          })
        }
      }

      // 4. Génération du rapport
      const newReport: ConsistencyReport = {
        timestamp: new Date().toISOString(),
        endpoints,
        calculations,
        inconsistencies,
        summary: {
          totalIssues: inconsistencies.length,
          isConsistent: inconsistencies.length === 0
        }
      }

      setReport(newReport)
      
      console.log('✅ Contrôle de cohérence terminé:', newReport)

    } catch (error: any) {
      console.error('❌ Erreur lors du contrôle:', error)
    } finally {
      setLoading(false)
    }
  }

  // Auto-check toutes les 30 secondes si activé
  useEffect(() => {
    if (!autoCheck) return

    const interval = setInterval(() => {
      if (!loading) {
        runConsistencyCheck()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [autoCheck, loading])

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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Database className="h-5 w-5 mr-2 text-blue-600" />
            Contrôle de Cohérence des Données
          </h3>
          <div className="flex items-center gap-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={autoCheck}
                onChange={(e) => setAutoCheck(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-600">Auto-check (30s)</span>
            </label>
            <button
              onClick={runConsistencyCheck}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Vérification...' : 'Vérifier la Cohérence'}
            </button>
          </div>
        </div>

        {/* État du hook unifié */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">État du Hook Unifié</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center">
              {unifiedLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin text-blue-600" />
              ) : unifiedError ? (
                <AlertTriangle className="h-4 w-4 mr-2 text-red-600" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
              )}
              <span className={unifiedError ? 'text-red-600' : 'text-gray-700'}>
                {unifiedLoading ? 'Chargement...' : unifiedError ? 'Erreur' : 'OK'}
              </span>
            </div>
            <div className="text-gray-600">
              Produits: {dashboard?.totalProducts ?? 'N/A'}
            </div>
            <div className="text-gray-600">
              Alertes: {dashboard?.activeAlerts ?? 'N/A'}
            </div>
            <div className="text-gray-600">
              Ruptures: {dashboard?.outOfStockProducts ?? 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Rapport */}
      {report && (
        <div className="space-y-6">
          {/* Résumé */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Résumé du Contrôle</h3>
              <div className="flex items-center">
                {report.summary.isConsistent ? (
                  <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-red-600 mr-2" />
                )}
                <span className={`font-medium ${report.summary.isConsistent ? 'text-green-600' : 'text-red-600'}`}>
                  {report.summary.isConsistent ? 'COHÉRENT' : `${report.summary.totalIssues} PROBLÈME(S)`}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{report.calculations.totalProducts}</div>
                <div className="text-sm text-blue-600">Produits</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{report.calculations.outOfStockProducts}</div>
                <div className="text-sm text-red-600">Ruptures</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{report.calculations.lowStockProducts}</div>
                <div className="text-sm text-orange-600">Stock faible</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{report.calculations.totalAlerts}</div>
                <div className="text-sm text-purple-600">Alertes</div>
              </div>
            </div>
          </div>

          {/* État des endpoints */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">État des Endpoints</h3>
            <div className="space-y-3">
              {Object.entries(report.endpoints).map(([name, endpoint]) => (
                <div key={name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center">
                    {getStatusIcon(endpoint.success)}
                    <span className="ml-3 font-medium capitalize">{name}</span>
                  </div>
                  <div className={`text-sm font-medium ${getStatusColor(endpoint.success)}`}>
                    {endpoint.success ? 'OK' : endpoint.error || 'ERREUR'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Incohérences */}
          {report.inconsistencies.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
                Incohérences Détectées
              </h3>
              <div className="space-y-4">
                {report.inconsistencies.map((inc, index) => (
                  <div key={index} className="border-l-4 border-red-400 pl-4 py-2">
                    <div className="font-medium text-gray-900">{inc.field}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      <span className="font-medium">Attendu:</span> {inc.expected} | 
                      <span className="font-medium"> Actuel:</span> {inc.actual} | 
                      <span className="font-medium"> Source:</span> {inc.source}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
