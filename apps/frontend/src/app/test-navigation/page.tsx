'use client'

import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle, AlertCircle, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'

// Modules à tester
const MODULES = [
  { name: 'Dashboard', path: '/dashboard', icon: '📊' },
  { name: 'Analytics', path: '/analytics', icon: '📈' },
  { name: 'Clients', path: '/clients', icon: '👥' },
  { name: 'Produits', path: '/products', icon: '📦' },
  { name: 'Stock', path: '/stocks', icon: '🏪', restored: true },
  { name: 'Fournisseurs', path: '/suppliers', icon: '🚚', restored: true },
  { name: 'Commandes & Devis', path: '/orders', icon: '🛒', restored: true },
  { name: 'Factures', path: '/invoices', icon: '🧾', restored: true },
  { name: 'Paiements', path: '/payments', icon: '💳', restored: true },
  { name: 'Achats', path: '/purchase-orders', icon: '🛍️', restored: true },
  { name: 'Rapports', path: '/reports', icon: '📊' },
  { name: 'Diagnostic', path: '/diagnostic', icon: '🩺' },
]

interface ModuleTestResult {
  name: string
  path: string
  icon: string
  restored?: boolean
  sidebarVisible: boolean
  pageAccessible: boolean
  error?: string
}

export default function TestNavigationPage() {
  const [testResults, setTestResults] = useState<ModuleTestResult[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    testModules()
  }, [])

  const testModules = async () => {
    setIsLoading(true)
    const results: ModuleTestResult[] = []

    for (const module of MODULES) {
      const result: ModuleTestResult = {
        ...module,
        sidebarVisible: false,
        pageAccessible: false
      }

      // Test 1: Vérifier si le module est visible dans le sidebar
      try {
        const sidebarElements = document.querySelectorAll('.nav-item')
        const moduleInSidebar = Array.from(sidebarElements).some(element => {
          const text = element.textContent || ''
          return text.includes(module.name) || element.getAttribute('href') === module.path
        })
        result.sidebarVisible = moduleInSidebar
      } catch (error) {
        result.error = `Erreur sidebar: ${error}`
      }

      // Test 2: Tester l'accessibilité de la page
      try {
        const response = await fetch(module.path, { method: 'HEAD' })
        result.pageAccessible = response.ok
      } catch (error) {
        result.pageAccessible = false
        result.error = `Erreur page: ${error}`
      }

      results.push(result)
    }

    setTestResults(results)
    setIsLoading(false)
  }

  const getStatusIcon = (result: ModuleTestResult) => {
    if (result.sidebarVisible && result.pageAccessible) {
      return <CheckCircle className="h-5 w-5 text-green-500" />
    } else if (result.sidebarVisible || result.pageAccessible) {
      return <AlertCircle className="h-5 w-5 text-yellow-500" />
    } else {
      return <XCircle className="h-5 w-5 text-red-500" />
    }
  }

  const getStatusText = (result: ModuleTestResult) => {
    if (result.sidebarVisible && result.pageAccessible) {
      return 'Fonctionnel'
    } else if (result.sidebarVisible || result.pageAccessible) {
      return 'Partiel'
    } else {
      return 'Problème'
    }
  }

  const restoredModules = testResults.filter(r => r.restored)
  const restoredWorking = restoredModules.filter(r => r.sidebarVisible && r.pageAccessible)
  const totalWorking = testResults.filter(r => r.sidebarVisible && r.pageAccessible)

  return (
    <MainLayout title="Test de Navigation" subtitle="Vérification des modules dans le menu principal">
      <div className="space-y-6">
        {/* Résumé */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="text-2xl">📊</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Modules</p>
                  <p className="text-2xl font-bold text-gray-900">{MODULES.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Fonctionnels</p>
                  <p className="text-2xl font-bold text-green-600">{totalWorking.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <span className="text-2xl">🔧</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Restaurés</p>
                  <p className="text-2xl font-bold text-purple-600">{restoredModules.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <span className="text-2xl">✅</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Restaurés OK</p>
                  <p className="text-2xl font-bold text-emerald-600">{restoredWorking.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={testModules}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Test en cours...' : 'Relancer les tests'}
          </button>
        </div>

        {/* Résultats des tests */}
        <Card>
          <CardHeader>
            <CardTitle>Résultats des Tests de Navigation</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Test des modules en cours...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      result.restored ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <span className="text-2xl">{result.icon}</span>
                        <div>
                          <h3 className="font-medium text-gray-900 flex items-center gap-2">
                            {result.name}
                            {result.restored && (
                              <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">
                                Restauré
                              </span>
                            )}
                          </h3>
                          <p className="text-sm text-gray-500">{result.path}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        {/* Statut Sidebar */}
                        <div className="text-center">
                          <div className="flex items-center justify-center">
                            {result.sidebarVisible ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Sidebar</p>
                        </div>

                        {/* Statut Page */}
                        <div className="text-center">
                          <div className="flex items-center justify-center">
                            {result.pageAccessible ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Page</p>
                        </div>

                        {/* Statut Global */}
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(result)}
                          <span className="text-sm font-medium">{getStatusText(result)}</span>
                        </div>

                        {/* Lien de test */}
                        <Link
                          href={result.path}
                          className="p-2 text-blue-600 hover:text-blue-800"
                          title={`Tester ${result.name}`}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>

                    {result.error && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        {result.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instructions de Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">1. Vérification du Sidebar</h4>
                <p className="text-sm text-gray-600">
                  Regardez le menu de gauche et vérifiez que tous les modules sont visibles.
                  Les modules restaurés doivent être particulièrement vérifiés.
                </p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">2. Test de Navigation</h4>
                <p className="text-sm text-gray-600">
                  Cliquez sur chaque module dans le sidebar pour vérifier que les pages se chargent correctement.
                  Utilisez aussi les liens de test (icône ↗) dans le tableau ci-dessus.
                </p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">3. Modules Prioritaires</h4>
                <p className="text-sm text-gray-600">
                  Concentrez-vous sur les modules marqués "Restauré" : Stock, Fournisseurs, Factures, 
                  Commandes & Devis, Paiements, et Commandes Fournisseurs.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
