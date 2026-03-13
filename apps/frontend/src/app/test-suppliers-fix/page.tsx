'use client'

import { useState, useEffect } from 'react'
import { usePurchaseOrderForm } from '@/hooks/usePurchaseOrderForm'

export default function TestSuppliersFixPage() {
  const { suppliers, loadingSuppliers, error } = usePurchaseOrderForm()
  const [logs, setLogs] = useState<string[]>([])

  // Intercepter les logs console
  useEffect(() => {
    const originalLog = console.log
    const originalError = console.error

    console.log = (...args) => {
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ')
      setLogs(prev => [...prev, `[LOG] ${new Date().toLocaleTimeString()}: ${message}`])
      originalLog(...args)
    }

    console.error = (...args) => {
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ')
      setLogs(prev => [...prev, `[ERROR] ${new Date().toLocaleTimeString()}: ${message}`])
      originalError(...args)
    }

    return () => {
      console.log = originalLog
      console.error = originalError
    }
  }, [])

  useEffect(() => {
    setLogs(prev => [...prev, `[INFO] ${new Date().toLocaleTimeString()}: Hook state - suppliers: ${suppliers.length}, loading: ${loadingSuppliers}, error: ${error || 'none'}`])
  }, [suppliers, loadingSuppliers, error])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🔧 Test des Corrections - Fournisseurs
        </h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">État du Chargement</h2>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="font-medium">Chargement en cours:</span>
              <span className={loadingSuppliers ? "text-orange-600" : "text-green-600"}>
                {loadingSuppliers ? "🔄 Oui" : "✅ Non"}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-medium">Erreur:</span>
              <span className={error ? "text-red-600" : "text-green-600"}>
                {error ? `❌ ${error}` : "✅ Aucune"}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-medium">Nombre de fournisseurs:</span>
              <span className="text-blue-600 font-bold">
                📊 {suppliers.length}
              </span>
            </div>
          </div>
        </div>

        {suppliers.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Liste des Fournisseurs</h2>
            <div className="space-y-3">
              {suppliers.map((supplier, index) => (
                <div key={supplier.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {index + 1}. {supplier.name}
                      </h3>
                      <p className="text-sm text-gray-600">{supplier.email}</p>
                      <p className="text-xs text-gray-500">ID: {supplier.id}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded text-xs ${
                        supplier.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {supplier.isActive ? '✅ Actif' : '❌ Inactif'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loadingSuppliers && suppliers.length === 0 && !error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-yellow-800 mb-2">
              ⚠️ Aucun Fournisseur Trouvé
            </h2>
            <p className="text-yellow-700">
              Le hook a terminé le chargement mais aucun fournisseur n'a été retourné.
              Vérifiez les logs de la console pour plus de détails.
            </p>
          </div>
        )}

        {/* Section des logs */}
        <div className="bg-gray-900 text-green-400 rounded-lg p-4 mt-6">
          <h2 className="text-xl font-semibold mb-4 text-white">📋 Logs en Temps Réel</h2>
          <div className="max-h-96 overflow-y-auto space-y-1 text-sm font-mono">
            {logs.length === 0 ? (
              <p className="text-gray-400">Aucun log pour le moment...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className={`${
                  log.includes('[ERROR]') ? 'text-red-400' :
                  log.includes('[LOG]') ? 'text-green-400' : 'text-blue-400'
                }`}>
                  {log}
                </div>
              ))
            )}
          </div>
          <button
            onClick={() => setLogs([])}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            🗑️ Vider les logs
          </button>
        </div>
      </div>
    </div>
  )
}
