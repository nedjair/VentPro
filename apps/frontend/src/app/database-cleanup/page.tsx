'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { 
  Database, 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle,
  Play,
  Eye,
  Shield,
  BarChart3,
  Download,
  Upload
} from 'lucide-react'

interface ConsistencyResult {
  consistent: number
  inconsistent: number
  missing: number
  details: Array<{
    productId: string
    productName: string
    issue: string
    productData: any
    stockData: any
  }>
}

interface CleanupResult {
  orphansRemoved: number
  stocksCreated: number
  recordsSynced: number
  totalActions: number
}

export default function DatabaseCleanupPage() {
  const [consistency, setConsistency] = useState<ConsistencyResult | null>(null)
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cleanupOptions, setCleanupOptions] = useState({
    removeOrphans: true,
    createMissing: true,
    syncInconsistent: true,
    dryRun: true
  })

  useEffect(() => {
    loadConsistencyData()
  }, [])

  const loadConsistencyData = async () => {
    setLoading(true)
    setError(null)

    try {

      const response = await api.get('/api/v1/auto-sync/check-consistency')

      if (response.data.success) {
        setConsistency(response.data.data)
      }

    } catch (err: any) {
      console.error('❌ Erreur:', err)
      setError(err.response?.data?.message || err.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const performCleanup = async (dryRun: boolean = false) => {
    setActionLoading(dryRun ? 'dry-run' : 'cleanup')
    setError(null)

    try {
      const options = { ...cleanupOptions, dryRun }
      
      const response = await api.post('/api/v1/auto-sync/cleanup-complete', options)

      if (response.data.success) {
        setCleanupResult(response.data.data)
        
        // Recharger les données de cohérence après le nettoyage
        if (!dryRun) {
          await loadConsistencyData()
        }
      }

    } catch (err: any) {
      console.error('❌ Erreur:', err)
      setError(err.response?.data?.message || 'Erreur lors du nettoyage')
    } finally {
      setActionLoading(null)
    }
  }

  const simpleCleanup = async () => {
    setActionLoading('simple-cleanup')
    setError(null)

    try {
      const response = await api.post('/api/v1/auto-sync/cleanup')

      if (response.data.success) {
        await loadConsistencyData()
      }

    } catch (err: any) {
      console.error('❌ Erreur:', err)
      setError(err.response?.data?.message || 'Erreur lors du nettoyage simple')
    } finally {
      setActionLoading(null)
    }
  }

  const getTotalIssues = () => {
    if (!consistency) return 0
    return consistency.inconsistent + consistency.missing
  }

  const getIssuesSeverity = () => {
    const total = getTotalIssues()
    if (total === 0) return 'success'
    if (total <= 5) return 'warning'
    return 'error'
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Analyse de la base de données...</p>
        </div>
      </div>
    )
  }

  const severity = getIssuesSeverity()
  const totalIssues = getTotalIssues()

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          🧹 Nettoyage de la Base de Données
        </h1>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-red-800">❌ Erreur</h3>
            <p className="text-red-700">{error}</p>
            <button
              onClick={loadConsistencyData}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* État de la base de données */}
        {consistency && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 État de la Base de Données</h3>
            
            <div className={`p-4 rounded-lg border mb-4 ${
              severity === 'success' ? 'bg-green-50 border-green-200' :
              severity === 'warning' ? 'bg-yellow-50 border-yellow-200' :
              'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center mb-2">
                {severity === 'success' ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                )}
                <h4 className={`font-semibold ${
                  severity === 'success' ? 'text-green-800' :
                  severity === 'warning' ? 'text-yellow-800' :
                  'text-red-800'
                }`}>
                  {severity === 'success' ? 'Base de données cohérente' :
                   severity === 'warning' ? 'Problèmes mineurs détectés' :
                   'Problèmes importants détectés'}
                </h4>
              </div>
              
              <p className={`text-sm ${
                severity === 'success' ? 'text-green-700' :
                severity === 'warning' ? 'text-yellow-700' :
                'text-red-700'
              }`}>
                {severity === 'success' 
                  ? 'Toutes les données sont synchronisées correctement.'
                  : `${totalIssues} problème(s) nécessitent une attention.`
                }
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800">✅ Cohérents</h4>
                <p className="text-2xl font-bold text-green-900">{consistency.consistent}</p>
                <p className="text-sm text-green-700">Enregistrements corrects</p>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-semibold text-orange-800">⚠️ Incohérents</h4>
                <p className="text-2xl font-bold text-orange-900">{consistency.inconsistent}</p>
                <p className="text-sm text-orange-700">Données à synchroniser</p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-800">❌ Manquants</h4>
                <p className="text-2xl font-bold text-red-900">{consistency.missing}</p>
                <p className="text-sm text-red-700">Stocks à créer</p>
              </div>
            </div>
          </div>
        )}

        {/* Options de nettoyage */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">⚙️ Options de Nettoyage</h3>
          
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={cleanupOptions.removeOrphans}
                onChange={(e) => setCleanupOptions(prev => ({ ...prev, removeOrphans: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium">Supprimer les stocks orphelins</span>
              <span className="text-xs text-gray-500">(stocks sans produit correspondant)</span>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={cleanupOptions.createMissing}
                onChange={(e) => setCleanupOptions(prev => ({ ...prev, createMissing: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium">Créer les stocks manquants</span>
              <span className="text-xs text-gray-500">(pour les produits physiques sans stock)</span>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={cleanupOptions.syncInconsistent}
                onChange={(e) => setCleanupOptions(prev => ({ ...prev, syncInconsistent: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium">Synchroniser les données incohérentes</span>
              <span className="text-xs text-gray-500">(aligner les quantités entre produits et stocks)</span>
            </label>
          </div>
        </div>

        {/* Actions de nettoyage */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">🛠️ Actions de Nettoyage</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => performCleanup(true)}
              disabled={actionLoading === 'dry-run'}
              className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {actionLoading === 'dry-run' ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              Simulation
            </button>

            <button
              onClick={() => performCleanup(false)}
              disabled={actionLoading === 'cleanup'}
              className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {actionLoading === 'cleanup' ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Database className="h-4 w-4 mr-2" />
              )}
              Nettoyage Complet
            </button>

            <button
              onClick={simpleCleanup}
              disabled={actionLoading === 'simple-cleanup'}
              className="flex items-center justify-center px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              {actionLoading === 'simple-cleanup' ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Orphelins Seulement
            </button>

            <button
              onClick={loadConsistencyData}
              disabled={loading}
              className="flex items-center justify-center px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <BarChart3 className="h-4 w-4 mr-2" />
              )}
              Analyser
            </button>
          </div>
        </div>

        {/* Résultats du nettoyage */}
        {cleanupResult && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">📋 Résultats du Nettoyage</h3>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-900">{cleanupResult.orphansRemoved}</p>
                  <p className="text-sm text-blue-700">Orphelins supprimés</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-900">{cleanupResult.stocksCreated}</p>
                  <p className="text-sm text-blue-700">Stocks créés</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-900">{cleanupResult.recordsSynced}</p>
                  <p className="text-sm text-blue-700">Enregistrements synchronisés</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-900">{cleanupResult.totalActions}</p>
                  <p className="text-sm text-blue-700">Total des actions</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Détails des problèmes */}
        {consistency && consistency.details && consistency.details.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">🔍 Détails des Problèmes</h3>
            
            <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
              {consistency.details.slice(0, 10).map((detail, index) => (
                <div key={index} className="mb-2 p-2 bg-white rounded border">
                  <div className="font-medium text-gray-900">{detail.productName}</div>
                  <div className="text-sm text-red-600">{detail.issue}</div>
                  <div className="text-xs text-gray-500">ID: {detail.productId.slice(0, 8)}...</div>
                </div>
              ))}
              {consistency.details.length > 10 && (
                <div className="text-center text-gray-500 text-sm mt-2">
                  ... et {consistency.details.length - 10} autres problèmes
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <a
            href="/auto-sync"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            🔄 Synchronisation Auto
          </a>
          <a
            href="/test-stock-consistency"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            🧪 Test de Cohérence
          </a>
          <a
            href="/products"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            📦 Page Produits
          </a>
          <a
            href="/stocks"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            📋 Page Stocks
          </a>
        </div>
      </div>
    </div>
  )
}
