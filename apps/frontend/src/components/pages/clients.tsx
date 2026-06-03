'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { ImportExportButtons, ImportExportMessage } from '@/components/ui/import-export-buttons'
import { Plus, Search, Filter } from 'lucide-react'
import { api, Client } from '@/lib/api'
import { ensureApiAuthentication } from '@/lib/auth-utils'
import {
  ensureArray,
  safeFilter,
  safeFind,
  safeTextRender
} from '@/lib/defensive-utils'

export function ClientsPage() {
  const router = useRouter()
  // Utilisation de la gestion sécurisée des états de tableaux
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 20
  const [filters, setFilters] = useState({
    type: '',
    city: '',
    status: ''
  })
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  useEffect(() => {
    loadClients()
  }, [currentPage, searchTerm, filters.type, filters.city])

  // Centralise la restauration du token au lieu de relancer un login local fragile.
  const ensureAuthentication = () => ensureApiAuthentication({ redirectToLogin: true })

  const loadClients = async () => {
    try {
      setLoading(true)

      // S'assurer que l'utilisateur est authentifié
      const isAuthenticated = await ensureAuthentication()
      if (!isAuthenticated) {
        setError('Erreur d\'authentification. Impossible de charger les clients.')
        return
      }

      const queryParams = {
        page: currentPage,
        limit: itemsPerPage,
        ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.city.trim() ? { city: filters.city.trim() } : {}),
      }

      const response = await api.getClients(queryParams)

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

      const safeClients = ensureArray<Client>(clientsData)

      const apiResponse = response as any
      setClients(safeClients)
      setTotalPages(apiResponse?.pagination?.totalPages || 1)
      setTotalItems(apiResponse?.pagination?.total || safeClients.length)
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
      setTotalPages(1)
      setTotalItems(0)
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

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }

  const handleFilterChange = (key: 'type' | 'city', value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Utilisation du filtrage sécurisé pour éviter les erreurs "filter is not a function"
  const filteredClients = safeFilter(clients, (client) => {
    const searchLower = searchTerm.toLowerCase()

    // Filtrage par recherche textuelle
    const matchesSearch = Boolean(
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
    const matchesCity = !filters.city || Boolean(client.city?.toLowerCase().includes(filters.city.toLowerCase()))

    return matchesSearch && matchesType && matchesCity
  })

  const handleFilters = () => {
    setShowFilters(!showFilters)
  }

  const handleNewClient = () => {
    router.push('/clients/new')
  }

  const handleEditClient = (clientId: string) => {
    router.push(`/clients/${clientId}/edit`)
  }

  const handleDeleteClient = async (clientId: string) => {
    const client = safeFind(clients, c => c.id === clientId)
    const clientName = client?.type === 'COMPANY'
      ? client.companyName
      : `${client?.firstName} ${client?.lastName}`

    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le client "${clientName}" ?\n\nCette action est irréversible.`)) {
      try {
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
    router.push(`/clients/${clientId}`)
  }

  const exportFilters = {
    ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.city.trim() ? { city: filters.city.trim() } : {}),
  }

  const startItem = totalItems === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  return (
    <MainLayout 
      title="Clients" 
      subtitle={`${totalItems} client${totalItems > 1 ? 's' : ''} trouvé${totalItems > 1 ? 's' : ''}`}
    >
      <div className="space-y-6">
        {/* Interface de filtrage */}
        {showFilters && (
          <div className="bg-secondary border border-border rounded-lg p-4">
            <h3 className="text-lg font-medium text-card-foreground mb-4">Filtres</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="filter-type" className="block text-sm font-medium text-muted-foreground mb-2">
                  Type de client
                </label>
                <select
                  id="filter-type"
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-card text-card-foreground"
                >
                  <option value="">Tous les types</option>
                  <option value="INDIVIDUAL">Particulier</option>
                  <option value="COMPANY">Entreprise</option>
                </select>
              </div>

              <div>
                <label htmlFor="filter-city" className="block text-sm font-medium text-muted-foreground mb-2">
                  Ville
                </label>
                <input
                  id="filter-city"
                  type="text"
                  placeholder="Filtrer par ville..."
                  value={filters.city}
                  onChange={(e) => handleFilterChange('city', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-card text-card-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilters({ type: '', city: '', status: '' })
                    setSearchTerm('')
                    setCurrentPage(1)
                  }}
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
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-destructive" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-destructive">
                  Erreur de chargement
                </h3>
                <div className="mt-2 text-sm text-destructive">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={loadClients}
                    className="bg-destructive/10 px-3 py-2 rounded-md text-sm font-medium text-destructive hover:bg-destructive/20"
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
          <div className="flex flex-col gap-4 border-b border-border px-6 py-4 lg:flex-row lg:items-center">
            <div className="relative w-full lg:max-w-md lg:flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input
                type="text"
                placeholder="Rechercher un client..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-card text-card-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:ml-auto lg:flex-nowrap lg:justify-end">
              <Button variant="outline" size="sm" onClick={handleFilters}>
                <Filter className="h-4 w-4 mr-2" />
                Filtres
              </Button>
              <ImportExportButtons
                type="clients"
                filters={exportFilters}
                onImportSuccess={handleImportSuccess}
                onImportError={handleImportError}
                onExportError={handleExportError}
                showPdfExport={true}
                showImport={true}
                className="flex-wrap lg:flex-nowrap"
              />
              <Button size="sm" onClick={handleNewClient}>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau client
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
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
              <tbody className="bg-card divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-muted-foreground">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        <span className="ml-2">Chargement...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-muted-foreground">
                      {searchTerm ? 'Aucun client trouvé pour cette recherche' : 'Aucun client enregistré'}
                    </td>
                  </tr>
                ) : (
                  ensureArray(filteredClients).map((client) => (
                    <tr key={safeTextRender(client.id, `client-${Math.random()}`)} className="hover:bg-secondary">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-primary-foreground text-sm font-medium">
                              {safeTextRender(
                                client.type === 'COMPANY'
                                  ? safeTextRender(client.companyName, 'C').charAt(0) || 'C'
                                  : `${safeTextRender(client.firstName, '').charAt(0) || ''}${safeTextRender(client.lastName, '').charAt(0) || ''}`,
                                'C'
                              )}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-card-foreground">
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
                            <div className="text-sm text-muted-foreground">
                              {safeTextRender(client.email, 'Email non renseigné')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          client.type === 'COMPANY'
                            ? 'bg-secondary text-card-foreground'
                            : 'bg-secondary text-card-foreground'
                        }`}>
                          {safeTextRender(client.type === 'COMPANY' ? 'Entreprise' : 'Particulier', 'Inconnu')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-card-foreground">
                        {safeTextRender(client.phone, '-')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-card-foreground">
                        {safeTextRender(client.city, '-')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {client.createdAt ? new Date(client.createdAt).toLocaleDateString('fr-FR') : 'Date non renseignée'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleViewClient(client.id)}
                          className="text-primary hover:text-card-foreground mr-3"
                        >
                          Voir
                        </button>
                        <button
                          onClick={() => handleEditClient(client.id)}
                          className="text-primary hover:text-card-foreground mr-3"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDeleteClient(client.id)}
                          className="text-destructive hover:text-card-foreground"
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

        {totalPages > 1 && (
          <div className="rounded-2xl border border-border/70 bg-white px-4 py-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="text-sm text-muted-foreground">
                Affichage de {startItem} à {endItem} sur {totalItems} clients
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Précédent
                </Button>
                <span className="px-3 text-sm text-muted-foreground">
                  Page {currentPage} sur {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Suivant
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
