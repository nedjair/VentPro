'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth'

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, isHydrated } = useAuthStore()

  useEffect(() => {
    // Attendre que l'authentification soit hydratée
    if (isHydrated) {
      if (isAuthenticated) {
        // Si l'utilisateur est déjà connecté, rediriger vers le dashboard
        console.log('🔄 Page racine: Utilisateur authentifié, redirection vers /dashboard')
        router.replace('/dashboard')
      } else {
        // Si l'utilisateur n'est pas connecté, rediriger vers la page de connexion
        console.log('🔄 Page racine: Utilisateur non authentifié, redirection vers /login')
        router.replace('/login')
      }
    }
  }, [isHydrated, isAuthenticated, router])

  // Afficher un loader pendant la redirection
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirection en cours...</p>
      </div>
    </div>
  )
}


