'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { usePurchaseOrderForm } from '@/hooks/usePurchaseOrderForm'
import { useAuth } from '@/stores/auth'

export default function TestCompleteFlowPage() {
  const { user, isAuthenticated } = useAuth()
  const [testResult, setTestResult] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [testStep, setTestStep] = useState<string>('')
  const [createdOrderId, setCreatedOrderId] = useState<string>('')

  const {
    formData,
    validation,
    updateField,
    addItem,
    updateItem,
    submitForm,
    resetForm
  } = usePurchaseOrderForm()

  const runCompleteTest = async () => {
    setIsLoading(true)
    setTestResult('')
    setTestStep('')
    setCreatedOrderId('')

    try {
      setTestStep('🔄 Réinitialisation du formulaire...')
      resetForm()
      await new Promise(resolve => setTimeout(resolve, 100))

      setTestStep('🔍 Vérification de l\'authentification...')
      if (!user || !isAuthenticated) {
        setTestResult('❌ ÉCHEC: Utilisateur non authentifié')
        return
      }

      setTestStep('📋 Remplissage du formulaire avec des données réelles...')
      
      // Utiliser des IDs réels qui existent dans la base de données
      updateField('supplierId', 'supplier-alger-distrib')
      updateField('orderDate', new Date().toISOString().split('T')[0])
      updateField('expectedDate', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      updateField('notes', `Test complet - ${new Date().toLocaleString()}`)

      // Ajouter des articles avec des IDs réels
      addItem()
      updateItem(0, 'productId', 'product-laptop-dell')
      updateItem(0, 'quantity', 3)
      updateItem(0, 'unitPrice', 899.99)

      addItem()
      updateItem(1, 'productId', 'product-mouse-logitech')
      updateItem(1, 'quantity', 10)
      updateItem(1, 'unitPrice', 25.50)

      // Attendre que la validation se mette à jour
      await new Promise(resolve => setTimeout(resolve, 300))

      setTestStep('✅ Validation du formulaire...')
      if (!validation.isValid) {
        setTestResult(`❌ ÉCHEC: Formulaire invalide - ${Object.keys(validation.errors).join(', ')}`)
        return
      }

      setTestStep('🚀 Soumission de la commande d\'achat...')
      
      const result = await submitForm()

      if (result && result.id) {
        setCreatedOrderId(result.id)
        setTestStep('🎉 Commande créée avec succès!')
        setTestResult(`🎉 SUCCÈS COMPLET! 
        
Commande d'achat créée avec succès:
• ID: ${result.id}
• Numéro: ${result.number || 'N/A'}
• Statut: ${result.status || 'N/A'}
• Total: ${result.total || 'N/A'}€
• Fournisseur: ${result.supplier?.name || 'N/A'}
• Articles: ${result.items?.length || 0} article(s)

✅ Toutes les corrections fonctionnent parfaitement!`)
      } else {
        setTestResult('⚠️ Commande créée mais structure de réponse inattendue')
      }

    } catch (error: any) {
      console.error('❌ Erreur lors du test complet:', error)
      setTestStep('❌ Test échoué')
      
      if (error.message.includes('quantiteActuelle')) {
        setTestResult('❌ ÉCHEC: L\'erreur backend "quantiteActuelle" persiste encore')
      } else if (error.message.includes('Utilisateur non authentifié')) {
        setTestResult('❌ ÉCHEC: Problème d\'authentification non résolu')
      } else if (error.message.includes('Fournisseur non trouvé')) {
        setTestResult('⚠️ ERREUR: Fournisseur de test non trouvé en base de données')
      } else if (error.message.includes('produits n\'existent pas')) {
        setTestResult('⚠️ ERREUR: Produits de test non trouvés en base de données')
      } else {
        setTestResult(`❌ ERREUR: ${error.message}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const verifyInDatabase = async () => {
    if (!createdOrderId) {
      setTestResult('❌ Aucune commande à vérifier')
      return
    }

    try {
      setTestStep('🔍 Vérification en base de données...')
      
      // Appel API pour récupérer la commande créée
      const response = await fetch(`/api/v1/purchase-orders/${createdOrderId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setTestResult(prev => prev + `

🔍 VÉRIFICATION BASE DE DONNÉES:
✅ Commande trouvée en base de données
• Statut: ${data.data.status}
• Date création: ${new Date(data.data.createdAt).toLocaleString()}
• Articles: ${data.data.items.length}
• Total calculé: ${data.data.total}€

🎯 CONCLUSION: Le flux complet fonctionne parfaitement!`)
      } else {
        setTestResult(prev => prev + `

❌ VÉRIFICATION BASE DE DONNÉES:
Erreur lors de la récupération: ${response.status}`)
      }
    } catch (error: any) {
      setTestResult(prev => prev + `

❌ VÉRIFICATION BASE DE DONNÉES:
Erreur: ${error.message}`)
    }
  }

  return (
    <MainLayout
      title="Test du Flux Complet"
      subtitle="Test de bout en bout: Validation → Authentification → API → Base de données"
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
          
          {formData.items.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded">
              <p className="text-sm font-medium text-gray-800">Articles:</p>
              {formData.items.map((item, index) => (
                <div key={index} className="mt-1 text-sm text-gray-600">
                  • {item.productId}: {item.quantity} × {item.unitPrice}€ = {(item.quantity * item.unitPrice).toFixed(2)}€
                </div>
              ))}
              <div className="mt-2 pt-2 border-t border-gray-300 text-sm font-medium text-gray-800">
                Total: {formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toFixed(2)}€
              </div>
            </div>
          )}
        </div>

        {/* Test complet */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">🧪 Test du Flux Complet</h2>
          
          <div className="space-x-4">
            <button
              onClick={runCompleteTest}
              disabled={isLoading}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Test en cours...' : '🚀 Lancer le test complet'}
            </button>

            {createdOrderId && (
              <button
                onClick={verifyInDatabase}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                🔍 Vérifier en base de données
              </button>
            )}
          </div>

          {testStep && (
            <div className="mt-4 p-3 border border-blue-200 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-800">Étape actuelle:</p>
              <p className="mt-1 text-sm text-blue-700">{testStep}</p>
            </div>
          )}

          {testResult && (
            <div className="mt-4 p-4 border rounded-lg">
              <p className="font-medium">Résultat du test:</p>
              <pre className="mt-2 text-sm whitespace-pre-wrap">{testResult}</pre>
            </div>
          )}
        </div>

        {/* Résumé des corrections */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-green-800 mb-2">✅ Corrections Appliquées</h2>
          <div className="text-sm text-green-700 space-y-2">
            <p><strong>1. Validation automatique (Frontend):</strong> useEffect pour recalcul en temps réel</p>
            <p><strong>2. Authentification (Frontend):</strong> Utilisation du bon store d'auth</p>
            <p><strong>3. API Backend:</strong> Correction quantity au lieu de quantiteActuelle</p>
            <p className="font-medium mt-4">🎯 Ce test vérifie que toutes les corrections fonctionnent ensemble!</p>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
