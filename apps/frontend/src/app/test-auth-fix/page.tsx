'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { usePurchaseOrderForm } from '@/hooks/usePurchaseOrderForm'
import { useAuth } from '@/stores/auth'

export default function TestAuthFixPage() {
  const { user, isAuthenticated } = useAuth()
  const [testResult, setTestResult] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const {
    formData,
    validation,
    updateField,
    addItem,
    updateItem,
    submitForm
  } = usePurchaseOrderForm()

  const runAuthTest = async () => {
    setIsLoading(true)
    setTestResult('')

    try {
      // Test 1: Vérifier l'utilisateur
      console.log('🧪 Test 1: Vérification de l\'utilisateur')
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

      // Test 2: Préparer un formulaire valide
      console.log('🧪 Test 2: Préparation du formulaire')
      
      // Remplir les champs requis
      updateField('supplierId', 'test-supplier-123')
      updateField('orderDate', '2025-01-15')
      updateField('expectedDate', '2025-01-22')
      updateField('notes', 'Test de soumission')

      // Ajouter un article
      addItem()
      updateItem(0, 'productId', 'test-product-456')
      updateItem(0, 'quantity', 5)
      updateItem(0, 'unitPrice', 100.50)

      // Attendre un peu pour que la validation se mette à jour
      await new Promise(resolve => setTimeout(resolve, 100))

      console.log('🧪 Validation:', validation)

      if (!validation.isValid) {
        setTestResult(`❌ ÉCHEC: Formulaire invalide - ${Object.keys(validation.errors).join(', ')}`)
        return
      }

      // Test 3: Tenter la soumission
      console.log('🧪 Test 3: Tentative de soumission')
      
      try {
        const result = await submitForm()
        console.log('✅ Soumission réussie:', result)
        setTestResult('✅ SUCCÈS: Formulaire soumis avec succès ! L\'erreur d\'authentification est corrigée.')
      } catch (submitError: any) {
        console.error('❌ Erreur de soumission:', submitError)
        
        if (submitError.message.includes('Utilisateur non authentifié')) {
          setTestResult('❌ ÉCHEC: Erreur d\'authentification persiste')
        } else {
          setTestResult(`⚠️ AUTRE ERREUR: ${submitError.message} (mais l'authentification fonctionne)`)
        }
      }

    } catch (error: any) {
      console.error('❌ Erreur générale:', error)
      setTestResult(`❌ ERREUR: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <MainLayout
      title="Test de Correction d'Authentification"
      subtitle="Vérification que le hook usePurchaseOrderForm utilise le bon store d'authentification"
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
          <h2 className="text-lg font-semibold mb-4">📋 État du Formulaire</h2>
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

        {/* Test de soumission */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">🧪 Test de Soumission</h2>
          
          <button
            onClick={runAuthTest}
            disabled={isLoading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Test en cours...' : 'Lancer le test d\'authentification'}
          </button>

          {testResult && (
            <div className="mt-4 p-4 border rounded-lg">
              <p className="font-medium">Résultat du test:</p>
              <p className="mt-2 text-sm">{testResult}</p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">📝 Instructions</h2>
          <div className="text-sm text-blue-700 space-y-2">
            <p>1. Vérifiez que vous êtes bien connecté (section "État d'Authentification")</p>
            <p>2. Cliquez sur "Lancer le test d'authentification"</p>
            <p>3. Le test va :</p>
            <ul className="ml-4 space-y-1">
              <li>• Vérifier l'état d'authentification</li>
              <li>• Remplir automatiquement un formulaire valide</li>
              <li>• Tenter de soumettre le formulaire</li>
              <li>• Afficher le résultat</li>
            </ul>
            <p className="font-medium">✅ Si le test réussit, l'erreur "Utilisateur non authentifié" est corrigée !</p>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
