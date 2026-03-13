'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Button } from '../../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Badge } from '../../ui/badge'
import { 
  CheckCircle, XCircle, AlertTriangle, RefreshCw,
  Users, Database, Network, Eye
} from 'lucide-react'
import { api, Supplier } from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'

interface TestResult {
  test: string
  status: 'success' | 'error' | 'warning' | 'info'
  message: string
  details?: any
}

export function SupplierSelectTest() {
  const { user } = useAuth()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const runTests = async () => {
    setIsRunning(true)
    setTestResults([])
    const results: TestResult[] = []

    // Test 1: Vérification de l'authentification
    if (!user) {
      results.push({
        test: 'Authentification',
        status: 'error',
        message: 'Utilisateur non connecté',
        details: 'L\'utilisateur doit être connecté pour charger les fournisseurs'
      })
    } else {
      results.push({
        test: 'Authentification',
        status: 'success',
        message: `Utilisateur connecté: ${user.firstName} ${user.lastName}`,
        details: { userId: user.id, role: user.role }
      })
    }

    // Test 2: Chargement des fournisseurs via API
    try {
      setLoading(true)
      const response = await api.get('/api/v1/suppliers?isActive=true&limit=100')
      
      if (response.data.success) {
        // CORRECTION : Structure paginée response.data.data.data
        const suppliersData = response.data.data?.data || response.data.data || []
        setSuppliers(suppliersData)
        
        results.push({
          test: 'Chargement API',
          status: 'success',
          message: `${suppliersData.length} fournisseurs chargés`,
          details: suppliersData.map((s: Supplier) => ({ id: s.id, name: s.name, email: s.email }))
        })
      } else {
        results.push({
          test: 'Chargement API',
          status: 'error',
          message: 'Réponse API non réussie',
          details: response.data
        })
      }
    } catch (error) {
      results.push({
        test: 'Chargement API',
        status: 'error',
        message: 'Erreur lors de l\'appel API',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      })
    } finally {
      setLoading(false)
    }

    // Test 3: Validation de la structure des données
    if (suppliers.length > 0) {
      const firstSupplier = suppliers[0]
      const requiredFields = ['id', 'name']
      const missingFields = requiredFields.filter(field => !firstSupplier[field as keyof Supplier])
      
      if (missingFields.length === 0) {
        results.push({
          test: 'Structure des données',
          status: 'success',
          message: 'Structure des fournisseurs valide',
          details: { sampleSupplier: firstSupplier }
        })
      } else {
        results.push({
          test: 'Structure des données',
          status: 'error',
          message: `Champs manquants: ${missingFields.join(', ')}`,
          details: { firstSupplier, missingFields }
        })
      }
    }

    // Test 4: Test de sélection
    if (suppliers.length > 0) {
      const testSupplierId = suppliers[0].id
      setSelectedSupplierId(testSupplierId)
      
      results.push({
        test: 'Sélection automatique',
        status: 'info',
        message: `Fournisseur sélectionné: ${suppliers[0].name}`,
        details: { selectedId: testSupplierId, selectedSupplier: suppliers[0] }
      })
    }

    setTestResults(results)
    setIsRunning(false)
  }

  const getSelectedSupplier = () => {
    return suppliers.find(s => s.id === selectedSupplierId)
  }

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'info':
        return <Eye className="h-4 w-4 text-blue-600" />
    }
  }

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-600">Succès</Badge>
      case 'error':
        return <Badge variant="destructive">Erreur</Badge>
      case 'warning':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Attention</Badge>
      case 'info':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Info</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Test Sélection Fournisseur</h2>
          <p className="text-gray-600">Diagnostic de la liste déroulante des fournisseurs</p>
        </div>
        <Button 
          onClick={runTests} 
          disabled={isRunning}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
          {isRunning ? 'Tests en cours...' : 'Lancer les tests'}
        </Button>
      </div>

      {/* Composant de test */}
      <Card>
        <CardHeader>
          <CardTitle>Test du composant Select</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sélectionner un fournisseur
            </label>
            <Select
              value={selectedSupplierId}
              onValueChange={setSelectedSupplierId}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder={loading ? "Chargement..." : "Sélectionner un fournisseur"}>
                  {selectedSupplierId && getSelectedSupplier() ? (
                    <div className="flex flex-col">
                      <span className="font-medium">{getSelectedSupplier()?.name}</span>
                      {getSelectedSupplier()?.email && (
                        <span className="text-sm text-gray-500">{getSelectedSupplier()?.email}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-500">
                      {loading ? "Chargement..." : "Sélectionner un fournisseur"}
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {loading ? (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    Chargement des fournisseurs...
                  </div>
                ) : suppliers.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    Aucun fournisseur disponible
                  </div>
                ) : (
                  suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{supplier.name}</span>
                        {supplier.email && (
                          <span className="text-sm text-gray-500">{supplier.email}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Informations de débogage */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <span className="text-sm font-medium text-gray-700">État:</span>
              <p className="text-sm text-gray-900">
                {loading ? 'Chargement...' : `${suppliers.length} fournisseurs`}
              </p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Sélectionné:</span>
              <p className="text-sm text-gray-900">
                {selectedSupplierId || 'Aucun'}
              </p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Nom:</span>
              <p className="text-sm text-gray-900">
                {getSelectedSupplier()?.name || 'Aucun'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Résultats des tests */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Résultats des tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div key={index} className="p-3 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.status)}
                      <span className="font-medium">{result.test}</span>
                    </div>
                    {getStatusBadge(result.status)}
                  </div>
                  <p className="text-sm text-gray-700 mb-1">{result.message}</p>
                  {result.details && (
                    <details className="text-xs text-gray-500">
                      <summary className="cursor-pointer hover:text-gray-700">
                        Voir les détails
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste des fournisseurs */}
      {suppliers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Fournisseurs disponibles ({suppliers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {suppliers.map((supplier) => (
                <div 
                  key={supplier.id} 
                  className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                    selectedSupplierId === supplier.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => setSelectedSupplierId(supplier.id)}
                >
                  <div className="font-medium">{supplier.name}</div>
                  {supplier.email && (
                    <div className="text-sm text-gray-500">{supplier.email}</div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">ID: {supplier.id}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
