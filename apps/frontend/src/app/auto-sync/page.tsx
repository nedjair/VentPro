'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { 
  Play, 
  Pause, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  Settings,
  Database,
  Trash2,
  BarChart3
} from 'lucide-react'

interface JobStatus {
  name: string
  running: boolean
}

interface SyncConfig {
  autoSyncEnabled: boolean
  schedulerEnabled: boolean
  stockSyncCron: string
  dataCleanupCron: string
  consistencyCheckCron: string
  environment: string
}

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

export default function AutoSyncPage() {
  const [jobs, setJobs] = useState<JobStatus[]>([])
  const [config, setConfig] = useState<SyncConfig | null>(null)
  const [consistency, setConsistency] = useState<ConsistencyResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {

      // Charger le statut des tâches, la configuration et la cohérence en parallèle
      const [jobsResponse, configResponse, consistencyResponse] = await Promise.all([
        api.get('/api/v1/auto-sync/scheduler/status'),
        api.get('/api/v1/auto-sync/config'),
        api.get('/api/v1/auto-sync/check-consistency')
      ])

      if (jobsResponse.data.success) {
        setJobs(jobsResponse.data.data.jobs || [])
      }

      if (configResponse.data.success) {
        setConfig(configResponse.data.data)
      }

      if (consistencyResponse.data.success) {
        setConsistency(consistencyResponse.data.data)
      }

    } catch (err: any) {
      console.error('❌ Erreur:', err)
      setError(err.response?.data?.message || err.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const runJob = async (jobName: string) => {
    setActionLoading(jobName)
    try {
      const response = await api.post(`/api/v1/auto-sync/scheduler/run/${jobName}`)
      if (response.data.success) {
        setLastSync(new Date().toLocaleString('fr-FR'))
        await loadData() // Recharger les données après l'exécution
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de l\'exécution')
    } finally {
      setActionLoading(null)
    }
  }

  const restartJob = async (jobName: string) => {
    setActionLoading(`restart-${jobName}`)
    try {
      const response = await api.post(`/api/v1/auto-sync/scheduler/restart/${jobName}`)
      if (response.data.success) {
        await loadData()
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du redémarrage')
    } finally {
      setActionLoading(null)
    }
  }

  const syncCompany = async () => {
    setActionLoading('sync-company')
    try {
      const response = await api.post('/api/v1/auto-sync/sync-company')
      if (response.data.success) {
        setLastSync(new Date().toLocaleString('fr-FR'))
        await loadData()
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la synchronisation')
    } finally {
      setActionLoading(null)
    }
  }

  const cleanup = async () => {
    setActionLoading('cleanup')
    try {
      const response = await api.post('/api/v1/auto-sync/cleanup')
      if (response.data.success) {
        await loadData()
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du nettoyage')
    } finally {
      setActionLoading(null)
    }
  }

  const getJobIcon = (jobName: string) => {
    switch (jobName) {
      case 'stock-sync': return RefreshCw
      case 'data-cleanup': return Trash2
      case 'consistency-check': return BarChart3
      default: return Clock
    }
  }

  const getJobLabel = (jobName: string) => {
    switch (jobName) {
      case 'stock-sync': return 'Synchronisation des stocks'
      case 'data-cleanup': return 'Nettoyage des données'
      case 'consistency-check': return 'Vérification de cohérence'
      default: return jobName
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Chargement de la synchronisation automatique...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          🔄 Synchronisation Automatique des Stocks
        </h1>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-red-800">❌ Erreur</h3>
            <p className="text-red-700">{error}</p>
            <button
              onClick={loadData}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Configuration */}
        {config && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className={`p-4 rounded-lg border ${config.autoSyncEnabled ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <h3 className={`font-semibold ${config.autoSyncEnabled ? 'text-green-800' : 'text-red-800'}`}>
                {config.autoSyncEnabled ? '✅' : '❌'} Auto-Sync
              </h3>
              <p className={`text-sm ${config.autoSyncEnabled ? 'text-green-700' : 'text-red-700'}`}>
                {config.autoSyncEnabled ? 'Activé' : 'Désactivé'}
              </p>
            </div>

            <div className={`p-4 rounded-lg border ${config.schedulerEnabled ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <h3 className={`font-semibold ${config.schedulerEnabled ? 'text-green-800' : 'text-red-800'}`}>
                {config.schedulerEnabled ? '✅' : '❌'} Planificateur
              </h3>
              <p className={`text-sm ${config.schedulerEnabled ? 'text-green-700' : 'text-red-700'}`}>
                {config.schedulerEnabled ? 'Activé' : 'Désactivé'}
              </p>
            </div>

            <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
              <h3 className="font-semibold text-blue-800">🌍 Environnement</h3>
              <p className="text-sm text-blue-700">{config.environment}</p>
            </div>

            <div className="p-4 rounded-lg border bg-gray-50 border-gray-200">
              <h3 className="font-semibold text-gray-800">⏰ Dernière sync</h3>
              <p className="text-sm text-gray-700">{lastSync || 'Jamais'}</p>
            </div>
          </div>
        )}

        {/* Cohérence des données */}
        {consistency && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 État de la cohérence</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800">✅ Cohérents</h4>
                <p className="text-2xl font-bold text-green-900">{consistency.consistent}</p>
                <p className="text-sm text-green-700">Produits synchronisés</p>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-semibold text-orange-800">⚠️ Incohérents</h4>
                <p className="text-2xl font-bold text-orange-900">{consistency.inconsistent}</p>
                <p className="text-sm text-orange-700">Nécessitent synchronisation</p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-800">❌ Manquants</h4>
                <p className="text-2xl font-bold text-red-900">{consistency.missing}</p>
                <p className="text-sm text-red-700">Stocks à créer</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions manuelles */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">🛠️ Actions manuelles</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={syncCompany}
              disabled={actionLoading === 'sync-company'}
              className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {actionLoading === 'sync-company' ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Database className="h-4 w-4 mr-2" />
              )}
              Synchroniser maintenant
            </button>

            <button
              onClick={() => runJob('consistency-check')}
              disabled={actionLoading === 'consistency-check'}
              className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {actionLoading === 'consistency-check' ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <BarChart3 className="h-4 w-4 mr-2" />
              )}
              Vérifier cohérence
            </button>

            <button
              onClick={cleanup}
              disabled={actionLoading === 'cleanup'}
              className="flex items-center justify-center px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              {actionLoading === 'cleanup' ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Nettoyer données
            </button>
          </div>
        </div>

        {/* Tâches planifiées */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">⏰ Tâches planifiées</h3>
          <div className="space-y-4">
            {jobs.map(job => {
              const JobIcon = getJobIcon(job.name)
              return (
                <div key={job.name} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center">
                    <JobIcon className="h-5 w-5 mr-3 text-gray-600" />
                    <div>
                      <h4 className="font-medium text-gray-900">{getJobLabel(job.name)}</h4>
                      <p className="text-sm text-gray-500">
                        {config && job.name === 'stock-sync' && `Cron: ${config.stockSyncCron}`}
                        {config && job.name === 'data-cleanup' && `Cron: ${config.dataCleanupCron}`}
                        {config && job.name === 'consistency-check' && `Cron: ${config.consistencyCheckCron}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      job.running 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {job.running ? 'Actif' : 'Arrêté'}
                    </span>

                    <button
                      onClick={() => runJob(job.name)}
                      disabled={actionLoading === job.name}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {actionLoading === job.name ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                    </button>

                    <button
                      onClick={() => restartJob(job.name)}
                      disabled={actionLoading === `restart-${job.name}`}
                      className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                    >
                      {actionLoading === `restart-${job.name}` ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            🔄 Actualiser
          </button>
          <a
            href="/test-stock-consistency"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            🧪 Test de cohérence
          </a>
          <a
            href="/products"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            📦 Page Produits
          </a>
          <a
            href="/stocks"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            📋 Page Stocks
          </a>
        </div>
      </div>
    </div>
  )
}
