'use client'

import { useState } from 'react'

export default function TestAuthPage() {
  const [message, setMessage] = useState('')

  const simulateLogin = () => {
    try {
      // Créer un token JWT simulé (structure similaire à celle du backend)
      const payload = {
        userId: 'admin-user-id',
        email: 'admin@example.com',
        role: 'ADMIN',
        companyId: 'company-1',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24h
      }

      // Encoder en base64 (simulation simple - en production utiliser une vraie signature JWT)
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
      const payloadEncoded = btoa(JSON.stringify(payload))
      const signature = 'simulated-signature-for-testing'
      const token = `${header}.${payloadEncoded}.${signature}`

      // Créer le cookie
      document.cookie = `auth-token=${token}; path=/; max-age=86400; SameSite=Lax`

      // Stocker dans localStorage aussi
      const user = {
        id: payload.userId,
        email: payload.email,
        firstName: 'Admin',
        lastName: 'User',
        role: payload.role,
        permissions: ['*'],
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      }

      const tokens = {
        accessToken: token,
        refreshToken: token,
        expiresIn: 86400,
      }

      localStorage.setItem('auth-user', JSON.stringify(user))
      localStorage.setItem('auth-tokens', JSON.stringify(tokens))

      setMessage('✅ Connexion simulée créée ! Token et données stockés.')
    } catch (error) {
      setMessage('❌ Erreur lors de la simulation: ' + error)
      console.error('Erreur:', error)
    }
  }

  const clearAuth = () => {
    // Supprimer le cookie
    document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    
    // Supprimer localStorage
    localStorage.removeItem('auth-user')
    localStorage.removeItem('auth-tokens')
    
    setMessage('🧹 Authentification supprimée')
  }

  const testDashboard = () => {
    window.location.href = '/dashboard'
  }

  const checkAuth = () => {
    const cookie = document.cookie.match(/auth-token=([^;]+)/)
    const user = localStorage.getItem('auth-user')
    const tokens = localStorage.getItem('auth-tokens')

    setMessage(`
🔍 État d'authentification:
- Cookie: ${cookie ? '✅ Présent' : '❌ Absent'}
- localStorage user: ${user ? '✅ Présent' : '❌ Absent'}  
- localStorage tokens: ${tokens ? '✅ Présent' : '❌ Absent'}
    `)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Test d'Authentification</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
          <p className="text-gray-600">
            Cette page permet de tester le middleware d'authentification en simulant une connexion.
          </p>
          
          <div className="space-y-3">
            <button
              onClick={simulateLogin}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 mr-3"
            >
              🎭 Simuler Connexion
            </button>
            
            <button
              onClick={clearAuth}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 mr-3"
            >
              🧹 Supprimer Auth
            </button>
            
            <button
              onClick={checkAuth}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mr-3"
            >
              🔍 Vérifier État
            </button>
            
            <button
              onClick={testDashboard}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
            >
              🚀 Tester Dashboard
            </button>
          </div>
          
          {message && (
            <div className="mt-4 p-4 bg-gray-100 rounded border">
              <pre className="text-sm whitespace-pre-wrap">{message}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

