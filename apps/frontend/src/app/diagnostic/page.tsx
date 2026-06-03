'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database,
  RefreshCw,
  Settings,
  TrendingUp,
  Package
} from 'lucide-react'
import AutoCorrection from '@/components/diagnostic/AutoCorrection'

interface DiagnosticResult {
  category: string
  status: 'success' | 'warning' | 'error'
  message: string
  details?: string
  count?: number
}

export default function DiagnosticPage() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [lastRun, setLastRun] = useState<Date | null>(null)

  const runDiagnostic = async () => {
    setIsRunning(true)
    setDiagnostics([])

    try {

      const results: DiagnosticResult[] = []

      // Diagnostic 1: Vérification de la connectivité API
      try {
        const response = await fetch('/api/v1/stock/dashboard', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        
        if (response.ok) {
          results.push({
            category: 'Connectivité API',
            status: 'success',
            message: 'Connexion au backend réussie',
            details: `Status: ${response.status}`
          })
        } else {
          results.push({
            category: 'Connectivité API',
            status: 'warning',
            message: 'Problème de connexion au backend',
            details: `Status: ${response.status} - ${response.statusText}`
          })
        }
      } catch (error: any) {
        results.push({
          category: 'Connectivité API',
          status: 'error',
          message: 'Erreur de connexion au backend',
          details: error.message
        })
      }

      // Diagnostic 2: Vérification des données en cache
      const cacheKeys = Object.keys(localStorage).filter(key => 
        key.includes('stock') || key.includes('dashboard') || key.includes('alert')
      )
      
      results.push({
        category: 'Cache Local',
        status: cacheKeys.length > 5 ? 'warning' : 'success',
        message: `${cacheKeys.length} éléments en cache`,
        details: cacheKeys.length > 5 ? 'Cache potentiellement surchargé' : 'Cache normal',
        count: cacheKeys.length
      })

      // Diagnostic 3: Vérification de l'authentification
      const token = localStorage.getItem('token')
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          const isExpired = payload.exp * 1000 < Date.now()
          
          results.push({
            category: 'Authentification',
            status: isExpired ? 'error' : 'success',
            message: isExpired ? 'Token expiré' : 'Token valide',
            details: `Expire le: ${new Date(payload.exp * 1000).toLocaleString('fr-FR')}`
          })
        } catch (error) {
          results.push({
            category: 'Authentification',
            status: 'error',
            message: 'Token invalide',
            details: 'Le token JWT ne peut pas être décodé'
          })
        }
      } else {
        results.push({
          category: 'Authentification',
          status: 'error',
          message: 'Aucun token trouvé',
          details: 'Vous devez vous reconnecter'
        })
      }

      // Diagnostic 4: Test de performance réseau
      const startTime = Date.now()
      try {
        await fetch('/api/v1/stock/dashboard', {
          method: 'HEAD',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        const responseTime = Date.now() - startTime
        
        results.push({
          category: 'Performance Réseau',
          status: responseTime > 2000 ? 'warning' : 'success',
          message: `Temps de réponse: ${responseTime}ms`,
          details: responseTime > 2000 ? 'Connexion lente détectée' : 'Connexion rapide'
        })
      } catch (error) {
        results.push({
          category: 'Performance Réseau',
          status: 'error',
          message: 'Test de performance échoué',
          details: 'Impossible de mesurer le temps de réponse'
        })
      }

      setDiagnostics(results)
      setLastRun(new Date())

    } catch (error: any) {
      console.error('Erreur lors du diagnostic:', error)
      setDiagnostics([{
        category: 'Erreur Générale',
        status: 'error',
        message: 'Erreur lors du diagnostic',
        details: error.message
      }])
    } finally {
      setIsRunning(false)
    }
  }

  useEffect(() => {
    // Lancer le diagnostic automatiquement au chargement
    runDiagnostic()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-600" />
      default:
        return <Clock className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const successCount = diagnostics.filter(d => d.status === 'success').length
  const warningCount = diagnostics.filter(d => d.status === 'warning').length
  const errorCount = diagnostics.filter(d => d.status === 'error').length

  return (
    <MainLayout
      title="Diagnostic des Stocks"
      subtitle="Vérification locale des données, du cache et de l'authentification"
      actions={
        <button
          onClick={runDiagnostic}
          disabled={isRunning}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isRunning ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {isRunning ? 'Diagnostic en cours...' : 'Relancer le Diagnostic'}
        </button>
      }
    >
      <div className="space-y-6">
        {/* Résumé rapide du dernier passage */}
        <div className="bg-white rounded-lg shadow p-6">
          {lastRun && (
            <p className="text-sm text-gray-600">
              Dernier diagnostic: {lastRun.toLocaleString('fr-FR')}
            </p>
          )}

          {/* Résumé */}
          {diagnostics.length > 0 && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span className="font-medium text-green-900">{successCount} Réussis</span>
                </div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                  <span className="font-medium text-yellow-900">{warningCount} Avertissements</span>
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                  <span className="font-medium text-red-900">{errorCount} Erreurs</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Résultats du diagnostic */}
        {diagnostics.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
              Résultats du Diagnostic
            </h2>

            <div className="space-y-3">
              {diagnostics.map((diagnostic, index) => (
                <div key={index} className={`p-4 rounded-lg border ${getStatusColor(diagnostic.status)}`}>
                  <div className="flex items-start">
                    {getStatusIcon(diagnostic.status)}
                    <div className="ml-3 flex-1">
                      <div className="font-medium text-gray-900">{diagnostic.category}</div>
                      <div className="text-sm text-gray-600">{diagnostic.message}</div>
                      {diagnostic.details && (
                        <div className="text-xs text-gray-500 mt-1">{diagnostic.details}</div>
                      )}
                      {diagnostic.count !== undefined && (
                        <div className="text-xs text-gray-500 mt-1">Nombre: {diagnostic.count}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Composant de correction automatique */}
        <AutoCorrection />

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2 flex items-center">
            <Package className="h-4 w-4 mr-2" />
            Instructions d'utilisation :
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Diagnostic automatique</strong> : Se lance automatiquement au chargement de la page</li>
            <li>• <strong>Correction automatique</strong> : Utilisez les boutons de correction ci-dessous selon vos besoins</li>
            <li>• <strong>Relancer</strong> : Cliquez sur "Relancer le Diagnostic" pour une nouvelle vérification</li>
            <li>• <strong>Problèmes détectés</strong> : Les erreurs et avertissements nécessitent votre attention</li>
          </ul>
        </div>
      </div>
    </MainLayout>
  )
}
