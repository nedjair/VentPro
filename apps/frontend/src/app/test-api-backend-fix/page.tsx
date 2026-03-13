'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { usePurchaseOrderForm } from '@/hooks/usePurchaseOrderForm'
import { useAuth } from '@/stores/auth'

export default function TestApiBackendFixPage() {
  const { user, isAuthenticated } = useAuth()
  const [testResult, setTestResult] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [testStep, setTestStep] = useState<string>('')

  const {
    formData,
    validation,
    updateField,
    addItem,
    updateItem,
    submitForm
  } = usePurchaseOrderForm()

  const runBackendTest = async () => {
    setIsLoading(true)
    setTestResult('')
    setTestStep('')

    try {
      setTestStep('🔍 Vérification de l\'authentification...')
      console.log('🧪 Test Backend: Vérification de l\'utilisateur')
      console.log('User:', user)
      console.log('isAuthenticated:', isAuthenticated)

      if (!user) {
        setTestResult('❌ ÉCHEC: Utilisateur non trouvé')
        return
      }

      if (!isAuthenticated) {
        setTestResult('❌ ÉCHEC: Utilisateur non authentifié')
        return
      }

      setTestStep('📋 Préparation du formulaire de test...')
      console.log('🧪 Test Backend: Préparation du formulaire')
      
      // Remplir les champs requis avec des données de test
      updateField('supplierId', 'supplier-alger-distrib')
      updateField('orderDate', '2025-01-15')
      updateField('expectedDate', '2025-01-22')
      updateField('notes', 'Test de correction backend - quantité au lieu de quantiteActuelle')

      // Ajouter un article de test
      addItem()
      updateItem(0, 'productId', 'product-laptop-dell')
      updateItem(0, 'quantity', 5)
      updateItem(0, 'unitPrice', 850.00)

      // Attendre un peu pour que la validation se mette à jour
      await new Promise(resolve => setTimeout(resolve, 200))

      setTestStep('✅ Validation du formulaire...')
      console.log('🧪 Test Backend: Validation:', validation)

      if (!validation.isValid) {
        setTestResult(`❌ ÉCHEC: Formulaire invalide - ${Object.keys(validation.errors).join(', ')}`)
        return
      }

      setTestStep('🚀 Tentative de soumission à l\'API backend...')
      console.log('🧪 Test Backend: Tentative de soumission')
      console.log('Données à envoyer:', {
        supplierId: formData.supplierId,
        orderDate: formData.orderDate,
        expectedDate: formData.expectedDate,
        notes: formData.notes,
        items: formData.items
      })
      
      try {
        const result = await submitForm()
        console.log('✅ Soumission réussie:', result)
        setTestResult('🎉 SUCCÈS COMPLET: Commande d\'achat créée avec succès ! La correction backend fonctionne parfaitement.')
        setTestStep('✅ Test terminé avec succès')
      } catch (submitError: any) {
        console.error('❌ Erreur de soumission:', submitError)
        
        if (submitError.message.includes('quantiteActuelle')) {
          setTestResult('❌ ÉCHEC: L\'erreur "quantiteActuelle" persiste dans le backend')
        } else if (submitError.message.includes('Utilisateur non authentifié')) {
          setTestResult('❌ ÉCHEC: Erreur d\'authentification (problème résolu précédemment)')
        } else if (submitError.message.includes('Erreur serveur')) {
          setTestResult(`⚠️ ERREUR SERVEUR: ${submitError.message} - Vérifiez les logs du backend`)
        } else {
          setTestResult(`⚠️ AUTRE ERREUR: ${submitError.message}`)
        }
        setTestStep('❌ Test échoué')
      }

    } catch (error: any) {
      console.error('❌ Erreur générale:', error)
      setTestResult(`❌ ERREUR GÉNÉRALE: ${error.message}`)
      setTestStep('❌ Test interrompu')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <MainLayout
      title="Test de Correction Backend API"
      subtitle="Vérification que la correction 'quantity' au lieu de 'quantiteActuelle' fonctionne"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* État d'authentification */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">🔍 État d'Authentification</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Utilisateur:</span>
              <span className={`ml-2 ${user ? 'text-green-600' : 'text-red-600'}`}>
                {user ? `${user.email} (${user.role})` : 'Non connecté'}
              </span>
            </div>
            <div>
              <span className="font-medium">Authentifié:</span>
              <span className={`ml-2 ${isAuthenticated ? 'text-green-600' : 'text-red-600'}`}>
                {isAuthenticated ? 'Oui' : 'Non'}
              </span>
            </div>
          </div>
        </div>

        {/* État du formulaire */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">📋 État du Formulaire de Test</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Fournisseur:</span>
              <span className="ml-2">{formData.supplierId || 'Non sélectionné'}</span>
            </div>
            <div>
              <span className="font-medium">Date commande:</span>
              <span className="ml-2">{formData.orderDate || 'Non définie'}</span>
            </div>
            <div>
              <span className="font-medium">Articles:</span>
              <span className="ml-2">{formData.items.length} article(s)</span>
            </div>
            <div>
              <span className="font-medium">Validation:</span>
              <span className={`ml-2 ${validation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                {validation.isValid ? 'Valide' : 'Invalide'}
              </span>
            </div>
          </div>
          
          {formData.items.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded">
              <p className="text-sm font-medium text-gray-800">Articles de test:</p>
              {formData.items.map((item, index) => (
                <div key={index} className="mt-1 text-sm text-gray-600">
                  • Produit: {item.productId}, Quantité: {item.quantity}, Prix: {item.unitPrice}€
                </div>
              ))}
            </div>
          )}

          {!validation.isValid && Object.keys(validation.errors).length > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm font-medium text-red-800">Erreurs de validation:</p>
              <ul className="mt-1 text-sm text-red-700">
                {Object.entries(validation.errors).map(([field, error]) => (
                  <li key={field}>• {field}: {error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Test de l'API backend */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">🧪 Test de l'API Backend</h2>
          
          <button
            onClick={runBackendTest}
            disabled={isLoading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Test en cours...' : 'Lancer le test de correction backend'}
          </button>

          {testStep && (
            <div className="mt-4 p-3 border border-blue-200 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-800">Étape actuelle:</p>
              <p className="mt-1 text-sm text-blue-700">{testStep}</p>
            </div>
          )}

          {testResult && (
            <div className="mt-4 p-4 border rounded-lg">
              <p className="font-medium">Résultat du test:</p>
              <p className="mt-2 text-sm">{testResult}</p>
            </div>
          )}
        </div>

        {/* Explication de la correction */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">🔧 Correction Appliquée</h2>
          <div className="text-sm text-yellow-700 space-y-2">
            <p><strong>Problème identifié:</strong> Dans l'API backend, ligne 175 de <code>purchase-orders.ts</code></p>
            <p><strong>Erreur:</strong> <code>quantity: item.quantiteActuelle</code> (propriété inexistante)</p>
            <p><strong>Correction:</strong> <code>quantity: item.quantity</code> (propriété correcte)</p>
            <p className="font-medium">✅ Si ce test réussit, la correction backend fonctionne parfaitement !</p>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">📝 Instructions</h2>
          <div className="text-sm text-blue-700 space-y-2">
            <p>1. Vérifiez que vous êtes bien connecté (section "État d'Authentification")</p>
            <p>2. Cliquez sur "Lancer le test de correction backend"</p>
            <p>3. Le test va :</p>
            <ul className="ml-4 space-y-1">
              <li>• Vérifier l'authentification</li>
              <li>• Remplir automatiquement un formulaire de test</li>
              <li>• Valider le formulaire</li>
              <li>• Envoyer la requête à l'API backend</li>
              <li>• Afficher le résultat</li>
            </ul>
            <p className="font-medium">🎯 Objectif: Vérifier que l'erreur "quantiteActuelle" est corrigée</p>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
