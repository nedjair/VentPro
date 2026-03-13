'use client'

import { useState } from 'react'
import { api } from '@/lib/api'

export default function TestApiDirectPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testSuppliers = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log('🔍 Test direct de l\'API suppliers...')
      const response = await api.get('/api/v1/suppliers?isActive=true&limit=100')
      console.log('✅ Réponse reçue:', response)
      
      setResult({
        status: response.status,
        success: response.data?.success,
        dataStructure: {
          hasData: !!response.data?.data,
          hasDataData: !!response.data?.data?.data,
          suppliersCount: response.data?.data?.data?.length || 0,
          paginationInfo: response.data?.data?.pagination
        },
        suppliers: response.data?.data?.data || [],
        fullResponse: response.data
      })
    } catch (err: any) {
      console.error('❌ Erreur:', err)
      setError(err.message || 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🧪 Test Direct de l'API
        </h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <button
            onClick={testSuppliers}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '🔄 Test en cours...' : '🚀 Tester l\'API Suppliers'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-red-800 mb-2">❌ Erreur</h2>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">📊 Résultats</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-semibold">Status HTTP</h3>
                <p className="text-2xl font-bold text-green-600">{result.status}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-semibold">Success</h3>
                <p className="text-2xl font-bold text-green-600">
                  {result.success ? '✅' : '❌'}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-semibold">Structure Data</h3>
                <p className="text-sm">
                  data: {result.dataStructure.hasData ? '✅' : '❌'}<br/>
                  data.data: {result.dataStructure.hasDataData ? '✅' : '❌'}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-semibold">Fournisseurs</h3>
                <p className="text-2xl font-bold text-blue-600">
                  {result.dataStructure.suppliersCount}
                </p>
              </div>
            </div>

            {result.suppliers.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">📋 Liste des Fournisseurs</h3>
                <div className="space-y-2">
                  {result.suppliers.slice(0, 5).map((supplier: any, index: number) => (
                    <div key={supplier.id} className="border rounded p-3 bg-gray-50">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">{supplier.name}</h4>
                          <p className="text-sm text-gray-600">{supplier.email}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${
                          supplier.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {supplier.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                    </div>
                  ))}
                  {result.suppliers.length > 5 && (
                    <p className="text-gray-500 text-center">
                      ... et {result.suppliers.length - 5} autres fournisseurs
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="bg-gray-900 text-green-400 rounded p-4">
              <h3 className="text-lg font-semibold mb-2 text-white">🔍 Réponse Complète</h3>
              <pre className="text-xs overflow-auto max-h-96">
                {JSON.stringify(result.fullResponse, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
