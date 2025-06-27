'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { UnifiedStockAlerts } from '@/components/dashboard/unified-stock-alerts'
import { UnifiedStockDashboard } from '@/components/stock/UnifiedStockDashboard'
import { UnifiedProductsList } from '@/components/stock/UnifiedProductsList'
import { StockDataComparison } from '@/components/stock/StockDataComparison'
import { SyncTestDashboard } from '@/components/stock/SyncTestDashboard'
import { useUnifiedStockData } from '@/hooks/useUnifiedStockData'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RefreshCw, CheckCircle, AlertTriangle, Activity } from 'lucide-react'
import { api } from '@/lib/api'

export default function TestUnifiedStockPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'alerts' | 'products' | 'diagnostic' | 'comparison' | 'testing'>('diagnostic')
  const [diagnosticData, setDiagnosticData] = useState<any>(null)
  const [diagnosticLoading, setDiagnosticLoading] = useState(false)

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

  // Fonction de diagnostic
  const runDiagnostic = async () => {
    setDiagnosticLoading(true)
    try {
      const [dashboardRes, alertsRes, productsRes] = await Promise.allSettled([
        api.get('/api/v1/stock/dashboard'),
        api.get('/api/v1/stock-alerts/alerts?isActive=true&limit=100'),
        api.get('/api/v1/products?limit=100')
      ])

      const diagnostic = {
        timestamp: new Date().toISOString(),
        dashboard: dashboardRes.status === 'fulfilled' ? dashboardRes.value.data : { error: dashboardRes.reason?.message },
        alerts: alertsRes.status === 'fulfilled' ? alertsRes.value.data : { error: alertsRes.reason?.message },
        products: productsRes.status === 'fulfilled' ? productsRes.value.data : { error: productsRes.reason?.message }
      }

      setDiagnosticData(diagnostic)
    } catch (error) {
      console.error('Erreur diagnostic:', error)
    } finally {
      setDiagnosticLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'diagnostic') {
      runDiagnostic()
    }
  }, [activeTab])

  const tabs = [
    { id: 'diagnostic', label: 'Diagnostic', count: 0 },
    { id: 'comparison', label: 'Comparaison', count: 0 },
    { id: 'testing', label: 'Tests Auto', count: 0 },
    { id: 'dashboard', label: 'Dashboard', count: dashboard.activeAlerts },
    { id: 'alerts', label: 'Alertes', count: alerts.length },
    { id: 'products', label: 'Produits', count: products.length }
  ]

  return (
    <MainLayout 
      title="Test Stock Unifié" 
      subtitle="Vérification de la synchronisation des données de stock"
    >
      <div className="space-y-6">
        {/* Informations de synchronisation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                {error ? (
                  <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                ) : (
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                )}
                État de la synchronisation
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Actualiser
                </Button>
                <Button variant="outline" size="sm" onClick={forceRefresh} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Forcer
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{dashboard.totalProducts}</div>
                <div className="text-sm text-gray-600">Produits totaux</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{dashboard.activeAlerts}</div>
                <div className="text-sm text-gray-600">Alertes actives</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {lastUpdate ? lastUpdate.toLocaleTimeString('fr-FR') : 'Jamais'}
                </div>
                <div className="text-sm text-gray-600">Dernière MAJ</div>
              </div>
            </div>
            
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="mt-4 text-sm text-gray-600">
              <p><strong>Dashboard:</strong> {dashboard.lowStockProducts} faible, {dashboard.outOfStockProducts} rupture, {dashboard.overStockProducts} surstock</p>
              <p><strong>Alertes:</strong> {alerts.filter(a => a.type === 'LOW_STOCK').length} faible, {alerts.filter(a => a.type === 'OUT_OF_STOCK').length} rupture</p>
              <p><strong>Produits:</strong> {products.filter(p => p.status === 'low').length} faible, {products.filter(p => p.status === 'out').length} rupture</p>
            </div>
          </CardContent>
        </Card>

        {/* Onglets */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Contenu des onglets */}
        <div className="space-y-6">
          {activeTab === 'diagnostic' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Activity className="h-5 w-5 mr-2" />
                    Diagnostic des APIs
                  </span>
                  <Button variant="outline" size="sm" onClick={runDiagnostic} disabled={diagnosticLoading}>
                    <RefreshCw className={`h-4 w-4 mr-1 ${diagnosticLoading ? 'animate-spin' : ''}`} />
                    Tester
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {diagnosticLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                    <span>Test des APIs en cours...</span>
                  </div>
                ) : diagnosticData ? (
                  <div className="space-y-6">
                    <div className="text-sm text-gray-600">
                      Dernière vérification: {new Date(diagnosticData.timestamp).toLocaleString('fr-FR')}
                    </div>

                    {/* Dashboard API */}
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium flex items-center mb-2">
                        {diagnosticData.dashboard.error ? (
                          <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                        )}
                        Dashboard API (/stock/dashboard)
                      </h4>
                      {diagnosticData.dashboard.error ? (
                        <p className="text-red-600 text-sm">{diagnosticData.dashboard.error}</p>
                      ) : (
                        <div className="text-sm space-y-1">
                          <p>✅ Total produits: {diagnosticData.dashboard.data?.overview?.totalProducts || 0}</p>
                          <p>✅ Stock faible: {diagnosticData.dashboard.data?.overview?.lowStockProducts || 0}</p>
                          <p>✅ Rupture: {diagnosticData.dashboard.data?.overview?.outOfStockProducts || 0}</p>
                          <p>✅ Alertes actives: {diagnosticData.dashboard.data?.activity?.activeAlerts || 0}</p>
                        </div>
                      )}
                    </div>

                    {/* Alerts API */}
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium flex items-center mb-2">
                        {diagnosticData.alerts.error ? (
                          <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                        )}
                        Alertes API (/api/v1/stock-alerts/alerts)
                      </h4>
                      {diagnosticData.alerts.error ? (
                        <p className="text-red-600 text-sm">{diagnosticData.alerts.error}</p>
                      ) : (
                        <div className="text-sm space-y-1">
                          <p>✅ Total alertes: {Array.isArray(diagnosticData.alerts.data) ? diagnosticData.alerts.data.length : 0}</p>
                          <p>✅ Stock faible: {Array.isArray(diagnosticData.alerts.data) ? diagnosticData.alerts.data.filter((a: any) => a.type === 'LOW_STOCK').length : 0}</p>
                          <p>✅ Rupture: {Array.isArray(diagnosticData.alerts.data) ? diagnosticData.alerts.data.filter((a: any) => a.type === 'OUT_OF_STOCK').length : 0}</p>
                        </div>
                      )}
                    </div>

                    {/* Products API */}
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium flex items-center mb-2">
                        {diagnosticData.products.error ? (
                          <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                        )}
                        Produits API (/api/v1/products)
                      </h4>
                      {diagnosticData.products.error ? (
                        <p className="text-red-600 text-sm">{diagnosticData.products.error}</p>
                      ) : (
                        <div className="text-sm space-y-1">
                          {(() => {
                            const productsData = diagnosticData.products.data?.data || []
                            const lowStock = productsData.filter((p: any) => p.stockQuantity > 0 && p.stockQuantity <= (p.minStock || 0) && (p.minStock || 0) > 0).length
                            const outOfStock = productsData.filter((p: any) => p.stockQuantity === 0).length
                            return (
                              <>
                                <p>✅ Total produits: {productsData.length}</p>
                                <p>✅ Stock faible: {lowStock}</p>
                                <p>✅ Rupture: {outOfStock}</p>
                              </>
                            )
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Analyse de cohérence */}
                    {!diagnosticData.dashboard.error && !diagnosticData.alerts.error && !diagnosticData.products.error && (
                      <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                        <h4 className="font-medium text-blue-800 mb-2">🔍 Analyse de cohérence</h4>
                        {(() => {
                          const dashData = diagnosticData.dashboard.data
                          const alertsData = diagnosticData.alerts.data || []
                          const productsData = diagnosticData.products.data?.data || []

                          const dashLow = dashData?.overview?.lowStockProducts || 0
                          const dashOut = dashData?.overview?.outOfStockProducts || 0
                          const alertsLow = alertsData.filter((a: any) => a.type === 'LOW_STOCK').length
                          const alertsOut = alertsData.filter((a: any) => a.type === 'OUT_OF_STOCK').length
                          const productsLow = productsData.filter((p: any) => p.stockQuantity > 0 && p.stockQuantity <= (p.minStock || 0) && (p.minStock || 0) > 0).length
                          const productsOut = productsData.filter((p: any) => p.stockQuantity === 0).length

                          const isConsistent = dashLow === alertsLow && dashOut === alertsOut && dashLow === productsLow && dashOut === productsOut

                          return (
                            <div className="text-sm space-y-2">
                              <div className={`flex items-center ${isConsistent ? 'text-green-700' : 'text-red-700'}`}>
                                {isConsistent ? <CheckCircle className="h-4 w-4 mr-2" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
                                {isConsistent ? 'Données cohérentes' : 'Incohérences détectées'}
                              </div>
                              <div className="grid grid-cols-3 gap-4 text-xs">
                                <div>
                                  <strong>Dashboard:</strong><br/>
                                  Faible: {dashLow}<br/>
                                  Rupture: {dashOut}
                                </div>
                                <div>
                                  <strong>Alertes:</strong><br/>
                                  Faible: {alertsLow}<br/>
                                  Rupture: {alertsOut}
                                </div>
                                <div>
                                  <strong>Produits:</strong><br/>
                                  Faible: {productsLow}<br/>
                                  Rupture: {productsOut}
                                </div>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Cliquez sur "Tester" pour vérifier les APIs</p>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'comparison' && (
            <StockDataComparison />
          )}

          {activeTab === 'testing' && (
            <SyncTestDashboard />
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <UnifiedStockDashboard
                onViewAlerts={() => setActiveTab('alerts')}
                onViewProducts={() => setActiveTab('products')}
              />
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="space-y-6">
              <UnifiedStockAlerts />
              
              {/* Détails des alertes */}
              <Card>
                <CardHeader>
                  <CardTitle>Détails des alertes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {alerts.length === 0 ? (
                      <p className="text-gray-500 text-center">Aucune alerte active</p>
                    ) : (
                      alerts.slice(0, 10).map((alert) => (
                        <div key={alert.id} className="border-l-4 border-red-400 pl-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{alert.title}</h4>
                              <p className="text-sm text-gray-600">{alert.message}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                Stock: {alert.currentStock} | Seuil: {alert.thresholdValue}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                alert.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                                alert.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                                alert.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {alert.severity}
                              </span>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(alert.createdAt).toLocaleString('fr-FR')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="space-y-6">
              <UnifiedProductsList />
              
              {/* Statistiques des produits */}
              <Card>
                <CardHeader>
                  <CardTitle>Répartition par statut</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {products.filter(p => p.status === 'out').length}
                      </div>
                      <div className="text-sm text-red-800">Rupture</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {products.filter(p => p.status === 'low').length}
                      </div>
                      <div className="text-sm text-orange-800">Stock faible</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {products.filter(p => p.status === 'over').length}
                      </div>
                      <div className="text-sm text-blue-800">Surstock</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {products.filter(p => p.status === 'normal').length}
                      </div>
                      <div className="text-sm text-green-800">Normal</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
