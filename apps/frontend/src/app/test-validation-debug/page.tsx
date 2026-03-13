'use client'

import { useState, useEffect } from 'react'
import { usePurchaseOrderForm } from '@/hooks/usePurchaseOrderForm'

export default function TestValidationDebugPage() {
  const {
    formData,
    validation,
    suppliers,
    products,
    loadingSuppliers,
    loadingProducts,
    updateField,
    addItem,
    updateItem,
    validateForm
  } = usePurchaseOrderForm()

  const [logs, setLogs] = useState<string[]>([])

  // Logger les changements d'état
  useEffect(() => {
    const log = `[${new Date().toLocaleTimeString()}] État validation: isValid=${validation.isValid}, erreurs=${JSON.stringify(validation.errors)}`
    setLogs(prev => [...prev.slice(-10), log]) // Garder seulement les 10 derniers logs
  }, [validation])

  useEffect(() => {
    const log = `[${new Date().toLocaleTimeString()}] FormData: supplierId=${formData.supplierId}, orderDate=${formData.orderDate}, items=${formData.items.length}`
    setLogs(prev => [...prev.slice(-10), log])
  }, [formData])

  const testValidation = () => {
    const result = validateForm()
    setLogs(prev => [...prev.slice(-10), `[${new Date().toLocaleTimeString()}] Test validation manuelle: ${result}`])
  }

  const fillTestData = () => {
    // Remplir avec des données de test
    updateField('supplierId', suppliers[0]?.id || 'test-supplier')
    updateField('orderDate', new Date().toISOString().split('T')[0])
    updateField('expectedDate', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    
    // Ajouter un article de test
    addItem()
    setTimeout(() => {
      updateItem(0, 'productId', products[0]?.id || 'test-product')
      updateItem(0, 'quantity', 5)
      updateItem(0, 'unitPrice', 100)
    }, 100)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🐛 Debug Validation du Formulaire
        </h1>

        {/* État actuel */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">📊 État Actuel</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-semibold">Validation</h3>
              <p className={`text-2xl font-bold ${validation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                {validation.isValid ? '✅ Valide' : '❌ Invalide'}
              </p>
              <p className="text-sm text-gray-600">
                Erreurs: {Object.keys(validation.errors).length}
              </p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-semibold">Données</h3>
              <p className="text-sm">
                Fournisseur: {formData.supplierId ? '✅' : '❌'}<br/>
                Date: {formData.orderDate ? '✅' : '❌'}<br/>
                Articles: {formData.items.length}
              </p>
            </div>
          </div>

          {/* Erreurs détaillées */}
          {Object.keys(validation.errors).length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
              <h3 className="font-semibold text-red-800 mb-2">Erreurs de validation:</h3>
              <ul className="text-sm text-red-700 space-y-1">
                {Object.entries(validation.errors).map(([field, error]) => (
                  <li key={field}>• {field}: {error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Actions de test */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">🧪 Actions de Test</h2>
          
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={testValidation}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              🔍 Tester Validation Manuelle
            </button>
            
            <button
              onClick={fillTestData}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              disabled={loadingSuppliers || loadingProducts}
            >
              📝 Remplir Données Test
            </button>
            
            <button
              onClick={() => setLogs([])}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              🗑️ Vider Logs
            </button>
          </div>
        </div>

        {/* Formulaire simple */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">📝 Formulaire Simplifié</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Fournisseur</label>
              <select
                value={formData.supplierId}
                onChange={(e) => updateField('supplierId', e.target.value)}
                className="w-full border rounded px-3 py-2"
                disabled={loadingSuppliers}
              >
                <option value="">Sélectionner...</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Date de commande</label>
              <input
                type="date"
                value={formData.orderDate}
                onChange={(e) => updateField('orderDate', e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Articles</label>
              <p className="text-sm text-gray-600">
                {formData.items.length} article(s) ajouté(s)
              </p>
            </div>
          </div>
        </div>

        {/* Logs */}
        <div className="bg-gray-900 text-green-400 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4 text-white">📋 Logs de Debug</h2>
          <div className="max-h-96 overflow-y-auto space-y-1 text-sm font-mono">
            {logs.length === 0 ? (
              <p className="text-gray-400">Aucun log pour le moment...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="text-green-400">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
