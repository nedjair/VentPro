'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { 
  Play, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Database,
  Activity,
  FileText,
  Download
} from 'lucide-react'
import { stockDiagnostic } from '@/utils/stockDiagnostic'
import { StockConsistencyChecker } from '@/components/diagnostic/StockConsistencyChecker'
import { QuickStockDiagnostic } from '@/components/diagnostic/QuickStockDiagnostic'
import AutoCorrection from '@/components/diagnostic/AutoCorrection'

export default function DiagnosticStockPage() {
  const [diagnostic, setDiagnostic] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runDiagnostic = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await stockDiagnostic.runFullDiagnostic()
      setDiagnostic(result)
    } catch (err: any) {
      console.error('❌ Erreur lors du diagnostic:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const downloadReport = () => {
    if (!diagnostic) return
    
    const report = stockDiagnostic.generateDetailedReport(diagnostic)
    const blob = new Blob([report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `diagnostic-stock-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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
    <MainLayout
      title="Diagnostic Avancé - Synchronisation Stock"
      subtitle="Investigation approfondie des problèmes de cohérence des données de stock"
      actions={
        <div className="flex gap-4">
          <button
            onClick={runDiagnostic}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Play className="h-5 w-5 mr-2" />
            )}
            {loading ? 'Diagnostic en cours...' : 'Lancer le Diagnostic Complet'}
          </button>

          {diagnostic && (
            <button
              onClick={downloadReport}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download className="h-5 w-5 mr-2" />
              Télécharger le Rapport
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-8">
        {/* Erreur */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-800 font-medium">Erreur lors du diagnostic</span>
            </div>
            <p className="text-red-700 mt-2">{error}</p>
          </div>
        )}

        {/* Diagnostic rapide des APIs existantes */}
        <QuickStockDiagnostic />

        {/* Contrôle de cohérence en temps réel */}
        <StockConsistencyChecker />

        {/* Résultats */}
        {diagnostic && (
          <div className="space-y-8">
            {/* Résumé */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900 flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-blue-600" />
                  Résumé du Diagnostic
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {diagnostic.summary.totalEndpoints}
                    </div>
                    <div className="text-sm text-gray-600">Endpoints testés</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {diagnostic.summary.successfulEndpoints}
                    </div>
                    <div className="text-sm text-gray-600">Succès</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {diagnostic.summary.failedEndpoints}
                    </div>
                    <div className="text-sm text-gray-600">Échecs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {diagnostic.summary.totalInconsistencies}
                    </div>
                    <div className="text-sm text-gray-600">Incohérences</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {diagnostic.summary.avgResponseTime}ms
                    </div>
                    <div className="text-sm text-gray-600">Temps moyen</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Endpoints */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900 flex items-center">
                  <Database className="h-5 w-5 mr-2 text-blue-600" />
                  État des Endpoints
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {diagnostic.endpoints.map((endpoint: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center">
                        {getStatusIcon(endpoint.success)}
                        <div className="ml-3">
                          <div className="font-medium text-gray-900">{endpoint.endpoint}</div>
                          {!endpoint.success && (
                            <div className="text-sm text-red-600">{endpoint.error}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="h-4 w-4 mr-1" />
                          {endpoint.responseTime}ms
                        </div>
                        <div className={`text-sm font-medium ${getStatusColor(endpoint.success)}`}>
                          {endpoint.success ? 'OK' : 'ERREUR'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Incohérences */}
            {diagnostic.inconsistencies.filter((i: any) => i.inconsistent).length > 0 && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900 flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
                    Incohérences Détectées
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-6">
                    {diagnostic.inconsistencies
                      .filter((i: any) => i.inconsistent)
                      .map((inconsistency: any, index: number) => (
                        <div key={index} className="border-l-4 border-red-400 pl-4">
                          <div className="font-medium text-gray-900 mb-2">
                            {inconsistency.field}
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm mb-2">
                            <div>
                              <span className="font-medium">Tableau de bord :</span> {inconsistency.dashboard}
                            </div>
                            <div>
                              <span className="font-medium">Alertes:</span> {inconsistency.alerts}
                            </div>
                            <div>
                              <span className="font-medium">Produits:</span> {inconsistency.products}
                            </div>
                          </div>
                          <div className="text-sm text-gray-600">
                            {inconsistency.details}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* Correction automatique */}
            <AutoCorrection />

            {/* Données brutes (pour debug) */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-blue-600" />
                  Données Brutes (Debug)
                </h2>
              </div>
              <div className="p-6">
                <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-96">
                  {JSON.stringify(diagnostic, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
