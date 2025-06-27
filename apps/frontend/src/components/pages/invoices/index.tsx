'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { ImportExportButtons, ImportExportMessage } from '@/components/ui/import-export-buttons'
import { Plus, Search, Filter, FileText, CreditCard, AlertCircle } from 'lucide-react'
import { api, Invoice } from '@/lib/api'
import { ExportService } from '@/lib/export'
import Link from 'next/link'
import {
  safeFilter
} from '@/lib/defensive-utils'

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
    // Temporaire : utiliser des données de test si le backend n'est pas disponible
    const testInvoices = [
      {
        id: 'test-1',
        number: 'FAC-202412-0001',
        type: 'INVOICE',
        status: 'SENT',
        invoiceDate: '2024-12-21',
        dueDate: '2025-01-21',
        total: 1500.00,
        client: {
          id: 'client-1',
          type: 'COMPANY',
          companyName: 'Test Company',
          email: 'test@company.com'
        }
      },
      {
        id: 'test-2',
        number: 'FAC-202412-0002',
        type: 'INVOICE',
        status: 'PAID',
        invoiceDate: '2024-12-20',
        dueDate: '2025-01-20',
        total: 2500.00,
        client: {
          id: 'client-2',
          type: 'INDIVIDUAL',
          firstName: 'Ahmed',
          lastName: 'Benali',
          email: 'ahmed@email.com'
        }
      }
    ]

    console.log('🧪 Utilisation de données de test')
    setInvoices(testInvoices)
    setLoading(false)

    // Essayer de charger les vraies données en arrière-plan
    loadInvoices()
  }, [])

  // Détecter le paramètre refresh et recharger les données
  useEffect(() => {
    const refreshParam = searchParams.get('refresh')
    if (refreshParam) {
      console.log('🔄 Paramètre refresh détecté, rechargement des factures...')
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
        console.log('🔄 Page visible, rechargement des factures...')
        loadInvoices()
      }
    }

    const handleFocus = () => {
      console.log('🔄 Page focus, rechargement des factures...')
      loadInvoices()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
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

  const loadInvoices = async () => {
    try {
      setLoading(true)
      console.log('🔍 Chargement des factures...')

      // S'assurer que l'utilisateur est authentifié
      const isAuthenticated = await ensureAuthentication()
      if (!isAuthenticated) {
        setError('Erreur d\'authentification. Impossible de charger les factures.')
        return
      }

      const response = await api.getInvoices({
        page: 1,
        limit: 50,
        search: searchTerm || undefined,
        status: statusFilter || undefined,
        type: typeFilter || undefined,
      })
      console.log('🧾 Réponse complète:', JSON.stringify(response, null, 2))
      console.log('🧾 response.success:', response.success)
      console.log('🧾 response.data:', response.data)
      console.log('🧾 Type de response.data:', typeof response.data)
      console.log('🧾 Array.isArray(response.data):', Array.isArray(response.data))
      console.log('🧾 response.data?.length:', response.data?.length)

      if (response.success && response.data) {
        // Le backend retourne directement un tableau dans response.data
        console.log('✅ Factures chargées avec succès:', response.data?.length || 0, 'factures')
        console.log('✅ Première facture:', response.data[0])
        setInvoices(response.data || [])
        setError(null)
        console.log('✅ État invoices mis à jour')
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
    const matchesSearch = !searchTerm || (
      (invoice.number || '').toLowerCase().includes(searchLower) ||
      invoice.client?.firstName?.toLowerCase().includes(searchLower) ||
      invoice.client?.lastName?.toLowerCase().includes(searchLower) ||
      invoice.client?.companyName?.toLowerCase().includes(searchLower)
    )
    const matchesStatus = !statusFilter || invoice.status === statusFilter
    const matchesType = !typeFilter || invoice.type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  console.log('📊 État actuel (v3):')
  console.log('📊 invoices.length:', invoices.length)
  console.log('📊 filteredInvoices.length:', filteredInvoices.length)
  console.log('📊 loading:', loading)
  console.log('📊 error:', error)

  const getStatusBadge = (status: Invoice['status']) => {
    const statusConfig = {
      DRAFT: { label: 'Brouillon', className: 'bg-gray-100 text-gray-800' },
      SENT: { label: 'Envoyée', className: 'bg-blue-100 text-blue-800' },
      PAID: { label: 'Payée', className: 'bg-green-100 text-green-800' },
      PARTIAL: { label: 'Partiellement payée', className: 'bg-yellow-100 text-yellow-800' },
      OVERDUE: { label: 'En retard', className: 'bg-red-100 text-red-800' },
      CANCELLED: { label: 'Annulée', className: 'bg-gray-100 text-gray-800' },
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.className}`}>
        {config.label}
      </span>
    )
  }

  const getTypeIcon = (type: string | undefined) => {
    switch (type) {
      case 'INVOICE':
        return <FileText className="h-4 w-4 text-blue-600" />
      case 'CREDIT_NOTE':
        return <CreditCard className="h-4 w-4 text-red-600" />
      case 'QUOTE':
        return <AlertCircle className="h-4 w-4 text-orange-600" />
      default:
        return <FileText className="h-4 w-4 text-gray-600" />
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
    console.log('Ouverture des filtres...')
    // TODO: Implémenter les filtres
  }

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette facture ?')) {
      try {
        console.log('Suppression de la facture:', invoiceId)

        // S'assurer que l'utilisateur est authentifié
        const isAuthenticated = await ensureAuthentication()
        if (!isAuthenticated) {
          setError('Erreur d\'authentification. Veuillez vous connecter.')
          return
        }

        await api.deleteInvoice(invoiceId)
        await loadInvoices() // Recharger la liste

        console.log('✅ Facture supprimée avec succès')
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

  const handleViewInvoice = (invoiceId: string) => {
    window.location.href = `/invoices/${invoiceId}`
  }

  const handleDownloadPDF = async (invoiceId: string) => {
    try {
      console.log(`📄 Téléchargement PDF facture ${invoiceId}...`)
      await ExportService.downloadInvoicePDF(invoiceId)
      console.log('✅ PDF téléchargé avec succès')
    } catch (error) {
      console.error('❌ Erreur téléchargement PDF:', error)
      setError('Erreur lors du téléchargement du PDF')
    }
  }

  const actions = (
    <div className="flex space-x-2">
      <Button variant="outline" size="sm" onClick={handleFilters}>
        <Filter className="h-4 w-4 mr-2" />
        Filtres
      </Button>
      <ImportExportButtons
        type="invoices"
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
      actions={actions}
    >
      <div className="space-y-6">
        {/* Filtres */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Rechercher une facture..."
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
            <option value="INVOICE">Factures</option>
            <option value="CREDIT_NOTE">Avoirs</option>
            <option value="PROFORMA">Proforma</option>
          </select>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    onClick={loadInvoices}
                    className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Échéance
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-2">Chargement...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                      {searchTerm || statusFilter || typeFilter ? 'Aucune facture trouvée pour ces critères' : 'Aucune facture enregistrée'}
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getTypeIcon(invoice.type)}
                          <div className="ml-2">
                            <Link href={`/invoices/${invoice.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-900">
                              {invoice.number}
                            </Link>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          invoice.type === 'INVOICE' 
                            ? 'bg-blue-100 text-blue-800' 
                            : invoice.type === 'CREDIT_NOTE'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {getTypeLabel(invoice.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {invoice.client?.type === 'COMPANY' 
                            ? invoice.client.companyName 
                            : `${invoice.client?.firstName} ${invoice.client?.lastName}`
                          }
                        </div>
                        <div className="text-sm text-gray-500">{invoice.client?.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(invoice.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
                          invoice.status === 'OVERDUE' ? 'text-red-600 font-medium' : ''
                        }>
                          {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('fr-FR') : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDownloadPDF(invoice.id)}
                          className="text-purple-600 hover:text-purple-900 mr-3"
                          title="Télécharger PDF"
                        >
                          PDF
                        </button>
                        <button
                          onClick={() => handleViewInvoice(invoice.id)}
                          className="text-green-600 hover:text-green-900 mr-3"
                        >
                          Voir
                        </button>
                        <Link href={`/invoices/${invoice.id}/edit`} className="text-blue-600 hover:text-blue-900 mr-3">
                          Modifier
                        </Link>
                        <button
                          onClick={() => handleDeleteInvoice(invoice.id)}
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
