'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Button } from '../../ui/button'
import { Badge } from '../../ui/badge'
import { 
  CheckCircle, XCircle, User, Key, 
  RefreshCw, Eye, Database, Network
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'

export function AuthStatus() {
  const { user, login, logout } = useAuth()
  const [tokenInfo, setTokenInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    checkTokenInfo()
  }, [])

  const checkTokenInfo = () => {
    try {
      const token = localStorage.getItem('accessToken')
      const refreshToken = localStorage.getItem('refreshToken')
      const userStr = localStorage.getItem('user')
      
      setTokenInfo({
        hasAccessToken: !!token,
        hasRefreshToken: !!refreshToken,
        hasUserData: !!userStr,
        accessTokenLength: token?.length || 0,
        accessTokenStart: token?.substring(0, 20) || '',
        userData: userStr ? JSON.parse(userStr) : null
      })
    } catch (error) {
      setTokenInfo({
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      })
    }
  }

  const testLogin = async () => {
    setIsLoading(true)
    try {
      await login('admin@example.com', 'admin123')
      checkTokenInfo()
    } catch (error) {
      console.error('❌ Erreur de connexion:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const testLogout = async () => {
    try {
      await logout()
      checkTokenInfo()
    } catch (error) {
      console.error('❌ Erreur de déconnexion:', error)
    }
  }

  const clearStorage = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    checkTokenInfo()
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">État de l'Authentification</h2>
          <p className="text-gray-600">Vérification de l'utilisateur connecté et des tokens</p>
        </div>
        <Button 
          onClick={checkTokenInfo}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </Button>
      </div>

      {/* État de l'utilisateur */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Utilisateur Connecté
          </CardTitle>
        </CardHeader>
        <CardContent>
          {user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <Badge variant="default" className="bg-green-600">Connecté</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-700">Email:</span>
                  <p className="text-sm text-gray-900">{user.email}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Nom:</span>
                  <p className="text-sm text-gray-900">{user.firstName} {user.lastName}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Rôle:</span>
                  <p className="text-sm text-gray-900">{user.role}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Société:</span>
                  <p className="text-sm text-gray-900">{user.companyId}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <Badge variant="destructive">Non connecté</Badge>
              </div>
              <p className="text-sm text-gray-600">Aucun utilisateur connecté</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* État des tokens */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Tokens d'Authentification
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tokenInfo ? (
            <div className="space-y-4">
              {tokenInfo.error ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800">Erreur: {tokenInfo.error}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      {tokenInfo.hasAccessToken ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="font-medium">Access Token</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {tokenInfo.hasAccessToken ? (
                        <>
                          Présent ({tokenInfo.accessTokenLength} caractères)
                          <br />
                          <code className="text-xs">{tokenInfo.accessTokenStart}...</code>
                        </>
                      ) : (
                        'Absent'
                      )}
                    </p>
                  </div>
                  
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      {tokenInfo.hasRefreshToken ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="font-medium">Refresh Token</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {tokenInfo.hasRefreshToken ? 'Présent' : 'Absent'}
                    </p>
                  </div>
                  
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      {tokenInfo.hasUserData ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="font-medium">Données Utilisateur</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {tokenInfo.hasUserData ? 'Présentes' : 'Absentes'}
                    </p>
                  </div>
                </div>
              )}
              
              {tokenInfo.userData && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                    Voir les données utilisateur brutes
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                    {JSON.stringify(tokenInfo.userData, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-600">Chargement des informations...</p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions de Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={testLogin}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <User className="h-4 w-4" />
              {isLoading ? 'Connexion...' : 'Test Connexion'}
            </Button>
            
            <Button 
              onClick={testLogout}
              variant="outline"
              className="flex items-center gap-2"
            >
              <XCircle className="h-4 w-4" />
              Test Déconnexion
            </Button>
            
            <Button 
              onClick={clearStorage}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Nettoyer Storage
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">Instructions de Diagnostic</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-blue-800 text-sm">
            <p><strong>1. Vérifier l'état :</strong> L'utilisateur doit être connecté avec un token valide</p>
            <p><strong>2. Si non connecté :</strong> Cliquer sur "Test Connexion" pour se connecter</p>
            <p><strong>3. Si problème :</strong> Cliquer sur "Nettoyer Storage" puis "Test Connexion"</p>
            <p><strong>4. Vérifier la console :</strong> Ouvrir F12 → Console pour voir les logs détaillés</p>
            <p><strong>5. Test API :</strong> Une fois connecté, aller dans l'onglet "Diagnostic API"</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

