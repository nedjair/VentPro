'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { ImportExportButtons, ImportExportMessage } from '@/components/ui/import-export-buttons'
import { Plus, Search, Filter, FileText, CreditCard, AlertCircle } from 'lucide-react'
import { api, Invoice } from '@/lib/api'
import { ensureApiAuthentication } from '@/lib/auth-utils'
import { ExportService } from '@/lib/export'
import { InvoiceStatusBadge } from './invoice-status-badge'
import Link from 'next/link'
import {
  extractCollection,
  safeFilter
} from '@/lib/defensive-utils'

type InvoiceClient = Invoice['client']

export function getInvoiceClientDisplayName(client?: InvoiceClient): string {
  if (!client) return 'Client inconnu'

  const companyName = client.companyName?.trim()
  if (companyName) return companyName

  const fullName = `${client.firstName || ''} ${client.lastName || ''}`.trim()
  if (fullName) return fullName

  const legacyName = client.name?.trim()
  if (legacyName) return legacyName

  return 'Client inconnu'
}

export function InvoicesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Utilisation de la gestion sécurisée des états de tableaux
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [exportMessage, setExportMessage] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  // Charger les factures au montage et quand on revient sur la page
  useEffect(() => {
    // Charger les vraies données depuis l'API
    loadInvoices()
  }, [])

  // Détecter le paramètre refresh et recharger les données
  useEffect(() => {
    const refreshParam = searchParams?.get('refresh')
    if (refreshParam) {
      loadInvoices()

      // Nettoyer l'URL en supprimant le paramètre refresh
      const url = new URL(window.location.href)
      url.searchParams.delete('refresh')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams])

  // Recharger les données quand la page devient visible (retour depuis une autre page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadInvoices()
      }
    }

    const handleFocus = () => {
      loadInvoices()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const ensureAuthentication = () => ensureApiAuthentication()

  const loadInvoices = async () => {
    try {
      setLoading(true)
      setError(null)

      // S'assurer que l'utilisateur est authentifié
      const isAuthenticated = await ensureAuthentication()
      if (!isAuthenticated) {
        setError('Erreur d\'authentification. Impossible de charger les factures.')
        return
      }

      const response = await api.getInvoices({
        page: 1,
        limit: 20,
        search: searchTerm || undefined,
        status: statusFilter || undefined,
        type: typeFilter || undefined,
      })
      if (response.success && response.data) {
        const safeInvoices = extractCollection<Invoice>(response.data)
        setInvoices(safeInvoices)
        setError(null)
      } else {
        console.error('❌ Format de données invalide:', response)
        throw new Error('Format de données invalide')
      }
    } catch (err) {
      console.error('❌ Erreur lors du chargement des factures:', err)

      let errorMessage = 'Erreur de chargement'
      if (err instanceof Error) {
        if (err.message.includes('401')) {
          errorMessage = 'Erreur d\'authentification. Veuillez vous reconnecter.'
        } else {
          errorMessage = err.message
        }
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Utilisation du filtrage simple pour éviter les erreurs
  const filteredInvoices = (Array.isArray(invoices) ? invoices : []).filter((invoice) => {
    const searchLower = searchTerm.toLowerCase()
    const clientDisplayName = getInvoiceClientDisplayName(invoice.client).toLowerCase()
    const legacyName = (invoice.client?.name || '').toLowerCase()
    const matchesSearch = !searchTerm || (
      (invoice.number || '').toLowerCase().includes(searchLower) ||
      invoice.client?.firstName?.toLowerCase().includes(searchLower) ||
      invoice.client?.lastName?.toLowerCase().includes(searchLower) ||
      invoice.client?.companyName?.toLowerCase().includes(searchLower) ||
      clientDisplayName.includes(searchLower) ||
      legacyName.includes(searchLower)
    )
    const matchesStatus = !statusFilter || invoice.status === statusFilter
    const matchesType = !typeFilter || invoice.type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  const getTypeIcon = (type: string | undefined) => {
    switch (type) {
      case 'INVOICE':
        return <FileText className="h-4 w-4 text-primary" />
      case 'CREDIT_NOTE':
        return <CreditCard className="h-4 w-4 text-red-600" />
      case 'QUOTE':
        return <AlertCircle className="h-4 w-4 text-orange-600" />
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getTypeLabel = (type: string | undefined) => {
    switch (type) {
      case 'INVOICE':
        return 'Facture'
      case 'CREDIT_NOTE':
        return 'Avoir'
      case 'QUOTE':
        return 'Devis'
      default:
        return type || 'Document'
    }
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
      message: `Import réussi: ${result.data?.imported || 0} factures importées`
    })
    // Recharger la liste des factures
    loadInvoices()
  }

  const handleImportError = (error: string) => {
    setExportMessage({
      type: 'error',
      message: `Erreur d'import: ${error}`
    })
  }

  const handleFilters = () => {
    document.getElementById('invoice-filters')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.setTimeout(() => {
      const searchInput = document.getElementById('invoice-search') as HTMLInputElement | null
      searchInput?.focus()
    }, 150)
  }

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette facture ?')) {
      try {
        // S'assurer que l'utilisateur est authentifié
        const isAuthenticated = await ensureAuthentication()
        if (!isAuthenticated) {
          setError('Erreur d\'authentification. Veuillez vous connecter.')
          return
        }

        await api.deleteInvoice(invoiceId)
        await loadInvoices() // Recharger la liste
      } catch (error) {
        console.error('❌ Erreur lors de la suppression:', error)

        let errorMessage = 'Erreur lors de la suppression de la facture'
        if (error instanceof Error) {
          if (error.message.includes('401')) {
            errorMessage = 'Erreur d\'authentification. Veuillez vous reconnecter.'
          } else if (error.message.includes('404')) {
            errorMessage = 'Facture non trouvée.'
          } else {
            errorMessage = error.message
          }
        }

        setError(errorMessage)
      }
    }
  }

  const handleViewInvoice = (invoiceId?: string) => {
    if (!invoiceId) {
      setError('Impossible d’ouvrir la facture: identifiant manquant')
      return
    }
    router.push(`/invoices/${invoiceId}`)
  }

  const handleDownloadPDF = async (invoiceId?: string) => {
    if (!invoiceId) {
      setError('Impossible de télécharger le PDF: identifiant de facture manquant')
      return
    }

    try {
      const isAuthenticated = await ensureAuthentication()
      if (!isAuthenticated) {
        setError('Erreur d’authentification. Veuillez vous reconnecter.')
        return
      }
      await ExportService.downloadInvoicePDF(invoiceId)
    } catch (error) {
      console.error('❌ Erreur téléchargement PDF:', error)
      const errorMessage = error instanceof Error
        ? /failed to fetch/i.test(error.message)
          ? 'Impossible de joindre le service PDF. Vérifiez votre connexion réseau puis réessayez.'
          : error.message
        : 'Erreur lors du téléchargement du PDF'
      setError(errorMessage)
    }
  }

  const invoiceTableActions = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button variant="outline" size="sm" onClick={handleFilters}>
        <Filter className="h-4 w-4 mr-2" />
        Filtres
      </Button>
      <ImportExportButtons
        type="invoices"
        filters={{
          search: searchTerm || undefined,
          status: statusFilter || undefined,
          type: typeFilter || undefined,
        }}
        onImportSuccess={handleImportSuccess}
        onImportError={handleImportError}
        onExportError={handleExportError}
        showPdfExport={true}
        showImport={true}
      />
      <Link href="/invoices/new">
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle facture
        </Button>
      </Link>
    </div>
  )

  return (
    <MainLayout 
      title="Factures" 
      subtitle={`${filteredInvoices.length} facture${filteredInvoices.length > 1 ? 's' : ''} trouvée${filteredInvoices.length > 1 ? 's' : ''}`}
    >
      <div className="space-y-6">
        <div id="invoice-filters" className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center lg:flex-1">
            <div className="relative w-full md:min-w-[20rem]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input
                id="invoice-search"
                type="text"
                aria-label="Rechercher une facture"
                placeholder="Rechercher une facture..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filtrer par type"
              className="h-9 rounded-lg border border-border bg-card px-3 text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Tous les types</option>
              <option value="INVOICE">Factures</option>
              <option value="CREDIT_NOTE">Avoirs</option>
              <option value="PROFORMA">Proforma</option>
            </select>
          
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filtrer par statut"
              className="h-9 rounded-lg border border-border bg-card px-3 text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Tous les statuts</option>
              <option value="DRAFT">Brouillon</option>
              <option value="SENT">Envoyée</option>
              <option value="PAID">Payée</option>
              <option value="PARTIAL">Partiellement payée</option>
              <option value="OVERDUE">En retard</option>
              <option value="CANCELLED">Annulée</option>
            </select>
          </div>

          <div className="flex justify-end lg:shrink-0">
            {invoiceTableActions}
          </div>
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
                    onClick={loadInvoices}
                    className="bg-destructive/10 px-3 py-2 rounded-md text-sm font-medium text-destructive hover:bg-destructive/20"
                  >
                    Réessayer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Liste des factures */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Numéro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Échéance
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-muted-foreground">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-2">Chargement...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-muted-foreground">
                      {searchTerm || statusFilter || typeFilter ? 'Aucune facture trouvée pour ces critères' : 'Aucune facture enregistrée'}
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-secondary">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getTypeIcon(invoice.type)}
                          <div className="ml-2">
                            <Link href={`/invoices/${invoice.id}`} className="text-sm font-medium text-primary hover:text-card-foreground">
                              {invoice.number}
                            </Link>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          invoice.type === 'INVOICE' 
                            ? 'bg-secondary text-card-foreground'
                            : invoice.type === 'CREDIT_NOTE'
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-accent text-accent-foreground'
                        }`}>
                          {getTypeLabel(invoice.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-card-foreground">
                          {getInvoiceClientDisplayName(invoice.client)}
                        </div>
                        <div className="text-sm text-muted-foreground">{invoice.client?.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <InvoiceStatusBadge status={invoice.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-card-foreground">
                        {new Intl.NumberFormat('fr-DZ', {
                          style: 'currency',
                          currency: 'DZD',
                          minimumFractionDigits: 2,
                        }).format(Number(invoice.total))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString('fr-FR') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={
                          invoice.status === 'OVERDUE' ? 'text-destructive font-medium' : ''
                        }>
                          {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('fr-FR') : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          type="button"
                          onClick={() => handleDownloadPDF(invoice.id)}
                          className="text-primary hover:text-card-foreground mr-3"
                          disabled={!invoice.id}
                          title="Télécharger PDF"
                        >
                          PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => handleViewInvoice(invoice.id)}
                          className="text-primary hover:text-card-foreground mr-3"
                          disabled={!invoice.id}
                        >
                          Voir
                        </button>
                        <Link href={`/invoices/${invoice.id}/edit`} className="text-primary hover:text-card-foreground mr-3">
                          Modifier
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDeleteInvoice(invoice.id)}
                          className="text-destructive hover:text-card-foreground"
                          disabled={!invoice.id}
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
