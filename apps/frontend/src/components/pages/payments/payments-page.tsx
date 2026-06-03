'use client'

import React, { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Button } from '../../ui/button'
import { Badge } from '../../ui/badge'
import { Input } from '../../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { PaymentForm } from './payment-form'
import { PaymentReports } from './payment-reports'
import { PaymentSchedule } from './payment-schedule'
import {
  Plus, Search, Filter, CreditCard, Eye, Edit, Trash2, DollarSign,
  Calendar, Clock, AlertCircle, CheckCircle, FileText, Download,
  TrendingUp, Users, Banknote, Receipt, RefreshCw, BarChart3
} from 'lucide-react'
import { api } from '@/lib/api'
import { ensureApiAuthentication } from '@/lib/auth-utils'
import {
  ensureArray,
  safeFilter,
  safeFind,
  safeTextRender,
  safeFormatDate,
  safeFormatCurrency
} from '@/lib/defensive-utils'

// Types pour les paiements
interface Payment {
  id: string
  amount: number
  paymentDate: string
  paymentMethod: 'CASH' | 'CHECK' | 'TRANSFER' | 'CARD' | 'OTHER'
  reference?: string
  notes?: string
  invoiceId: string
  clientId: string
  invoice: {
    id: string
    number: string
    total: number
    paidAmount: number
    status: string
    dueDate: string
  }
  client: {
    id: string
    firstName: string
    lastName: string
    companyName?: string
    type: string
  }
  createdBy: {
    firstName: string
    lastName: string
  }
  createdAt: string
  updatedAt: string
}

interface Client {
  id: string
  firstName: string
  lastName: string
  companyName?: string
  type: string
}

interface Invoice {
  id: string
  number: string
  total: number
  paidAmount: number
  status: string
  dueDate: string
  client: Client
}

interface PaymentFilters {
  search: string
  clientId: string
  invoiceId: string
  paymentMethod: string
  dateFrom: string
  dateTo: string
  status: string
}

interface PaymentStats {
  totalAmount: number
  totalCount: number
  monthlyAmount: number
  monthlyCount: number
  averageAmount: number
  pendingAmount: number
  overdueCount: number
  methodBreakdown: Record<string, number>
}

export function PaymentsPage() {
  // États principaux
  const [payments, setPayments] = useState<Payment[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<PaymentStats | null>(null)

  // États de l'interface
  const [showForm, setShowForm] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [showReports, setShowReports] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Filtres avancés
  const [filters, setFilters] = useState<PaymentFilters>({
    search: '',
    clientId: '',
    invoiceId: '',
    paymentMethod: '',
    dateFrom: '',
    dateTo: '',
    status: ''
  })

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 20

  // Chargement initial
  useEffect(() => {
    loadInitialData()
  }, [])

  // Rechargement des paiements quand les filtres changent
  useEffect(() => {
    if (!loading) {
      loadPayments()
    }
  }, [currentPage, filters])

  const ensureAuthentication = () => ensureApiAuthentication()

  const loadInitialData = async () => {
    try {
      setLoading(true)
      setError(null)

      const authenticated = await ensureAuthentication()
      if (!authenticated) {
        throw new Error('Impossible de s\'authentifier')
      }

      // Charger les données en parallèle
      await Promise.all([
        loadPayments(),
        loadClients(),
        loadInvoices(),
        loadStats()
      ])
    } catch (err) {
      console.error('❌ Erreur lors du chargement initial:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  const loadPayments = async () => {
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.clientId && { clientId: filters.clientId }),
        ...(filters.invoiceId && { invoiceId: filters.invoiceId }),
        ...(filters.paymentMethod && { paymentMethod: filters.paymentMethod }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo })
      })

      const response = await api.get(`/api/v1/payments?${queryParams}`)

      // La réponse Axios a la structure response.data qui contient les données du serveur
      const responseData = response.data

      if (responseData.success) {
        setPayments(ensureArray(responseData.data?.data || responseData.data))
        setTotalPages(responseData.pagination?.totalPages || 1)
        setTotalItems(responseData.pagination?.total || 0)
      } else {
        throw new Error(responseData.message || 'Erreur lors de la récupération des paiements')
      }
    } catch (err) {
      console.error('❌ Erreur lors du chargement des paiements:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des paiements')
    }
  }

  const loadClients = async () => {
    try {
      const response = await api.get('/api/v1/clients?limit=100')
      const responseData = response.data
      if (responseData.success) {
        setClients(ensureArray(responseData.data?.data || responseData.data))
      }
    } catch (err) {
      console.error('❌ Erreur lors du chargement des clients:', err)
    }
  }

  const loadInvoices = async () => {
    try {
      const [sentResponse, partialResponse] = await Promise.all([
        api.get('/api/v1/invoices?limit=50&status=SENT'),
        api.get('/api/v1/invoices?limit=50&status=PARTIAL')
      ])

      const sentData = sentResponse.data
      const partialData = partialResponse.data

      if (sentData.success && partialData.success) {
        const sentInvoices = ensureArray(sentData.data?.data || sentData.data)
        const partialInvoices = ensureArray(partialData.data?.data || partialData.data)
        setInvoices([...sentInvoices, ...partialInvoices])
      }
    } catch (err) {
      console.error('❌ Erreur lors du chargement des factures:', err)
    }
  }

  const loadStats = async () => {
    try {
      const response = await api.get('/api/v1/payments/stats')
      const responseData = response.data
      if (responseData.success) {
        setStats(responseData.data)
      }
    } catch (err) {
      console.error('❌ Erreur lors du chargement des statistiques:', err)
    }
  }

  // Fonctions utilitaires
  const getPaymentMethodBadge = (method: Payment['paymentMethod']) => {
    const methodConfig = {
      CASH: { label: 'Espèces', variant: 'default' as const, icon: Banknote },
      CHECK: { label: 'Chèque', variant: 'secondary' as const, icon: FileText },
      TRANSFER: { label: 'Virement', variant: 'outline' as const, icon: RefreshCw },
      CARD: { label: 'Carte', variant: 'destructive' as const, icon: CreditCard },
      OTHER: { label: 'Autre', variant: 'outline' as const, icon: Receipt }
    }

    const config = methodConfig[method] || methodConfig.OTHER
    const IconComponent = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <IconComponent className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getInvoiceStatusBadge = (status: string) => {
    const statusConfig = {
      DRAFT: { label: 'Brouillon', variant: 'outline' as const },
      SENT: { label: 'Envoyée', variant: 'default' as const },
      PAID: { label: 'Payée', variant: 'default' as const },
      PARTIAL: { label: 'Partielle', variant: 'secondary' as const },
      OVERDUE: { label: 'En retard', variant: 'destructive' as const },
      CANCELLED: { label: 'Annulée', variant: 'outline' as const }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    )
  }

  const formatCurrency = (amount: number) => {
    return safeFormatCurrency(amount, 'DA')
  }

  const formatDate = (dateString: string) => {
    return safeFormatDate(dateString)
  }

  const getClientDisplayName = (client: Client) => {
    if (client.type === 'COMPANY' && client.companyName) {
      return client.companyName
    }
    return `${client.firstName || ''} ${client.lastName || ''}`.trim()
  }

  // Gestionnaires d'événements
  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setFilters(prev => ({ ...prev, search: value }))
    setCurrentPage(1)
  }

  const handleFilterChange = (key: keyof PaymentFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleRefresh = () => {
    loadInitialData()
  }

  const handleDelete = async (paymentId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce paiement ?')) {
      return
    }

    try {
      const response = await api.delete(`/payments/${paymentId}`)

      if (response.data?.success) {
        await loadPayments() // Recharger la liste
      } else {
        throw new Error(response.data?.message || 'Erreur lors de la suppression du paiement')
      }
    } catch (err) {
      console.error('❌ Erreur lors de la suppression:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression du paiement')
    }
  }

  const handleSavePayment = async (paymentData: any) => {
    try {
      await loadPayments() // Recharger la liste
      await loadStats() // Recharger les statistiques
      setShowForm(false)
      setSelectedPayment(null)
    } catch (err) {
      console.error('❌ Erreur lors du rechargement:', err)
    }
  }

  // Filtrage des paiements
  const filteredPayments = safeFilter(payments, (payment) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const clientName = getClientDisplayName(payment.client).toLowerCase()
      const invoiceNumber = payment.invoice?.number?.toLowerCase() || ''
      const reference = payment.reference?.toLowerCase() || ''

      if (!clientName.includes(searchLower) &&
          !invoiceNumber.includes(searchLower) &&
          !reference.includes(searchLower)) {
        return false
      }
    }
    return true
  })

  // Rendu conditionnel pour les états de chargement et d'erreur
  if (loading) {
    return (
      <MainLayout title="Paiements">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Chargement des paiements...</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout title="Paiements">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Erreur</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Réessayer
              </Button>
            </div>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
      <MainLayout title="Paiements">
      <div className="space-y-6">
        {/* En-tête avec actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestion des Paiements</h1>
            <p className="text-gray-600 mt-1">
              Suivi et gestion des paiements clients • {totalItems} paiement{totalItems > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Actualiser
            </Button>
            <Button
              onClick={() => setShowSchedule(true)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              Échéances
            </Button>
            <Button
              onClick={() => setShowReports(true)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Rapports
            </Button>
            <Button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nouveau paiement
            </Button>
          </div>
        </div>

        {/* Cartes de statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total encaissé</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(stats?.totalAmount || payments.reduce((sum, p) => sum + p.amount, 0))}
                  </p>
                  <p className="text-xs text-gray-500">
                    {stats?.totalCount || payments.length} paiement{(stats?.totalCount || payments.length) > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Ce mois</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(stats?.monthlyAmount || 0)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {stats?.monthlyCount || 0} paiement{(stats?.monthlyCount || 0) > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Montant moyen</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(stats?.averageAmount || 0)}
                  </p>
                  <p className="text-xs text-gray-500">par paiement</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-lg">
                  <Clock className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">En attente</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(stats?.pendingAmount || 0)}
                  </p>
                  <p className="text-xs text-red-500">
                    {stats?.overdueCount || 0} en retard
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Barre de recherche et filtres */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Recherche principale */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher par client, facture ou référence..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Bouton filtres */}
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filtres
                {Object.values(filters).some(v => v) && (
                  <Badge variant="secondary" className="ml-1">
                    {Object.values(filters).filter(v => v).length}
                  </Badge>
                )}
              </Button>
            </div>

            {/* Filtres avancés */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Filtre par client */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client
                    </label>
                    <Select
                      value={filters.clientId}
                      onValueChange={(value) => handleFilterChange('clientId', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tous les clients" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Tous les clients</SelectItem>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {getClientDisplayName(client)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filtre par méthode de paiement */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Méthode
                    </label>
                    <Select
                      value={filters.paymentMethod}
                      onValueChange={(value) => handleFilterChange('paymentMethod', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Toutes les méthodes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Toutes les méthodes</SelectItem>
                        <SelectItem value="CASH">Espèces</SelectItem>
                        <SelectItem value="CHECK">Chèque</SelectItem>
                        <SelectItem value="TRANSFER">Virement</SelectItem>
                        <SelectItem value="CARD">Carte</SelectItem>
                        <SelectItem value="OTHER">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filtre par date de début */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date de début
                    </label>
                    <Input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                    />
                  </div>

                  {/* Filtre par date de fin */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date de fin
                    </label>
                    <Input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                    />
                  </div>
                </div>

                {/* Actions des filtres */}
                <div className="flex items-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFilters({
                        search: '',
                        clientId: '',
                        invoiceId: '',
                        paymentMethod: '',
                        dateFrom: '',
                        dateTo: '',
                        status: ''
                      })
                      setSearchTerm('')
                    }}
                  >
                    Réinitialiser
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Exporter
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Liste des paiements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Paiements ({filteredPayments.length})
              </span>
              {filteredPayments.length > 0 && (
                <div className="text-sm text-gray-500">
                  Total: {formatCurrency(filteredPayments.reduce((sum, p) => sum + p.amount, 0))}
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredPayments.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun paiement trouvé</h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm || Object.values(filters).some(v => v)
                    ? 'Aucun paiement ne correspond à vos critères de recherche.'
                    : 'Commencez par enregistrer votre premier paiement.'
                  }
                </p>
                <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Nouveau paiement
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Informations principales */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {formatCurrency(payment.amount)}
                          </h3>
                          {getPaymentMethodBadge(payment.paymentMethod)}
                          {payment.reference && (
                            <Badge variant="outline" className="text-xs">
                              Réf: {payment.reference}
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>{getClientDisplayName(payment.client)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span>Facture {payment.invoice.number}</span>
                            {getInvoiceStatusBadge(payment.invoice.status)}
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(payment.paymentDate)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            <span>
                              {formatCurrency(payment.invoice.paidAmount)} / {formatCurrency(payment.invoice.total)}
                            </span>
                          </div>
                        </div>

                        {payment.notes && (
                          <div className="mt-2 text-sm text-gray-500 italic">
                            "{payment.notes}"
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          Voir
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPayment(payment)
                            setShowForm(true)
                          }}
                          className="flex items-center gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Modifier
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(payment.id)}
                          className="flex items-center gap-2 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Affichage de {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, totalItems)} sur {totalItems} paiements
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
                  <span className="text-sm text-gray-600 px-3">
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
            </CardContent>
          </Card>
        )}

        {/* Modal formulaire */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <PaymentForm
                payment={selectedPayment}
                onSave={handleSavePayment}
                onCancel={() => {
                  setShowForm(false)
                  setSelectedPayment(null)
                }}
              />
            </div>
          </div>
        )}

        {/* Modal rapports */}
        {showReports && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto p-6">
              <PaymentReports
                onClose={() => setShowReports(false)}
              />
            </div>
          </div>
        )}

        {/* Modal échéances */}
        {showSchedule && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto p-6">
              <PaymentSchedule
                onClose={() => setShowSchedule(false)}
                onCreatePayment={(invoiceId) => {
                  setShowSchedule(false)
                  // Ici on pourrait pré-remplir le formulaire avec la facture sélectionnée
                  setShowForm(true)
                }}
              />
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
