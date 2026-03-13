'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth'

export default function TestJSPage() {
  const [isClient, setIsClient] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [authDebug, setAuthDebug] = useState<any>({})

  // Utiliser le store d'authentification
  const authStore = useAuthStore()

  const addLog = (message: string) => {
    console.log(message)
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`])
  }

  useEffect(() => {
    addLog('✅ useEffect déclenché - JavaScript fonctionne côté client')
    setIsClient(true)

    // Test localStorage
    try {
      localStorage.setItem('test', 'ok')
      const test = localStorage.getItem('test')
      addLog(`✅ localStorage fonctionne: ${test}`)
      localStorage.removeItem('test')
    } catch (e) {
      addLog(`❌ localStorage erreur: ${e}`)
    }

    // Vérifier les données d'authentification
    const checkAuthData = () => {
      const user = localStorage.getItem('auth-user')
      const tokens = localStorage.getItem('auth-tokens')
      const cookies = document.cookie

      addLog(`📊 Auth localStorage user: ${user ? '✅ Présent' : '❌ Absent'}`)
      addLog(`📊 Auth localStorage tokens: ${tokens ? '✅ Présent' : '❌ Absent'}`)
      addLog(`📊 Auth cookie: ${cookies.includes('auth-token=') ? '✅ Présent' : '❌ Absent'}`)
    }

    checkAuthData()
  }, [])

  // Mettre à jour les infos de debug du store d'auth
  useEffect(() => {
    if (isClient) {
      setAuthDebug({
        isAuthenticated: authStore.isAuthenticated,
        isLoading: authStore.isLoading,
        isHydrated: authStore.isHydrated,
        user: authStore.user?.email || 'N/A',
        hasTokens: !!authStore.tokens?.accessToken,
        localStorage_user: !!localStorage.getItem('auth-user'),
        localStorage_tokens: !!localStorage.getItem('auth-tokens'),
        cookie_token: document.cookie.includes('auth-token=')
      })
    }
  }, [isClient, authStore.isAuthenticated, authStore.isLoading, authStore.isHydrated, authStore.user, authStore.tokens])

  const forceAuthCheck = async () => {
    try {
      addLog('🔄 Forçage de la vérification d\'authentification...')
      // Accéder directement au store pour forcer la vérification
      const { authStore } = await import('@/stores/auth')
      await authStore.checkAuth()
      addLog('✅ Vérification d\'authentification forcée')
    } catch (error) {
      addLog(`❌ Erreur lors de la vérification: ${error}`)
    }
  }

  const testLogin = async () => {
    try {
      addLog('🔄 Test de connexion...')
      await authStore.login({
        email: 'admin@technocommerce.dz',
        password: 'admin123'
      })
      addLog('✅ Connexion réussie')
    } catch (error) {
      addLog(`❌ Erreur de connexion: ${error}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Test JavaScript & Authentification</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">État</h2>
          <div className="space-y-2">
            <p>isClient: <span className={isClient ? 'text-green-600' : 'text-red-600'}>{isClient ? 'true' : 'false'}</span></p>
            <p>window disponible: <span className={typeof window !== 'undefined' ? 'text-green-600' : 'text-red-600'}>{typeof window !== 'undefined' ? 'true' : 'false'}</span></p>
            <p>localStorage disponible: <span className={typeof localStorage !== 'undefined' ? 'text-green-600' : 'text-red-600'}>{typeof localStorage !== 'undefined' ? 'true' : 'false'}</span></p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="space-x-4">
            <button
              onClick={forceAuthCheck}
              className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
            >
              Forcer Auth Check
            </button>
            <button
              onClick={testLogin}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Test Login
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">État du Store d'Authentification</h2>
          <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(authDebug, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Logs</h2>
          <div className="space-y-1 font-mono text-sm max-h-96 overflow-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500">Aucun log pour le moment...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="p-2 bg-gray-100 rounded">
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
