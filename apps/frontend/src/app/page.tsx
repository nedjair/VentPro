'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/stores/auth'

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, isHydrated, isLoading } = useAuth()

  useEffect(() => {
    if (!isHydrated || isLoading) {
      return
    }

    router.replace(isAuthenticated ? '/dashboard' : '/login')
  }, [isAuthenticated, isHydrated, isLoading, router])

  if (!isHydrated || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  return null
}


