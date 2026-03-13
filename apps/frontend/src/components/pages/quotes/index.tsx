import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Button } from '../../ui/button'
import { Badge } from '../../ui/badge'
import { Plus, Search, Filter, FileText, Eye, Edit, Trash2, CheckCircle, XCircle, Clock, Send } from 'lucide-react'
import { buildApiUrl } from '@/lib/api-config'
import QuoteForm from './quote-form'
import QuoteDetail from './quote-detail'

// Types pour les devis
interface Quote {
  id: string
  number: string
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
  quoteDate: string
  validUntil: string
  notes?: string
  subtotal: number
  taxAmount: number
  total: number
  discount: number
  client: {
    id: string
    firstName: string
    lastName: string
    companyName?: string
    email: string
  }
  items: QuoteItem[]
  createdBy: {
    firstName: string
    lastName: string
  }
  order?: {
    id: string
    number: string
  }
}

interface QuoteItem {
  id: string
  quantity: number
  unitPrice: number
  discount: number
  total: number
  product: {
    id: string
    name: string
    sku: string
  }
}

interface QuoteFilters {
  search: string
  clientId: string
  status: string
  dateFrom: string
  dateTo: string
}

const QuotesPage: React.FC = () => {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [filters, setFilters] = useState<QuoteFilters>({
    search: '',
    clientId: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  })

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 10

  const getAuthHeaders = () => {
    // Compatibilité ascendante : certaines anciennes pages utilisaient la clé
    // `token`, alors que le login courant stocke les jetons dans `auth-tokens`.
    let accessToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    if (!accessToken && typeof window !== 'undefined') {
      const storedTokens = localStorage.getItem('auth-tokens')
      if (storedTokens) {
        try {
          accessToken = JSON.parse(storedTokens)?.accessToken || null
        } catch (error) {
          console.error('Erreur lors de la lecture de auth-tokens:', error)
        }
      }
    }

    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
  }

  useEffect(() => {
    fetchQuotes()
  }, [currentPage, filters])

  const fetchQuotes = async () => {
    try {
      setLoading(true)
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.clientId && { clientId: filters.clientId }),
        ...(filters.status && { status: filters.status }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo })
      })

      const response = await fetch(buildApiUrl(`/api/v1/quotes?${queryParams.toString()}`), {
        headers: getAuthHeaders()
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des devis')
      }

      const data = await response.json()
      setQuotes(data.data)
      setTotalPages(data.pagination.pages)
      setTotalItems(data.pagination.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: Quote['status']) => {
    const statusConfig = {
      DRAFT: { label: 'Brouillon', variant: 'secondary' as const, icon: Edit },
      SENT: { label: 'Envoyé', variant: 'default' as const, icon: Send },
      ACCEPTED: { label: 'Accepté', variant: 'success' as const, icon: CheckCircle },
      REJECTED: { label: 'Refusé', variant: 'destructive' as const, icon: XCircle },
      EXPIRED: { label: 'Expiré', variant: 'outline' as const, icon: Clock }
    }

    const config = statusConfig[status]
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const handleStatusChange = async (quoteId: string, newStatus: Quote['status']) => {
    try {
      const response = await fetch(buildApiUrl(`/api/v1/quotes/${quoteId}/status`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour du statut')
      }

      fetchQuotes() // Recharger la liste
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    }
  }

  const handleConvertToOrder = async (quoteId: string) => {
    try {
      const response = await fetch(buildApiUrl(`/api/v1/quotes/${quoteId}/convert-to-order`), {
        method: 'POST',
        headers: getAuthHeaders()
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la conversion en commande')
      }

      const data = await response.json()
      alert(`Devis converti en commande ${data.data.number} avec succès !`)
      fetchQuotes() // Recharger la liste
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    }
  }

  const handleSubmitForm = async (formData: any) => {
    try {
      const url = selectedQuote
        ? `/api/v1/quotes/${selectedQuote.id}`
        : '/api/v1/quotes'

      const method = selectedQuote ? 'PUT' : 'POST'

      const response = await fetch(buildApiUrl(url), {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la sauvegarde du devis')
      }

      setShowForm(false)
      setSelectedQuote(null)
      fetchQuotes() // Recharger la liste
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
      throw err // Relancer l'erreur pour que le formulaire puisse la gérer
    }
  }

  const handleExportPDF = async (quoteId: string) => {
    try {
      const response = await fetch(buildApiUrl(`/api/v1/quotes/${quoteId}/export/pdf`), {
        headers: getAuthHeaders()
      })

      if (!response.ok) {
        throw new Error('Erreur lors de l\'export PDF')
      }

      const blob = await response.blob()
      const contentDisposition = response.headers.get('Content-Disposition')
      const fallbackFilename = `devis-${quoteId}.pdf`
      const filenameMatch = contentDisposition?.match(/filename="?([^";]+)"?/) || null
      const filename = filenameMatch?.[1] || fallbackFilename

      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    }
  }

  const handleDelete = async (quoteId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce devis ?')) {
      return
    }

    try {
      const response = await fetch(buildApiUrl(`/api/v1/quotes/${quoteId}`), {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression du devis')
      }

      fetchQuotes() // Recharger la liste
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-DZ', {
      style: 'currency',
      currency: 'DZD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Chargement des devis...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Erreur: {error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Devis</h1>
          <p className="text-gray-600">Gestion des devis clients</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nouveau devis
        </Button>
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Recherche</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Numéro, client..."
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Statut</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">Tous les statuts</option>
                <option value="DRAFT">Brouillon</option>
                <option value="SENT">Envoyé</option>
                <option value="ACCEPTED">Accepté</option>
                <option value="REJECTED">Refusé</option>
                <option value="EXPIRED">Expiré</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date de début</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date de fin</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => setFilters({ search: '', clientId: '', status: '', dateFrom: '', dateTo: '' })}
                variant="outline"
                className="w-full"
              >
                Réinitialiser
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des devis */}
      <Card>
        <CardHeader>
          <CardTitle>
            Devis ({totalItems})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {quotes.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Aucun devis trouvé</p>
            </div>
          ) : (
            <div className="space-y-4">
              {quotes.map((quote) => (
                <div key={quote.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{quote.number}</h3>
                        {getStatusBadge(quote.status)}
                        {quote.order && (
                          <Badge variant="outline" className="text-green-600">
                            Converti en {quote.order.number}
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Client:</span><br />
                          {quote.client.companyName || `${quote.client.firstName} ${quote.client.lastName}`}
                        </div>
                        <div>
                          <span className="font-medium">Date:</span><br />
                          {formatDate(quote.quoteDate)}
                        </div>
                        <div>
                          <span className="font-medium">Valide jusqu'au:</span><br />
                          {formatDate(quote.validUntil)}
                        </div>
                        <div>
                          <span className="font-medium">Montant:</span><br />
                          <span className="font-semibold text-lg">{formatCurrency(quote.total)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedQuote(quote)
                          setShowDetail(true)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {quote.status === 'DRAFT' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedQuote(quote)
                            setShowForm(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {quote.status === 'ACCEPTED' && !quote.order && (
                        <Button
                          size="sm"
                          onClick={() => handleConvertToOrder(quote.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Convertir
                        </Button>
                      )}
                      {quote.status !== 'ACCEPTED' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(quote.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Précédent
              </Button>
              <span className="px-4 py-2">
                Page {currentPage} sur {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Suivant
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {selectedQuote ? 'Modifier le devis' : 'Nouveau devis'}
            </h2>
            <QuoteForm
              quote={selectedQuote}
              onSubmit={handleSubmitForm}
              onCancel={() => {
                setShowForm(false)
                setSelectedQuote(null)
              }}
            />
          </div>
        </div>
      )}

      {showDetail && selectedQuote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <QuoteDetail
              quote={selectedQuote}
              onEdit={() => {
                setShowDetail(false)
                setShowForm(true)
              }}
              onStatusChange={(status) => {
                handleStatusChange(selectedQuote.id, status)
                setShowDetail(false)
                setSelectedQuote(null)
              }}
              onConvertToOrder={() => {
                handleConvertToOrder(selectedQuote.id)
                setShowDetail(false)
                setSelectedQuote(null)
              }}
              onExportPDF={() => handleExportPDF(selectedQuote.id)}
            />
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDetail(false)
                  setSelectedQuote(null)
                }}
              >
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default QuotesPage
