'use client'

import { useState } from 'react'
import { api } from '@/lib/api'

export default function TestStockPage() {
  const [results, setResults] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testStockAPI = async () => {
    setLoading(true)
    setResults([])
    
    try {
      addResult('🧪 Début des tests du module de stock...')
      
      // Test 1: Vérifier la connectivité API
      addResult('1. Test de connectivité API...')
      try {
        const response = await api.get('/api/v1/stock')
        if (response.status === 401) {
          addResult('   ✅ API accessible (authentification requise - normal)')
        } else {
          addResult(`   ⚠️ Réponse inattendue: ${response.status}`)
        }
      } catch (error: any) {
        if (error.response?.status === 401) {
          addResult('   ✅ API accessible (authentification requise - normal)')
        } else {
          addResult(`   ❌ Erreur API: ${error.message}`)
        }
      }
      
      // Test 2: Vérifier les alertes
      addResult('2. Test endpoint alertes...')
      try {
        const response = await api.get('/api/v1/stock/alerts')
        if (response.status === 401) {
          addResult('   ✅ Endpoint alertes accessible (auth requise)')
        } else {
          addResult(`   ⚠️ Réponse inattendue: ${response.status}`)
        }
      } catch (error: any) {
        if (error.response?.status === 401) {
          addResult('   ✅ Endpoint alertes accessible (auth requise)')
        } else {
          addResult(`   ❌ Erreur alertes: ${error.message}`)
        }
      }
      
      addResult('📊 Tests terminés!')
      addResult('💡 Pour tester complètement, connectez-vous d\'abord')
      
    } catch (error: any) {
      addResult(`❌ Erreur générale: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const testWithAuth = async () => {
    setLoading(true)
    setResults([])
    
    try {
      addResult('🔐 Tests avec authentification...')
      
      // Test avec authentification
      const response = await api.get('/api/v1/stock')
      
      if (response.data.success) {
        const stocks = Array.isArray(response.data.data) ? response.data.data : []
        addResult(`✅ ${stocks.length} stocks récupérés`)
        
        if (stocks.length > 0) {
          addResult(`   Premier stock: ${stocks[0].product?.name || 'Nom non disponible'}`)
        }
      } else {
        addResult(`⚠️ Réponse API: ${response.data.message}`)
      }
      
      // Test des alertes avec auth
      const alertsResponse = await api.get('/api/v1/stock/alerts')
      if (alertsResponse.data.success) {
        const alerts = alertsResponse.data.data
        addResult(`✅ Alertes récupérées: ${alerts.totalAlerts || 0} total`)
        addResult(`   Ruptures: ${alerts.outOfStock?.length || 0}`)
        addResult(`   Stock faible: ${alerts.lowStock?.length || 0}`)
      }
      
    } catch (error: any) {
      if (error.response?.status === 401) {
        addResult('❌ Non authentifié - connectez-vous d\'abord')
      } else {
        addResult(`❌ Erreur: ${error.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            🧪 Test du Module de Stock
          </h1>
          
          <div className="space-y-4 mb-6">
            <button
              onClick={testStockAPI}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Test en cours...' : 'Tester API (sans auth)'}
            </button>
            
            <button
              onClick={testWithAuth}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 ml-4"
            >
              {loading ? 'Test en cours...' : 'Tester avec authentification'}
            </button>
          </div>
          
          <div className="bg-gray-900 text-green-400 p-4 rounded-md font-mono text-sm">
            <div className="mb-2 text-white">📋 Résultats des tests:</div>
            {results.length === 0 ? (
              <div className="text-gray-400">Cliquez sur un bouton pour commencer les tests...</div>
            ) : (
              <div className="space-y-1">
                {results.map((result, index) => (
                  <div key={index}>{result}</div>
                ))}
              </div>
            )}
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-md">
            <h3 className="font-medium text-blue-900 mb-2">Instructions:</h3>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Testez d'abord "API (sans auth)" pour vérifier la connectivité</li>
              <li>2. Connectez-vous à l'application principale</li>
              <li>3. Revenez ici et testez "avec authentification"</li>
              <li>4. Allez sur <a href="/stocks" className="underline">/stocks</a> pour tester l'interface</li>
              <li>5. Vérifiez le <a href="/dashboard" className="underline">dashboard</a> pour les alertes</li>
            </ol>
          </div>
          
          <div className="mt-4 p-4 bg-yellow-50 rounded-md">
            <h3 className="font-medium text-yellow-900 mb-2">Liens de test:</h3>
            <div className="space-x-4">
              <a href="/stocks" className="text-blue-600 hover:underline">📦 Gestion des Stocks</a>
              <a href="/stocks/new" className="text-blue-600 hover:underline">➕ Nouveau Stock</a>
              <a href="/dashboard" className="text-blue-600 hover:underline">📊 Dashboard</a>
              <a href="/" className="text-blue-600 hover:underline">🏠 Accueil</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
