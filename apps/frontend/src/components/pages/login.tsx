'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Building2, Eye, EyeOff, LogIn } from 'lucide-react'
import { useAuth } from '@/stores/auth'

export function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, isLoading, error, clearError } = useAuth()

  const [formData, setFormData] = useState({
    email: 'admin@gctpe.dz',
    password: 'admin123',
    rememberMe: false,
  })

  const [showPassword, setShowPassword] = useState(false)

  // Récupérer l'URL de redirection depuis les paramètres de recherche
  const redirectTo = searchParams.get('redirect') || '/dashboard'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    console.log('🔍 Début de la soumission du formulaire')
    console.log('🔍 Données du formulaire:', { email: formData.email, password: '***' })

    try {
      console.log('🔍 Appel de la fonction login...')
      console.log('🚀 AVANT appel login() du store')
      const result = await login({
        email: formData.email,
        password: formData.password,
        rememberMe: formData.rememberMe,
      })
      console.log('🎯 APRÈS appel login() du store, résultat:', result)

      // Vérifier si le token est stocké
      const token = localStorage.getItem('token')
      console.log('🔑 Token stocké après login:', token ? 'OUI' : 'NON')
      console.log('🔑 Token value:', token?.substring(0, 20) + '...')

      console.log(`✅ Login réussi, redirection vers ${redirectTo}`)
      console.log(`🔄 Redirection avec router.push vers ${redirectTo}`)

      // Utiliser router.push pour une navigation Next.js appropriée
      router.push(redirectTo)
    } catch (error) {
      // L'erreur est déjà gérée par le store
      console.error('❌ Erreur de connexion dans handleSubmit:', error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="flex items-center">
            <Building2 className="h-12 w-12 text-blue-600" />
            <span className="ml-2 text-3xl font-bold text-gray-900">GC TPE</span>
          </div>
        </div>
        
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Connexion à votre compte
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Accédez à votre tableau de bord de gestion commerciale
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Message d'erreur */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Erreur de connexion
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Formulaire de connexion */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Adresse email
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="votre@email.com"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Mot de passe
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Votre mot de passe"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Se souvenir de moi */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-900">
                  Se souvenir de moi
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                  Mot de passe oublié ?
                </a>
              </div>
            </div>

            {/* Bouton de connexion */}
            <div>
              <Button
                type="submit"
                fullWidth
                loading={isLoading}
                disabled={isLoading}
              >
                <LogIn className="h-4 w-4 mr-2" />
                Se connecter
              </Button>
            </div>
          </form>

          {/* Informations de démo */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Compte de démonstration</span>
              </div>
            </div>

            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="text-sm text-blue-700">
                <p className="font-medium">Utilisez ces identifiants pour tester :</p>
                <p className="mt-1">Email : admin@test.com</p>
                <p>Mot de passe : password123</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
