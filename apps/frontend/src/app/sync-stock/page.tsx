'use client'

import { useState } from 'react'
import { api } from '@/lib/api'

interface SyncResult {
  stats: {
    totalProducts: number
    activeProducts: number
    totalStocks: number
    productsWithoutStock: number
  }
  actions: {
    stocksCreated: number
    stocksSynced: number
    testProductsCreated: number
  }
  alerts: {
    outOfStock: number
    lowStock: number
    totalAlerts: number
  }
}

export default function SyncStockPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SyncResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSync = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      
      const response = await api.post('/api/v1/stock/sync-data')
      
      if (response.data.success) {
        setResult(response.data.data)
      } else {
        setError(response.data.message || 'Erreur lors de la synchronisation')
      }
    } catch (err: any) {
      console.error('❌ Erreur synchronisation:', err)
      if (err.response?.status === 401) {
        setError('Non authentifié - veuillez vous connecter d\'abord')
      } else {
        setError(err.response?.data?.message || err.message || 'Erreur inconnue')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          🔄 Synchronisation Products ↔ Stocks
        </h1>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Cette page permet de synchroniser les données entre les tables <code>products</code> et <code>stocks</code> 
            pour résoudre les problèmes d'alertes de stock.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-blue-800 mb-2">🎯 Actions effectuées :</h3>
            <ul className="text-blue-700 text-sm space-y-1">
              <li>• Création des enregistrements stock manquants</li>
              <li>• Synchronisation des données existantes</li>
              <li>• Création de produits de test avec alertes</li>
              <li>• Vérification des alertes après synchronisation</li>
            </ul>
          </div>
        </div>

        <button
          onClick={handleSync}
          disabled={loading}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {loading ? '🔄 Synchronisation en cours...' : '🚀 Lancer la synchronisation'}
        </button>

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-800 mb-2">❌ Erreur</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {result && (
          <div className="mt-6 space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-3">✅ Synchronisation réussie !</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Statistiques */}
                <div className="bg-white rounded-lg p-4 border">
                  <h4 className="font-medium text-gray-800 mb-2">📊 Statistiques</h4>
                  <div className="space-y-1 text-sm">
                    <div>Total produits: <span className="font-medium">{result.stats.totalProducts}</span></div>
                    <div>Produits actifs: <span className="font-medium">{result.stats.activeProducts}</span></div>
                    <div>Total stocks: <span className="font-medium">{result.stats.totalStocks}</span></div>
                    <div>Sans stock: <span className="font-medium text-orange-600">{result.stats.productsWithoutStock}</span></div>
                  </div>
                </div>

                {/* Actions */}
                <div className="bg-white rounded-lg p-4 border">
                  <h4 className="font-medium text-gray-800 mb-2">🔧 Actions</h4>
                  <div className="space-y-1 text-sm">
                    <div>Stocks créés: <span className="font-medium text-green-600">{result.actions.stocksCreated}</span></div>
                    <div>Stocks synchronisés: <span className="font-medium text-blue-600">{result.actions.stocksSynced}</span></div>
                    <div>Produits test créés: <span className="font-medium text-purple-600">{result.actions.testProductsCreated}</span></div>
                  </div>
                </div>

                {/* Alertes */}
                <div className="bg-white rounded-lg p-4 border">
                  <h4 className="font-medium text-gray-800 mb-2">🚨 Alertes</h4>
                  <div className="space-y-1 text-sm">
                    <div>Ruptures: <span className="font-medium text-red-600">{result.alerts.outOfStock}</span></div>
                    <div>Stock faible: <span className="font-medium text-orange-600">{result.alerts.lowStock}</span></div>
                    <div className="pt-1 border-t">
                      <strong>Total alertes: <span className="text-red-600">{result.alerts.totalAlerts}</span></strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {result.alerts.totalAlerts > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800 mb-2">🎉 Alertes disponibles !</h4>
                <p className="text-yellow-700 mb-3">
                  {result.alerts.totalAlerts} alertes sont maintenant disponibles dans le tableau de bord.
                </p>
                <div className="flex gap-3">
                  <a
                    href="/dashboard"
                    className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    📊 Voir le tableau de bord
                  </a>
                  <a
                    href="/stocks"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    📦 Voir les stocks
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-3">🔗 Liens utiles</h3>
          <div className="flex flex-wrap gap-3">
            <a
              href="/dashboard"
              className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              📊 Tableau de bord
            </a>
            <a
              href="/stocks"
              className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              📦 Gestion des stocks
            </a>
            <a
              href="/products"
              className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              🏷️ Gestion des produits
            </a>
            <a
              href="/test-stock"
              className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              🧪 Test des stocks
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
