import { useState, useEffect } from 'react'
import { api } from '../lib/api'

export interface Company {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  city?: string
  postalCode?: string
  country: string
  currency: string
  timezone: string
  website?: string
  siret?: string
  vatNumber?: string
}

interface UseCompanyReturn {
  currentCompany: Company | null
  allCompanies: Company[] | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook pour récupérer les informations de l'entreprise
 */
export function useCompany(): UseCompanyReturn {
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null)
  const [allCompanies, setAllCompanies] = useState<Company[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCurrentCompany = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('🔍 useCompany: Début de fetchCurrentCompany')
      console.log('🔍 useCompany: Token disponible:', api.getAuthToken() ? 'Oui' : 'Non')

      const response = await api.get('/api/v1/companies/current')

      console.log('🔍 useCompany: Réponse reçue:', response.data)

      if (response.data.success) {
        setCurrentCompany(response.data.data)
        console.log('🔍 useCompany: Entreprise définie:', response.data.data.name)
      } else {
        console.error('🔍 useCompany: Réponse non réussie:', response.data)
        setError('Erreur lors de la récupération de l\'entreprise')
      }
    } catch (err: any) {
      console.error('🔍 useCompany: Erreur lors de la récupération de l\'entreprise:', err)
      console.error('🔍 useCompany: Détails de l\'erreur:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message
      })
      setError(err.response?.data?.message || 'Erreur lors de la récupération de l\'entreprise')
    } finally {
      setLoading(false)
      console.log('🔍 useCompany: Fin de fetchCurrentCompany')
    }
  }

  const fetchAllCompanies = async () => {
    try {
      const response = await api.get('/api/v1/companies')
      
      if (response.data.success) {
        setAllCompanies(response.data.data)
      }
    } catch (err: any) {
      // Ne pas afficher d'erreur si l'utilisateur n'a pas les droits
      if (err.response?.status !== 403) {
        console.error('Erreur lors de la récupération des entreprises:', err)
      }
    }
  }

  const refetch = async () => {
    await Promise.all([
      fetchCurrentCompany(),
      fetchAllCompanies()
    ])
  }

  useEffect(() => {
    refetch()
  }, [])

  return {
    currentCompany,
    allCompanies,
    loading,
    error,
    refetch
  }
}

/**
 * Hook simplifié pour récupérer uniquement l'entreprise actuelle
 */
export function useCurrentCompany() {
  const { currentCompany, loading, error, refetch } = useCompany()
  
  return {
    company: currentCompany,
    loading,
    error,
    refetch
  }
}
