'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Button } from '../../ui/button'
import { Badge } from '../../ui/badge'
import { 
  CheckCircle, XCircle, AlertTriangle, RefreshCw,
  Database, Network, User, Key, Eye, Code
} from 'lucide-react'
import { api, Supplier } from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'

interface DiagnosticResult {
  test: string
  status: 'success' | 'error' | 'warning' | 'info'
  message: string
  details?: any
  duration?: number
}

export function ApiDiagnostic() {
  const { user } = useAuth()
  const [results, setResults] = useState<DiagnosticResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [rawApiResponse, setRawApiResponse] = useState<any>(null)

  const runDiagnostic = async () => {
    setIsRunning(true)
    setResults([])
    setRawApiResponse(null)
    const diagnosticResults: DiagnosticResult[] = []

    // Test 1: Vérification de l'authentification
    const startAuth = Date.now()
    if (!user) {
      diagnosticResults.push({
        test: 'Authentification utilisateur',
        status: 'error',
        message: 'Aucun utilisateur connecté',
        details: 'L\'utilisateur doit être connecté pour accéder à l\'API',
        duration: Date.now() - startAuth
      })
    } else {
      diagnosticResults.push({
        test: 'Authentification utilisateur',
        status: 'success',
        message: `Utilisateur connecté: ${user.firstName} ${user.lastName}`,
        details: {
          userId: user.id,
          email: user.email,
          role: user.role,
          companyId: user.companyId
        },
        duration: Date.now() - startAuth
      })
    }

    // Test 2: Test direct de l'API avec fetch
    const startFetch = Date.now()
    try {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        diagnosticResults.push({
          test: 'Token d\'authentification',
          status: 'error',
          message: 'Aucun token d\'authentification trouvé',
          details: 'Le token est nécessaire pour les appels API',
          duration: Date.now() - startFetch
        })
      } else {
        diagnosticResults.push({
          test: 'Token d\'authentification',
          status: 'success',
          message: 'Token trouvé dans localStorage',
          details: { tokenLength: token.length, tokenStart: token.substring(0, 20) + '...' },
          duration: Date.now() - startFetch
        })

        // Test 3: Appel API direct avec fetch
        const startDirectApi = Date.now()
        try {
          const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'
          const url = `${baseUrl}/api/v1/suppliers?isActive=true&limit=100`
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })

          const responseText = await response.text()

          let responseData
          try {
            responseData = JSON.parse(responseText)
          } catch (parseError) {
            diagnosticResults.push({
              test: 'Appel API direct (fetch)',
              status: 'error',
              message: 'Réponse API non-JSON',
              details: {
                status: response.status,
                statusText: response.statusText,
                responseText: responseText.substring(0, 500),
                parseError: parseError instanceof Error ? parseError.message : 'Erreur de parsing'
              },
              duration: Date.now() - startDirectApi
            })
            return
          }

          setRawApiResponse(responseData)

          if (response.ok) {
            if (responseData.success) {
              const suppliers = responseData.data || []
              diagnosticResults.push({
                test: 'Appel API direct (fetch)',
                status: 'success',
                message: `API répond correctement - ${suppliers.length} fournisseurs trouvés`,
                details: {
                  status: response.status,
                  success: responseData.success,
                  dataType: Array.isArray(suppliers) ? 'array' : typeof suppliers,
                  suppliersCount: suppliers.length,
                  firstSupplier: suppliers[0] || null
                },
                duration: Date.now() - startDirectApi
              })
            } else {
              diagnosticResults.push({
                test: 'Appel API direct (fetch)',
                status: 'warning',
                message: 'API répond mais success=false',
                details: {
                  status: response.status,
                  response: responseData
                },
                duration: Date.now() - startDirectApi
              })
            }
          } else {
            diagnosticResults.push({
              test: 'Appel API direct (fetch)',
              status: 'error',
              message: `Erreur HTTP ${response.status}`,
              details: {
                status: response.status,
                statusText: response.statusText,
                response: responseData
              },
              duration: Date.now() - startDirectApi
            })
          }
        } catch (fetchError) {
          diagnosticResults.push({
            test: 'Appel API direct (fetch)',
            status: 'error',
            message: 'Erreur lors de l\'appel API',
            details: {
              error: fetchError instanceof Error ? fetchError.message : 'Erreur inconnue',
              stack: fetchError instanceof Error ? fetchError.stack : undefined
            },
            duration: Date.now() - startDirectApi
          })
        }
      }
    } catch (error) {
      diagnosticResults.push({
        test: 'Token d\'authentification',
        status: 'error',
        message: 'Erreur lors de la vérification du token',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
        duration: Date.now() - startFetch
      })
    }

    // Test 4: Test avec le client API
    const startApiClient = Date.now()
    try {
      const response = await api.get('/api/v1/suppliers?isActive=true&limit=100')

      if (response.data.success) {
        const suppliers = response.data.data || []
        diagnosticResults.push({
          test: 'Client API (api.get)',
          status: 'success',
          message: `Client API fonctionne - ${suppliers.length} fournisseurs`,
          details: {
            success: response.data.success,
            suppliersCount: suppliers.length,
            response: response.data
          },
          duration: Date.now() - startApiClient
        })
      } else {
        diagnosticResults.push({
          test: 'Client API (api.get)',
          status: 'warning',
          message: 'Client API répond mais success=false',
          details: response.data,
          duration: Date.now() - startApiClient
        })
      }
    } catch (apiError) {
      diagnosticResults.push({
        test: 'Client API (api.get)',
        status: 'error',
        message: 'Erreur avec le client API',
        details: {
          error: apiError instanceof Error ? apiError.message : 'Erreur inconnue',
          stack: apiError instanceof Error ? apiError.stack : undefined
        },
        duration: Date.now() - startApiClient
      })
    }

    // Test 5: Test avec la méthode getSuppliers
    const startGetSuppliers = Date.now()
    try {
      const response = await api.getSuppliers({ isActive: true, limit: 100 })

      const payload = response.data as any

      if (payload?.success) {
        const suppliers = payload.data || []
        diagnosticResults.push({
          test: 'Méthode getSuppliers',
          status: 'success',
          message: `getSuppliers fonctionne - ${suppliers.length} fournisseurs`,
          details: {
            success: payload.success,
            suppliersCount: suppliers.length,
            response: payload
          },
          duration: Date.now() - startGetSuppliers
        })
      } else {
        diagnosticResults.push({
          test: 'Méthode getSuppliers',
          status: 'warning',
          message: 'getSuppliers répond mais success=false',
          details: response.data,
          duration: Date.now() - startGetSuppliers
        })
      }
    } catch (getSuppliersError) {
      diagnosticResults.push({
        test: 'Méthode getSuppliers',
        status: 'error',
        message: 'Erreur avec getSuppliers',
        details: {
          error: getSuppliersError instanceof Error ? getSuppliersError.message : 'Erreur inconnue',
          stack: getSuppliersError instanceof Error ? getSuppliersError.stack : undefined
        },
        duration: Date.now() - startGetSuppliers
      })
    }

    setResults(diagnosticResults)
    setIsRunning(false)
  }

  const getStatusIcon = (status: DiagnosticResult['status']) => {
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

  const getStatusBadge = (status: DiagnosticResult['status']) => {
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
          <h2 className="text-2xl font-bold text-gray-900">Diagnostic API Fournisseurs</h2>
          <p className="text-gray-600">Analyse approfondie de l'API et des données</p>
        </div>
        <Button 
          onClick={runDiagnostic} 
          disabled={isRunning}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
          {isRunning ? 'Diagnostic en cours...' : 'Lancer le diagnostic'}
        </Button>
      </div>

      {/* Résultats des tests */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Résultats du diagnostic</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.status)}
                      <span className="font-medium">{result.test}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {result.duration && (
                        <span className="text-xs text-gray-500">{result.duration}ms</span>
                      )}
                      {getStatusBadge(result.status)}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{result.message}</p>
                  {result.details && (
                    <details className="text-xs text-gray-500">
                      <summary className="cursor-pointer hover:text-gray-700 mb-2">
                        Voir les détails
                      </summary>
                      <pre className="p-3 bg-gray-100 rounded overflow-auto max-h-40">
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

      {/* Réponse API brute */}
      {rawApiResponse && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Réponse API brute
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="p-4 bg-gray-100 rounded overflow-auto max-h-96 text-sm">
              {JSON.stringify(rawApiResponse, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Informations de configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration actuelle</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">API</h4>
              <div className="text-sm space-y-1">
                <p><strong>Base URL:</strong> {process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'}</p>
                <p><strong>Endpoint:</strong> /api/v1/suppliers</p>
                <p><strong>Paramètres:</strong> isActive=true&limit=100</p>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Utilisateur</h4>
              <div className="text-sm space-y-1">
                <p><strong>Connecté:</strong> {user ? 'Oui' : 'Non'}</p>
                {user && (
                  <>
                    <p><strong>Email:</strong> {user.email}</p>
                    <p><strong>Rôle:</strong> {user.role}</p>
                    <p><strong>Société:</strong> {user.companyId}</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
