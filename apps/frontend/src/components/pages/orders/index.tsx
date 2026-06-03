'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { ImportExportButtons, ImportExportMessage } from '@/components/ui/import-export-buttons'
import { Plus, Search, Filter, FileText, ShoppingCart, FileEdit } from 'lucide-react'
import { api, Order } from '@/lib/api'
import { ensureApiAuthentication } from '@/lib/auth-utils'
import Link from 'next/link'
import { ensureArray, safeTextRender, safeFormatCurrency } from '@/lib/defensive-utils'

export function OrdersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Keep state arrays safe to avoid runtime errors
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'all' | 'orders' | 'quotes'>(() => {
    const tab = searchParams?.get('tab')
    return tab === 'quotes' ? 'quotes' : tab === 'orders' ? 'orders' : 'all'
  })
  const [tabCounts, setTabCounts] = useState({ total: 0, orders: 0, quotes: 0 })
  const [exportMessage, setExportMessage] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  useEffect(() => {
    loadOrders()
  }, [activeTab])

  const ensureAuthentication = () => ensureApiAuthentication()

  const loadOrders = async () => {
    try {
      setLoading(true)

      // Ensure auth before calling the API
      const isAuthenticated = await ensureAuthentication()
      if (!isAuthenticated) {
        setError('Erreur d\'authentification. Impossible de charger les commandes.')
        return
      }

      const extractOrders = (response: any): Order[] => {
        if (response && typeof response === 'object') {
          const apiResponse = response as any
          if (apiResponse.success && apiResponse.data) {
            if (Array.isArray(apiResponse.data)) return apiResponse.data
            if (Array.isArray(apiResponse.data.data)) return apiResponse.data.data
          } else if (Array.isArray(apiResponse)) {
            return apiResponse
          } else if (Array.isArray(apiResponse.data)) {
            return apiResponse.data
          }
        }
        return []
      }

      const baseParams = {
        page: 1,
        limit: 20,
        search: searchTerm || undefined,
        status: statusFilter || undefined,
      }

      const [ordersResponse, quotesResponse] = await Promise.all([
        api.getOrders({ ...baseParams, type: 'ORDER' }),
        api.getOrders({ ...baseParams, type: 'QUOTE' }),
      ])
      const ordersList = ensureArray<Order>(extractOrders(ordersResponse))
      const quotesList = ensureArray<Order>(extractOrders(quotesResponse))
      const merged = [...ordersList, ...quotesList].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      setTabCounts({
        total: ordersList.length + quotesList.length,
        orders: ordersList.length,
        quotes: quotesList.length,
      })

      if (activeTab === 'orders') {
        setOrders(ordersList)
      } else if (activeTab === 'quotes') {
        setOrders(quotesList)
      } else {
        setOrders(merged)
      }
      setError(null)
    } catch (err) {
      let errorMessage = 'Erreur de chargement'
      if (err instanceof Error) {
        if (err.message.includes('401')) {
          errorMessage = 'Erreur d\'authentification. Veuillez vous reconnecter.'
        } else if (err.message.includes('Network')) {
          errorMessage = 'Erreur de connexion. Verifiez votre connexion internet.'
        } else {
          errorMessage = err.message
        }
      }

      setError(errorMessage)
      setOrders([])
      setTabCounts({ total: 0, orders: 0, quotes: 0 })
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = orders.filter((order) => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = !searchTerm || (
      order.reference?.toLowerCase().includes(searchLower) ||
      order.number?.toLowerCase().includes(searchLower) ||
      order.client?.firstName?.toLowerCase().includes(searchLower) ||
      order.client?.lastName?.toLowerCase().includes(searchLower) ||
      order.client?.companyName?.toLowerCase().includes(searchLower)
    )
    const matchesStatus = !statusFilter || order.status === statusFilter
    const matchesType = !typeFilter || order.type === typeFilter

    const matchesTab = activeTab === 'all' ||
      (activeTab === 'orders' && order.type === 'ORDER') ||
      (activeTab === 'quotes' && order.type === 'QUOTE')

    return matchesSearch && matchesStatus && matchesType && matchesTab
  })

  const buildFallbackOrderNumber = (order: Order, index: number) => {
    // Use order date to respect chronology, then a stable suffix
    const dateSource = order.createdAt ? new Date(order.createdAt) : new Date()
    const year = dateSource.getFullYear()
    const month = String(dateSource.getMonth() + 1).padStart(2, '0')
    const day = String(dateSource.getDate()).padStart(2, '0')
    const datePart = `${year}${month}${day}`
    const idPart = (order.id || '').replace(/[^A-Za-z0-9]/g, '').slice(-4).toUpperCase()
    const sequence = idPart || String(index + 1).padStart(4, '0')
    return `CMD-${datePart}-${sequence}`
  }

  const getClientDisplayName = (client?: Order['client']) => {
    // Prefer explicit names, fallback to email prefix when name is missing
    if (!client) return 'Client sans nom'

    const companyName = safeTextRender((client as any).companyName, '')
    const firstName = safeTextRender((client as any).firstName, '')
    const lastName = safeTextRender((client as any).lastName, '')
    const fullName = (`${firstName} ${lastName}`).trim()
    const directName = safeTextRender((client as any).name, '')
    const email = safeTextRender((client as any).email, '')
    const emailName = email.includes('@') ? email.split('@')[0] : ''

    return companyName || fullName || directName || emailName || 'Client sans nom'
  }
  const getStatusBadge = (status: Order['status']) => {
    const statusConfig = {
      DRAFT: { label: 'Brouillon', className: 'bg-gray-100 text-gray-800' },
      SENT: { label: 'Envoye', className: 'bg-blue-100 text-blue-800' },
      ACCEPTED: { label: 'Accepte', className: 'bg-green-100 text-green-800' },
      REJECTED: { label: 'Rejete', className: 'bg-red-100 text-red-800' },
      EXPIRED: { label: 'Expire', className: 'bg-orange-100 text-orange-800' },
      CANCELLED: { label: 'Annule', className: 'bg-gray-100 text-gray-800' },
    }

    // Defensive fallback for unknown status values
    // @ts-ignore - Dynamic access for status keys
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
      return <div className="h-4 w-4 bg-gray-300 rounded" />
    }

    return type === 'QUOTE' ? (
      <FileEdit className="h-4 w-4 text-blue-600" />
    ) : (
      <ShoppingCart className="h-4 w-4 text-green-600" />
    )
  }

  const getTypeBadge = (type: string | undefined) => {
    if (type === 'QUOTE') {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
          Devis
        </span>
      )
    }
    return (
      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
        Commande
      </span>
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
      message: `Import reussi: ${result.data?.imported || 0} commandes importees`
    })
    loadOrders()
  }

  const handleImportError = (error: string) => {
    setExportMessage({
      type: 'error',
      message: `Erreur d'import: ${error}`
    })
  }

  const handleFilters = () => {
    setShowFilters((current) => !current)
  }

  const handleDeleteOrder = async (order: Order) => {
    const isQuote = order.type === 'QUOTE'
    const confirmMessage = isQuote
      ? 'Etes-vous sur de vouloir supprimer ce devis ?'
      : 'Etes-vous sur de vouloir supprimer cette commande ?'
    if (!window.confirm(confirmMessage)) return

    try {
      const isAuthenticated = await ensureAuthentication()
      if (!isAuthenticated) {
        setError('Erreur d\'authentification. Veuillez vous connecter.')
        return
      }

      const response = isQuote
        ? await api.deleteQuote(order.id)
        : await api.deleteOrder(order.id)

      if (!response.success) {
        setError(response.message || (isQuote ? 'Erreur lors de la suppression du devis' : 'Erreur lors de la suppression de la commande'))
        return
      }

      await loadOrders()
    } catch (error) {
      let errorMessage = isQuote ? 'Erreur lors de la suppression du devis' : 'Erreur lors de la suppression de la commande'
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          errorMessage = 'Erreur d\'authentification. Veuillez vous reconnecter.'
        } else if (error.message.includes('404')) {
          errorMessage = isQuote ? 'Devis non trouve.' : 'Commande non trouvee.'
        } else {
          errorMessage = error.message
        }
      }

      setError(errorMessage)
    }
  }

  const handleViewOrder = (orderId: string) => {
    router.push(`/orders/${orderId}`)
  }

  const actions = (
    <div className="relative z-10 flex flex-wrap items-center gap-2 pointer-events-auto">
      <Button type="button" variant="outline" size="sm" onClick={handleFilters}>
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
      <Link href="/orders/new?type=QUOTE">
        <Button type="button" variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-2" />
          Nouveau devis
        </Button>
      </Link>
      <Link href="/orders/new">
        <Button type="button" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle commande
        </Button>
      </Link>
    </div>
  )

  const totalCount = tabCounts.total
  const ordersCount = tabCounts.orders
  const quotesCount = tabCounts.quotes

  return (
    <MainLayout 
      title="Commandes & Devis"
      subtitle={`${filteredOrders.length} commande${filteredOrders.length > 1 ? 's' : ''} trouvee${filteredOrders.length > 1 ? 's' : ''}`}
    >
      <div className="space-y-6">
        <div className="flex items-center gap-6 border-b border-border">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`pb-3 text-sm font-medium ${activeTab === 'all' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
          >
            Tout ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`pb-3 text-sm font-medium ${activeTab === 'orders' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
          >
            Commandes ({ordersCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('quotes')}
            className={`pb-3 text-sm font-medium ${activeTab === 'quotes' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
          >
            Devis ({quotesCount})
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card"
              >
                <option value="">Tous les types</option>
                <option value="QUOTE">Devis</option>
                <option value="ORDER">Commande</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Statut</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card"
              >
                <option value="">Tous les statuts</option>
                <option value="DRAFT">Brouillon</option>
                <option value="SENT">Envoye</option>
                <option value="ACCEPTED">Accepte</option>
                <option value="REJECTED">Rejete</option>
                <option value="EXPIRED">Expire</option>
                <option value="CANCELLED">Annule</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Recherche</label>
              <input
                type="text"
                placeholder="Rechercher une commande..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card"
              />
            </div>
          </div>
        )}

        {exportMessage && (
          <ImportExportMessage
            type={exportMessage.type}
            message={exportMessage.message}
            onClose={() => setExportMessage(null)}
          />
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <div className="card">
          <div className="flex flex-col gap-4 border-b border-border px-6 py-4 lg:flex-row lg:items-center">
            <div className="relative w-full lg:max-w-md lg:flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input
                id="order-search"
                type="text"
                placeholder="Rechercher une commande..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-card text-card-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="relative z-10 flex flex-wrap items-center gap-2 pointer-events-auto lg:ml-auto lg:flex-nowrap lg:justify-end">
              {actions}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Numero
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
              <tbody className="bg-card divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-muted-foreground">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        <span className="ml-2">Chargement...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-muted-foreground">
                      {searchTerm || statusFilter || typeFilter ? 'Aucune commande trouvee pour ces criteres' : 'Aucune commande enregistree'}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order, index) => {
                    const directNumber = safeTextRender(order.number || order.reference, '')
                    const orderNumber = directNumber || buildFallbackOrderNumber(order, index)

                    return (
                      <tr key={order.id || index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getTypeIcon(order.type)}
                            <div className="ml-2">
                              <Link href={`/orders/${safeTextRender(order.id, '')}`} className="text-sm font-medium text-primary hover:text-card-foreground">
                                {orderNumber}
                              </Link>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getTypeBadge(order.type)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {getClientDisplayName(order.client)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {safeTextRender(order.client?.email, 'Email non renseigne')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(order.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-card-foreground">
                          {safeFormatCurrency(order.totalTTC ?? order.total)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString('fr-FR') : 'Date non renseignee'}
                        </td>
                        <td className="relative z-10 px-6 py-4 whitespace-nowrap text-right text-sm font-medium pointer-events-auto">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => handleViewOrder(order.id)}
                              className="text-primary hover:text-card-foreground"
                            >
                              Voir
                            </button>
                            <button
                              type="button"
                              onClick={() => router.push(`/orders/${order.id}/edit`)}
                              className="text-primary hover:text-card-foreground"
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteOrder(order)}
                              className="text-destructive hover:text-card-foreground"
                            >
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}




