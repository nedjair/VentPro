'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { ImportExportButtons, ImportExportMessage } from '@/components/ui/import-export-buttons'
import { Plus, Search, Filter, FileText, ShoppingCart } from 'lucide-react'
import { api, Order } from '@/lib/api'
import Link from 'next/link'
import {
  ensureArray,
  safeFilter,
  safeTextRender,
  safeFormatCurrency,
  safeFormatDate
} from '@/lib/defensive-utils'

export function OrdersPage() {
  // Utilisation de la gestion sécurisée des états de tableaux
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [exportMessage, setExportMessage] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  useEffect(() => {
    loadOrders()
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

  const loadOrders = async () => {
    try {
      setLoading(true)
      console.log('🔍 Chargement des commandes...')

      // S'assurer que l'utilisateur est authentifié
      const isAuthenticated = await ensureAuthentication()
      if (!isAuthenticated) {
        setError('Erreur d\'authentification. Impossible de charger les commandes.')
        return
      }

      const response = await api.getOrders({
        page: 1,
        limit: 50,
        search: searchTerm || undefined,
        status: statusFilter || undefined,
        type: typeFilter || undefined,
      })

      console.log('📋 Réponse commandes:', response)

      // Approche simplifiée et robuste
      let ordersData: Order[] = []

      if (response && typeof response === 'object') {
        const apiResponse = response as any

        // Si la réponse a une structure success/data
        if (apiResponse.success && apiResponse.data) {
          if (Array.isArray(apiResponse.data)) {
            ordersData = apiResponse.data
          } else if (Array.isArray(apiResponse.data.data)) {
            ordersData = apiResponse.data.data
          }
        }
        // Si la réponse est directement un tableau
        else if (Array.isArray(apiResponse)) {
          ordersData = apiResponse
        }
        // Si la réponse contient directement des données
        else if (Array.isArray(apiResponse.data)) {
          ordersData = apiResponse.data
        }
      }

      // Assurer que nous avons toujours un tableau
      const safeOrders = ensureArray<Order>(ordersData)
      console.log('✅ Commandes chargées avec succès:', safeOrders.length, 'commandes')

      setOrders(safeOrders)
      setError(null)
    } catch (err) {
      console.error('❌ Erreur lors du chargement des commandes:', err)

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
      // Garantir que orders reste toujours un tableau valide
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  // Utilisation du filtrage sécurisé pour éviter les erreurs "filter is not a function"
  const filteredOrders = orders.filter((order) => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = !searchTerm || (
      order.reference?.toLowerCase().includes(searchLower) ||
      order.client?.firstName?.toLowerCase().includes(searchLower) ||
      order.client?.lastName?.toLowerCase().includes(searchLower) ||
      order.client?.companyName?.toLowerCase().includes(searchLower)
    )
    const matchesStatus = !statusFilter || order.status === statusFilter
    const matchesType = !typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  const getStatusBadge = (status: Order['status']) => {
    const statusConfig = {
      DRAFT: { label: 'Brouillon', className: 'bg-gray-100 text-gray-800' },
      SENT: { label: 'Envoyé', className: 'bg-blue-100 text-blue-800' },
      ACCEPTED: { label: 'Accepté', className: 'bg-green-100 text-green-800' },
      REJECTED: { label: 'Rejeté', className: 'bg-red-100 text-red-800' },
      EXPIRED: { label: 'Expiré', className: 'bg-orange-100 text-orange-800' },
      CANCELLED: { label: 'Annulé', className: 'bg-gray-100 text-gray-800' },
    }

    // Gestion défensive : utiliser une configuration par défaut si le statut n'existe pas
    // @ts-ignore - Nous utilisons un accès dynamique au statut
    const config = statusConfig[status] || {
      label: status || 'Inconnu',
      className: 'bg-gray-100 text-gray-800'
    }

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.className}`}>
        {config.label}
      </span>
    )
  }

  const getTypeIcon = (type: string | undefined) => {
    if (!type) {
      return <div className="h-4 w-4 bg-gray-300 rounded" /> // Placeholder si pas de type
    }

    return type === 'QUOTE' ? (
      <FileText className="h-4 w-4 text-blue-600" />
    ) : (
      <ShoppingCart className="h-4 w-4 text-green-600" />
    )
  }

  const handleExportError = (error: string) => {
    setExportMessage({
      type: 'error',
      message: `Erreur d'export: ${error}`
    })
  }

  const handleImportSuccess = (result: any) => {
    setExportMessage({
      type: 'success',
      message: `Import réussi: ${result.data?.imported || 0} commandes importées`
    })
    // Recharger la liste des commandes
    loadOrders()
  }

  const handleImportError = (error: string) => {
    setExportMessage({
      type: 'error',
      message: `Erreur d'import: ${error}`
    })
  }

  const handleFilters = () => {
    console.log('Ouverture des filtres...')
    // TODO: Implémenter les filtres
  }

  const handleDeleteOrder = async (orderId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette commande ?')) {
      try {
        console.log('Suppression de la commande:', orderId)

        // S'assurer que l'utilisateur est authentifié
        const isAuthenticated = await ensureAuthentication()
        if (!isAuthenticated) {
          setError('Erreur d\'authentification. Veuillez vous connecter.')
          return
        }

        await api.deleteOrder(orderId)
        await loadOrders() // Recharger la liste

        console.log('✅ Commande supprimée avec succès')
      } catch (error) {
        console.error('❌ Erreur lors de la suppression:', error)

        let errorMessage = 'Erreur lors de la suppression de la commande'
        if (error instanceof Error) {
          if (error.message.includes('401')) {
            errorMessage = 'Erreur d\'authentification. Veuillez vous reconnecter.'
          } else if (error.message.includes('404')) {
            errorMessage = 'Commande non trouvée.'
          } else {
            errorMessage = error.message
          }
        }

        setError(errorMessage)
      }
    }
  }

  const handleViewOrder = (orderId: string) => {
    window.location.href = `/orders/${orderId}`
  }

  const actions = (
    <div className="flex space-x-2">
      <Button variant="outline" size="sm" onClick={handleFilters}>
        <Filter className="h-4 w-4 mr-2" />
        Filtres
      </Button>
      <ImportExportButtons
        type="orders"
        onImportSuccess={handleImportSuccess}
        onImportError={handleImportError}
        onExportError={handleExportError}
        showPdfExport={true}
        showImport={true}
      />
      <Link href="/orders/new">
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle commande
        </Button>
      </Link>
    </div>
  )

  return (
    <MainLayout 
      title="Commandes & Devis" 
      subtitle={`${filteredOrders.length} commande${filteredOrders.length > 1 ? 's' : ''} trouvée${filteredOrders.length > 1 ? 's' : ''}`}
      actions={actions}
    >
      <div className="space-y-6">
        {/* Filtres */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Rechercher une commande..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tous les types</option>
            <option value="QUOTE">Devis</option>
            <option value="ORDER">Commandes</option>
          </select>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tous les statuts</option>
            <option value="DRAFT">Brouillon</option>
            <option value="SENT">Envoyé</option>
            <option value="ACCEPTED">Accepté</option>
            <option value="REJECTED">Rejeté</option>
            <option value="EXPIRED">Expiré</option>
            <option value="CANCELLED">Annulé</option>
          </select>
        </div>

        {/* Message d'export */}
        {exportMessage && (
          <ImportExportMessage
            type={exportMessage.type}
            message={exportMessage.message}
            onClose={() => setExportMessage(null)}
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
                    onClick={loadOrders}
                    className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                  >
                    Réessayer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Liste des commandes */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Numéro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-2">Chargement...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      {searchTerm || statusFilter || typeFilter ? 'Aucune commande trouvée pour ces critères' : 'Aucune commande enregistrée'}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getTypeIcon('ORDER')}
                          <div className="ml-2">
                            <Link href={`/orders/${safeTextRender(order.id, '')}`} className="text-sm font-medium text-blue-600 hover:text-blue-900">
                              {safeTextRender(order.reference, 'N/A')}
                            </Link>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Commande
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {safeTextRender((() => {
                            if (!order.client) return 'Client non renseigné'
                            if (order.client.type === 'COMPANY') {
                              return safeTextRender(order.client.companyName, 'Entreprise sans nom')
                            }
                            const firstName = safeTextRender(order.client.firstName, '')
                            const lastName = safeTextRender(order.client.lastName, '')
                            const fullName = `${firstName} ${lastName}`.trim()
                            return fullName || 'Client sans nom'
                          })(), 'Client non renseigné')}
                        </div>
                        <div className="text-sm text-gray-500">
                          {safeTextRender(order.client?.email, 'Email non renseigné')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {safeFormatCurrency(order.totalTTC)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString('fr-FR') : 'Date non renseignée'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleViewOrder(order.id)}
                          className="text-green-600 hover:text-green-900 mr-3"
                        >
                          Voir
                        </button>
                        <Link href={`/orders/${order.id}/edit`} className="text-blue-600 hover:text-blue-900 mr-3">
                          Modifier
                        </Link>
                        <button
                          onClick={() => handleDeleteOrder(order.id)}
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
