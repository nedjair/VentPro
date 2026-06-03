'use client'

import { useState } from 'react'
import {
  Zap,
  RefreshCw,
  Settings,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  BellOff
} from 'lucide-react'
import { stockCorrection, CorrectionResult } from '@/utils/stockCorrection'
import UserPreferencesService from '@/services/userPreferences'

export default function AutoCorrection() {
  const [correcting, setCorrecting] = useState(false)
  const [results, setResults] = useState<CorrectionResult[]>([])
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return UserPreferencesService.areStockPopupsEnabled()
  })

  const runAutoCorrection = async () => {
    setCorrecting(true)
    setResults([])

    try {

      // Utiliser le service de correction automatique
      const corrections = await stockCorrection.executeAllActions()
      setResults(corrections)

      const successCount = corrections.filter(c => c.success).length

      // Attendre 2 secondes puis recharger la page si des corrections ont réussi
      if (successCount > 0) {
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      }

    } catch (error: any) {
      console.error('❌ Erreur lors de la correction automatique:', error)
      setResults([{
        action: { id: 'error', name: 'Erreur générale', description: '', type: 'sync', priority: 'high' },
        success: false,
        message: 'Erreur générale lors de la correction automatique',
        details: error.message,
        timestamp: new Date().toISOString(),
        duration: 0
      }])
    } finally {
      setCorrecting(false)
    }
  }

  const runCriticalCorrection = async () => {
    setCorrecting(true)
    setResults([])

    try {

      // Utiliser le service de correction critique
      const corrections = await stockCorrection.executeHighPriorityActions()
      setResults(corrections)

      const successCount = corrections.filter(c => c.success).length

      // Attendre 2 secondes puis recharger la page si des corrections ont réussi
      if (successCount > 0) {
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      }

    } catch (error: any) {
      console.error('❌ Erreur lors des corrections critiques:', error)
      setResults([{
        action: { id: 'error', name: 'Erreur critique', description: '', type: 'sync', priority: 'high' },
        success: false,
        message: 'Erreur lors des corrections critiques',
        details: error.message,
        timestamp: new Date().toISOString(),
        duration: 0
      }])
    } finally {
      setCorrecting(false)
    }
  }

  const runManualSync = async () => {
    try {

      // Forcer le rafraîchissement des données côté frontend
      window.dispatchEvent(new CustomEvent('forceRefreshStockData', {
        detail: { timestamp: Date.now() }
      }))

      // Vider le cache local
      const keysToRemove = Object.keys(localStorage).filter(key =>
        key.includes('stock') || key.includes('dashboard') || key.includes('alert')
      )
      keysToRemove.forEach(key => localStorage.removeItem(key))

      // Recharger la page après un court délai
      setTimeout(() => {
        window.location.reload()
      }, 1000)

    } catch (error: any) {
      console.error('❌ Erreur lors de la synchronisation manuelle:', error)
    }
  }

  const toggleNotifications = () => {
    const newState = !notificationsEnabled
    setNotificationsEnabled(newState)
    UserPreferencesService.toggleStockPopups(newState)
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
      {/* Contrôles de correction */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Settings className="h-5 w-5 mr-2 text-blue-600" />
            Correction Automatique des Incohérences
          </h3>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          Cette fonction tente de corriger automatiquement les incohérences détectées en synchronisant 
          les différentes sources de données et en rafraîchissant les caches.
        </p>

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={runAutoCorrection}
            disabled={correcting}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {correcting ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            {correcting ? 'Correction en cours...' : 'Corriger Automatiquement'}
          </button>

          <button
            onClick={runCriticalCorrection}
            disabled={correcting}
            className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            {correcting ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <AlertTriangle className="h-4 w-4 mr-2" />
            )}
            {correcting ? 'Correction en cours...' : 'Corrections Critiques'}
          </button>

          <button
            onClick={runManualSync}
            disabled={correcting}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Synchronisation Manuelle
          </button>

          <button
            onClick={toggleNotifications}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              notificationsEnabled
                ? 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                : 'bg-green-100 text-green-800 hover:bg-green-200'
            }`}
            title={notificationsEnabled ? 'Désactiver les notifications popup' : 'Activer les notifications popup'}
          >
            <BellOff className="h-4 w-4 mr-2" />
            {notificationsEnabled ? 'Désactiver Popups' : 'Activer Popups'}
          </button>
        </div>
      </div>

      {/* Résultats de la correction */}
      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Settings className="h-5 w-5 mr-2 text-blue-600" />
            Résultats de la Correction
          </h3>

          <div className="space-y-3">
            {results.map((result, index) => (
              <div key={index} className={`p-4 rounded-lg border ${
                result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-start">
                  {getStatusIcon(result.success)}
                  <div className="ml-3 flex-1">
                    <div className="font-medium text-gray-900">{result.action.name}</div>
                    <div className="text-sm text-gray-600">{result.action.description}</div>
                    <div className="text-sm mt-1">
                      <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                        {result.message}
                      </span>
                    </div>
                    {result.details && (
                      <div className="text-xs text-gray-500 mt-1">
                        {typeof result.details === 'string'
                          ? result.details
                          : JSON.stringify(result.details, null, 2)
                        }
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                      <span>{new Date(result.timestamp).toLocaleString('fr-FR')}</span>
                      <span>•</span>
                      <span>{result.duration}ms</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Résumé */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">
                Résumé de la correction
              </span>
              <div className="flex items-center gap-4">
                <span className="text-sm text-green-600">
                  ✅ {results.filter(r => r.success).length} réussies
                </span>
                <span className="text-sm text-red-600">
                  ❌ {results.filter(r => !r.success).length} échouées
                </span>
              </div>
            </div>

            {results.filter(r => r.success).length > 0 && (
              <div className="mt-2 text-sm text-blue-600">
                📄 La page va se recharger automatiquement dans 2 secondes pour afficher les changements...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Instructions :</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Correction Automatique</strong> : Exécute toutes les corrections disponibles via les APIs backend</li>
          <li>• <strong>Corrections Critiques</strong> : Exécute seulement les corrections prioritaires et urgentes</li>
          <li>• <strong>Synchronisation Manuelle</strong> : Force le rafraîchissement des données côté frontend</li>
          <li>• <strong>Rechargement automatique</strong> : La page se recharge après correction pour afficher les changements</li>
          <li>• <strong>Vérification</strong> : Relancez le diagnostic après correction pour vérifier les résultats</li>
        </ul>
      </div>
    </div>
  )
}
