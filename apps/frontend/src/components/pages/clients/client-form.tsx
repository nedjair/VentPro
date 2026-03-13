'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save, X } from 'lucide-react'
import { api, Client } from '@/lib/api'
import { ensureApiAuthentication } from '@/lib/auth-utils'
import { DEFAULT_BUSINESS_COUNTRY } from '@/lib/countries'

interface ClientFormPageProps {
  mode: 'create' | 'edit'
  clientId?: string
}

interface ClientFormData {
  type: 'INDIVIDUAL' | 'COMPANY'
  firstName: string
  lastName: string
  companyName: string
  email: string
  phone: string
  address: string
  city: string
  postalCode: string
  country: string
  notes: string
}

export function ClientFormPage({ mode, clientId }: ClientFormPageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<ClientFormData>({
    type: 'INDIVIDUAL',
    firstName: '',
    lastName: '',
    companyName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: DEFAULT_BUSINESS_COUNTRY,
    notes: ''
  })

  // Charger les données du client en mode édition
  useEffect(() => {
    if (mode === 'edit' && clientId) {
      loadClient()
    }
  }, [mode, clientId])

  const loadClient = async () => {
    if (!clientId) return
    
    try {
      setLoading(true)
      console.log('🔍 Chargement du client:', clientId)
      
      const response = await api.getClient(clientId)
      
      if (response.success && response.data) {
        const client = response.data
        setFormData({
          type: client.type,
          firstName: client.firstName || '',
          lastName: client.lastName || '',
          companyName: client.companyName || '',
          email: client.email || '',
          phone: client.phone || '',
          address: client.address || '',
          city: client.city || '',
          postalCode: client.postalCode || '',
          country: client.country || DEFAULT_BUSINESS_COUNTRY,
          notes: client.notes || ''
        })
        setError(null)
      } else {
        throw new Error('Client non trouvé')
      }
    } catch (err) {
      console.error('❌ Erreur lors du chargement du client:', err)
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof ClientFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleTypeChange = (type: 'INDIVIDUAL' | 'COMPANY') => {
    setFormData(prev => ({ ...prev, type }))
  }

  const validateForm = (): string | null => {
    if (!formData.email.trim()) {
      return 'L\'email est obligatoire'
    }
    
    if (formData.type === 'INDIVIDUAL') {
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        return 'Le prénom et le nom sont obligatoires pour un particulier'
      }
    } else {
      if (!formData.companyName.trim()) {
        return 'Le nom de l\'entreprise est obligatoire'
      }
    }
    
    // Validation email basique
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      return 'Format d\'email invalide'
    }
    
    return null
  }

  const ensureAuthentication = () => ensureApiAuthentication()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      setSaving(true)
      setError(null)

      // S'assurer que l'utilisateur est authentifié
      const isAuthenticated = await ensureAuthentication()
      if (!isAuthenticated) {
        setError('Erreur d\'authentification. Veuillez vous connecter.')
        return
      }

      console.log(`💾 ${mode === 'create' ? 'Création' : 'Modification'} du client...`)

      if (mode === 'create') {
        const response = await api.createClient(formData)
        console.log('✅ Client créé avec succès:', response)
      } else if (clientId) {
        const response = await api.updateClient(clientId, formData)
        console.log('✅ Client modifié avec succès:', response)
      }

      // Redirection vers la liste des clients
      router.push('/clients')

    } catch (err) {
      console.error(`❌ Erreur lors de la ${mode === 'create' ? 'création' : 'modification'}:`, err)

      // Messages d'erreur plus spécifiques
      let errorMessage = 'Erreur lors de la sauvegarde'
      if (err instanceof Error) {
        if (err.message.includes('401')) {
          errorMessage = 'Erreur d\'authentification. Veuillez vous reconnecter.'
        } else if (err.message.includes('400')) {
          errorMessage = 'Données invalides. Vérifiez les champs obligatoires.'
        } else if (err.message.includes('500')) {
          errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.'
        } else {
          errorMessage = err.message
        }
      }

      setError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    router.push('/clients')
  }

  const title = mode === 'create' ? 'Nouveau client' : 'Modifier le client'
  const subtitle = mode === 'create' 
    ? 'Créer un nouveau client dans la base de données' 
    : 'Modifier les informations du client'

  if (loading) {
    return (
      <MainLayout title={title} subtitle="Chargement...">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Chargement des données...</span>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout title={title} subtitle={subtitle}>
      <div className="max-w-4xl mx-auto">
        {/* Message d'erreur */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <X className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Erreur</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Formulaire */}
        <form id="client-form" onSubmit={handleSubmit} className="space-y-8">
          {/* Type de client */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Type de client</h3>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="INDIVIDUAL"
                  checked={formData.type === 'INDIVIDUAL'}
                  onChange={() => handleTypeChange('INDIVIDUAL')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">Particulier</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="COMPANY"
                  checked={formData.type === 'COMPANY'}
                  onChange={() => handleTypeChange('COMPANY')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">Entreprise</span>
              </label>
            </div>
          </div>

          {/* Informations personnelles/entreprise */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {formData.type === 'INDIVIDUAL' ? 'Informations personnelles' : 'Informations entreprise'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {formData.type === 'INDIVIDUAL' ? (
                <>
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                      Prénom *
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                      Nom *
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </>
              ) : (
                <div className="md:col-span-2">
                  <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
                    Nom de l'entreprise *
                  </label>
                  <input
                    type="text"
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              )}
            </div>
          </div>

          {/* Contact */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Téléphone
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+213 XX XX XX XX"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Adresse */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Adresse</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse
                </label>
                <input
                  type="text"
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                    Ville
                  </label>
                  <input
                    type="text"
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="Alger, Oran, Constantine..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-2">
                    Code postal
                  </label>
                  <input
                    type="text"
                    id="postalCode"
                    value={formData.postalCode}
                    onChange={(e) => handleInputChange('postalCode', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                    Pays
                  </label>
                  <input
                    type="text"
                    id="country"
                    value={formData.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Notes internes
              </label>
              <textarea
                id="notes"
                rows={4}
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Notes internes sur le client..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex flex-col gap-4 border-t border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-gray-500">
                {mode === 'create'
                  ? 'Vérifiez les informations du client avant de créer la fiche.'
                  : 'Enregistrez vos modifications une fois la fiche client mise à jour.'}
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleCancel} disabled={saving}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
                <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </MainLayout>
  )
}
