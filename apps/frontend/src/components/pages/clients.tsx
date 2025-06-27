'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { ImportExportButtons, ImportExportMessage } from '@/components/ui/import-export-buttons'
import { Plus, Search, Filter } from 'lucide-react'
import { api, Client } from '@/lib/api'
import {
  ensureArray,
  safeFilter,
  safeFind,
  safeTextRender,
  safeFormatDate
} from '@/lib/defensive-utils'

export function ClientsPage() {
  const router = useRouter()
  // Utilisation de la gestion sécurisée des états de tableaux
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    type: '',
    city: '',
    status: ''
  })
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  useEffect(() => {
    loadClients()
  }, [])

  // Fonction d'authentification automatique
  const ensureAuthentication = async () => {
    const authToken = api.getAuthToken()
    if (authToken) {
      return true
    }

    try {
      console.log('🔐 Tentative de connexion automatique...')
      const loginResponse = await api.login({
        email: 'admin@gctpe.dz',
        password: 'admin123'
      })

      if (loginResponse.success && loginResponse.data?.token) {
        api.setAuthToken(loginResponse.data.token)

        if (typeof window !== 'undefined') {
          localStorage.setItem('auth-tokens', JSON.stringify({
            accessToken: loginResponse.data.token,
            refreshToken: loginResponse.data.refreshToken || null
          }))
          localStorage.setItem('auth-user', JSON.stringify(loginResponse.data.user))
        }

        console.log('✅ Connexion automatique réussie')
        return true
      }
    } catch (error) {
      console.error('❌ Échec de la connexion automatique:', error)
    }

    return false
  }

  const loadClients = async () => {
    try {
      setLoading(true)
      console.log('🔍 Chargement des clients...')

      // S'assurer que l'utilisateur est authentifié
      const isAuthenticated = await ensureAuthentication()
      if (!isAuthenticated) {
        setError('Erreur d\'authentification. Impossible de charger les clients.')
        return
      }

      const response = await api.getClients()
      console.log('📊 Réponse clients:', response)

      // Approche simplifiée et robuste
      let clientsData: Client[] = []

      if (response && typeof response === 'object') {
        const apiResponse = response as any

        // Si la réponse a une structure success/data
        if (apiResponse.success && apiResponse.data) {
          if (Array.isArray(apiResponse.data)) {
            clientsData = apiResponse.data
          } else if (Array.isArray(apiResponse.data.data)) {
            clientsData = apiResponse.data.data
          }
        }
        // Si la réponse est directement un tableau
        else if (Array.isArray(apiResponse)) {
          clientsData = apiResponse
        }
        // Si la réponse contient directement des données
        else if (Array.isArray(apiResponse.data)) {
          clientsData = apiResponse.data
        }
      }

      // Assurer que nous avons toujours un tableau
      const safeClients = ensureArray<Client>(clientsData)
      console.log('✅ Clients chargés avec succès:', safeClients.length, 'clients')

      setClients(safeClients)
      setError(null)
    } catch (err) {
      console.error('❌ Erreur lors du chargement des clients:', err)

      let errorMessage = 'Erreur de chargement'
      if (err instanceof Error) {
        if (err.message.includes('401')) {
          errorMessage = 'Erreur d\'authentification. Veuillez vous reconnecter.'
        } else if (err.message.includes('Network')) {
          errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet.'
        } else {
          errorMessage = err.message
        }
      }

      setError(errorMessage)
      // Garantir que clients reste toujours un tableau valide
      setClients([])
    } finally {
      setLoading(false)
    }
  }

  // Gestionnaires pour l'import/export
  const handleImportSuccess = (result: any) => {
    setImportMessage({
      type: 'success',
      message: `Import réussi: ${result.data?.imported || 0} clients importés, ${result.data?.updated || 0} mis à jour`
    })
    // Recharger la liste des clients
    loadClients()
  }

  const handleImportError = (error: string) => {
    setImportMessage({
      type: 'error',
      message: `Erreur d'import: ${error}`
    })
  }

  const handleExportError = (error: string) => {
    setError(`Erreur d'export: ${error}`)
  }

  // Utilisation du filtrage sécurisé pour éviter les erreurs "filter is not a function"
  const filteredClients = safeFilter(clients, (client) => {
    const searchLower = searchTerm.toLowerCase()

    // Filtrage par recherche textuelle
    const matchesSearch = (
      client.firstName?.toLowerCase().includes(searchLower) ||
      client.lastName?.toLowerCase().includes(searchLower) ||
      client.companyName?.toLowerCase().includes(searchLower) ||
      client.email?.toLowerCase().includes(searchLower) ||
      client.phone?.toLowerCase().includes(searchLower) ||
      client.city?.toLowerCase().includes(searchLower)
    )

    // Filtrage par type
    const matchesType = !filters.type || client.type === filters.type

    // Filtrage par ville
    const matchesCity = !filters.city || client.city?.toLowerCase().includes(filters.city.toLowerCase())

    return matchesSearch && matchesType && matchesCity
  })

  const handleFilters = () => {
    console.log('Ouverture des filtres...')
    setShowFilters(!showFilters)
  }

  const handleNewClient = () => {
    console.log('Navigation vers création client...')
    router.push('/clients/new')
  }

  const handleEditClient = (clientId: string) => {
    console.log('Navigation vers modification client:', clientId)
    router.push(`/clients/${clientId}/edit`)
  }

  const handleDeleteClient = async (clientId: string) => {
    const client = safeFind(clients, c => c.id === clientId)
    const clientName = client?.type === 'COMPANY'
      ? client.companyName
      : `${client?.firstName} ${client?.lastName}`

    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le client "${clientName}" ?\n\nCette action est irréversible.`)) {
      try {
        console.log('Suppression du client:', clientId)
        setLoading(true)

        // S'assurer que l'utilisateur est authentifié
        const isAuthenticated = await ensureAuthentication()
        if (!isAuthenticated) {
          setError('Erreur d\'authentification. Veuillez vous connecter.')
          return
        }

        // Appel API pour supprimer le client
        await api.deleteClient(clientId)

        // Recharger la liste des clients
        await loadClients()

        console.log('✅ Client supprimé avec succès')
      } catch (error) {
        console.error('❌ Erreur lors de la suppression:', error)

        let errorMessage = 'Erreur lors de la suppression du client'
        if (error instanceof Error) {
          if (error.message.includes('401')) {
            errorMessage = 'Erreur d\'authentification. Veuillez vous reconnecter.'
          } else if (error.message.includes('404')) {
            errorMessage = 'Client non trouvé.'
          } else {
            errorMessage = error.message
          }
        }

        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }
  }

  const handleViewClient = (clientId: string) => {
    console.log('Navigation vers détails client:', clientId)
    router.push(`/clients/${clientId}`)
  }

  const actions = (
    <div className="flex space-x-2">
      <Button variant="outline" size="sm" onClick={handleFilters}>
        <Filter className="h-4 w-4 mr-2" />
        Filtres
      </Button>
      <ImportExportButtons
        type="clients"
        onImportSuccess={handleImportSuccess}
        onImportError={handleImportError}
        onExportError={handleExportError}
        showPdfExport={true}
        showImport={true}
      />
      <Button size="sm" onClick={handleNewClient}>
        <Plus className="h-4 w-4 mr-2" />
        Nouveau client
      </Button>
    </div>
  )

  return (
    <MainLayout 
      title="Clients" 
      subtitle={`${filteredClients.length} client${filteredClients.length > 1 ? 's' : ''} trouvé${filteredClients.length > 1 ? 's' : ''}`}
      actions={actions}
    >
      <div className="space-y-6">
        {/* Barre de recherche */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Rechercher un client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Interface de filtrage */}
        {showFilters && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Filtres</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="filter-type" className="block text-sm font-medium text-gray-700 mb-2">
                  Type de client
                </label>
                <select
                  id="filter-type"
                  value={filters.type}
                  onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Tous les types</option>
                  <option value="INDIVIDUAL">Particulier</option>
                  <option value="COMPANY">Entreprise</option>
                </select>
              </div>

              <div>
                <label htmlFor="filter-city" className="block text-sm font-medium text-gray-700 mb-2">
                  Ville
                </label>
                <input
                  id="filter-city"
                  type="text"
                  placeholder="Filtrer par ville..."
                  value={filters.city}
                  onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => setFilters({ type: '', city: '', status: '' })}
                  className="w-full"
                >
                  Réinitialiser
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Message d'import/export */}
        {importMessage && (
          <ImportExportMessage
            type={importMessage.type}
            message={importMessage.message}
            onClose={() => setImportMessage(null)}
          />
        )}

        {/* Message d'erreur */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Erreur de chargement
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={loadClients}
                    className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                  >
                    Réessayer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Liste des clients */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ville
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Créé le
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-2">Chargement...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      {searchTerm ? 'Aucun client trouvé pour cette recherche' : 'Aucun client enregistré'}
                    </td>
                  </tr>
                ) : (
                  ensureArray(filteredClients).map((client) => (
                    <tr key={safeTextRender(client.id, `client-${Math.random()}`)} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {safeTextRender(
                                client.type === 'COMPANY'
                                  ? safeTextRender(client.companyName, 'C').charAt(0) || 'C'
                                  : `${safeTextRender(client.firstName, '').charAt(0) || ''}${safeTextRender(client.lastName, '').charAt(0) || ''}`,
                                'C'
                              )}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {safeTextRender((() => {
                                if (client.type === 'COMPANY') {
                                  return safeTextRender(client.companyName, 'Entreprise sans nom')
                                }
                                const firstName = safeTextRender(client.firstName, '')
                                const lastName = safeTextRender(client.lastName, '')
                                const fullName = `${firstName} ${lastName}`.trim()
                                return fullName || 'Client sans nom'
                              })(), 'Client sans nom')}
                            </div>
                            <div className="text-sm text-gray-500">
                              {safeTextRender(client.email, 'Email non renseigné')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          client.type === 'COMPANY'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {safeTextRender(client.type === 'COMPANY' ? 'Entreprise' : 'Particulier', 'Inconnu')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {safeTextRender(client.phone, '-')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {safeTextRender(client.city, '-')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {client.createdAt ? new Date(client.createdAt).toLocaleDateString('fr-FR') : 'Date non renseignée'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleViewClient(client.id)}
                          className="text-green-600 hover:text-green-900 mr-3"
                        >
                          Voir
                        </button>
                        <button
                          onClick={() => handleEditClient(client.id)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDeleteClient(client.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
