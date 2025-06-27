'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { ImportExportButtons, ImportExportMessage } from '@/components/ui/import-export-buttons'
import { Plus, Search, Filter, Building2, Star, MapPin, Phone, Mail, Globe } from 'lucide-react'
import { api, Supplier } from '@/lib/api'
import {
  ensureArray,
  safeFilter,
  validateApiResponse,
  withRetry,
  safeTextRender,
  safeFormatCurrency,
  safeFormatDate
} from '@/lib/defensive-utils'

export function SuppliersPage() {
  const router = useRouter()
  
  // États avec programmation défensive
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'COMPANY' | 'INDIVIDUAL'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [preferredFilter, setPreferredFilter] = useState<'all' | 'preferred' | 'standard'>('all')
  const [countryFilter, setCountryFilter] = useState<'all' | 'France' | 'other'>('all')

  // Messages d'import/export
  const [importExportMessage, setImportExportMessage] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
  } | null>(null)

  // Charger les fournisseurs au montage du composant
  useEffect(() => {
    loadSuppliers()
  }, [])

  // Fonction d'authentification automatique (comme dans Orders et Invoices)
  const ensureAuthentication = async (): Promise<boolean> => {
    // Vérifier si un token existe déjà
    if (typeof window !== 'undefined') {
      const existingTokens = localStorage.getItem('auth-tokens')
      if (existingTokens) {
        try {
          const tokens = JSON.parse(existingTokens)
          if (tokens.accessToken) {
            api.setAuthToken(tokens.accessToken)
            console.log('✅ Token existant trouvé et configuré')
            return true
          }
        } catch (error) {
          console.log('⚠️ Token existant invalide, nouvelle connexion nécessaire')
        }
      }
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

  const loadSuppliers = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('🔍 Chargement des fournisseurs...')

      // S'assurer que l'utilisateur est authentifié
      const isAuthenticated = await ensureAuthentication()
      if (!isAuthenticated) {
        setError('Erreur d\'authentification. Impossible de charger les fournisseurs.')
        return
      }

      const response = await withRetry(
        () => api.getSuppliers(),
        { retries: 3, delay: 1000 } // Augmentation des tentatives et du délai
      )

      if (!validateApiResponse(response)) {
        throw new Error('Réponse API invalide')
      }

      const suppliersData = ensureArray(response.data?.data)
      setSuppliers(suppliersData)
      console.log('Fournisseurs chargés depuis l\'API:', suppliersData.length)
      
      // Si aucun fournisseur n'est trouvé, afficher un message informatif
      if (suppliersData.length === 0) {
        console.log('Aucun fournisseur trouvé dans la base de données')
      }
    } catch (err: any) {
      console.error('Erreur lors du chargement des fournisseurs:', err)
      setError(err.message || 'Erreur lors du chargement des fournisseurs')
      
      // Ne pas charger de données fictives en cas d'erreur
      setSuppliers([])
    } finally {
      setLoading(false)
    }
  }

  // Filtrage des fournisseurs avec programmation défensive
  const filteredSuppliers = safeFilter(suppliers, (supplier: Supplier) => {
    if (!supplier || typeof supplier !== 'object') return false

    // Filtre de recherche
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const name = safeTextRender(supplier.name, '').toLowerCase()
      const contactName = safeTextRender(supplier.contactName, '').toLowerCase()
      const email = safeTextRender(supplier.email, '').toLowerCase()
      const city = safeTextRender(supplier.city, '').toLowerCase()
      const siret = safeTextRender(supplier.siret, '').toLowerCase()

      if (!name.includes(searchLower) && 
          !contactName.includes(searchLower) && 
          !email.includes(searchLower) && 
          !city.includes(searchLower) &&
          !siret.includes(searchLower)) {
        return false
      }
    }

    // Filtre par type
    if (typeFilter !== 'all' && supplier.type !== typeFilter) {
      return false
    }

    // Filtre par statut
    if (statusFilter === 'active' && !supplier.isActive) {
      return false
    }
    if (statusFilter === 'inactive' && supplier.isActive) {
      return false
    }

    // Filtre par fournisseur préféré
    if (preferredFilter === 'preferred' && !supplier.isPreferred) {
      return false
    }
    if (preferredFilter === 'standard' && supplier.isPreferred) {
      return false
    }

    // Filtre par pays
    if (countryFilter === 'France' && supplier.country !== 'France') {
      return false
    }
    if (countryFilter === 'other' && supplier.country === 'France') {
      return false
    }

    return true
  })

  const handleCreateSupplier = () => {
    router.push('/suppliers/new')
  }

  const handleEditSupplier = (supplierId: string) => {
    router.push(`/suppliers/${supplierId}/edit`)
  }

  const handleViewSupplier = (supplierId: string) => {
    router.push(`/suppliers/${supplierId}`)
  }

  const handleDeleteSupplier = async (supplierId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ?')) {
      return
    }

    try {
      console.log('Suppression du fournisseur:', supplierId)

      // S'assurer que l'utilisateur est authentifié
      const isAuthenticated = await ensureAuthentication()
      if (!isAuthenticated) {
        setImportExportMessage({
          type: 'error',
          message: 'Erreur d\'authentification. Veuillez vous connecter.'
        })
        return
      }

      await api.deleteSupplier(supplierId)
      await loadSuppliers() // Recharger la liste
      setImportExportMessage({
        type: 'success',
        message: 'Fournisseur supprimé avec succès'
      })
      console.log('✅ Fournisseur supprimé avec succès')
    } catch (err: any) {
      console.error('❌ Erreur lors de la suppression:', err)

      let errorMessage = 'Erreur lors de la suppression du fournisseur'
      if (err.message.includes('401')) {
        errorMessage = 'Erreur d\'authentification. Veuillez vous reconnecter.'
      } else if (err.message.includes('404')) {
        errorMessage = 'Fournisseur non trouvé.'
      } else {
        errorMessage = err.message || errorMessage
      }

      setImportExportMessage({
        type: 'error',
        message: errorMessage
      })
    }
  }

  const handleImportSuccess = (result: any) => {
    setImportExportMessage({
      type: 'success',
      message: `Import réussi : ${result.imported || 0} fournisseur(s) importé(s)`
    })
    loadSuppliers() // Recharger la liste
  }

  const handleImportError = (error: string) => {
    setImportExportMessage({
      type: 'error',
      message: `Erreur d'import : ${error}`
    })
  }

  const handleExportError = (error: string) => {
    setImportExportMessage({
      type: 'error',
      message: `Erreur d'export : ${error}`
    })
  }

  // Actions de la page
  const actions = (
    <div className="flex items-center space-x-3">
      <ImportExportButtons
        type="suppliers"
        onImportSuccess={handleImportSuccess}
        onImportError={handleImportError}
        onExportError={handleExportError}
        showPdfExport={true}
        showImport={true}
      />
      <Button onClick={handleCreateSupplier} className="bg-blue-600 hover:bg-blue-700">
        <Plus className="h-4 w-4 mr-2" />
        Nouveau fournisseur
      </Button>
    </div>
  )

  // Affichage du loading
  if (loading) {
    return (
      <MainLayout title="Fournisseurs" subtitle="Chargement..." actions={actions}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    )
  }

  // Préparation du message d'erreur
  const errorBanner = error && (
    <div className="border rounded-lg p-4 mb-6 bg-red-50 border-red-200">
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
            <Button onClick={loadSuppliers} variant="outline" size="sm">
              Réessayer
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
  
  // En cas d'erreur, on affiche le message mais on continue le rendu
  if (error) {
    return (
      <MainLayout title="Fournisseurs" subtitle="Erreur" actions={actions}>
        {errorBanner}
      </MainLayout>
    )
  }

  return (
    <MainLayout 
      title="Fournisseurs" 
      subtitle={`${filteredSuppliers.length} fournisseur${filteredSuppliers.length > 1 ? 's' : ''} trouvé${filteredSuppliers.length > 1 ? 's' : ''}`}
      actions={actions}
    >
      <div className="space-y-6">
        {/* Message d'import/export */}
        {importExportMessage && (
          <ImportExportMessage
            type={importExportMessage.type}
            message={importExportMessage.message}
            onClose={() => setImportExportMessage(null)}
          />
        )}

        {/* Barre de recherche et filtres */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Rechercher un fournisseur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les types</option>
              <option value="COMPANY">Entreprises</option>
              <option value="INDIVIDUAL">Particuliers</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
            </select>

            <select
              value={preferredFilter}
              onChange={(e) => setPreferredFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous</option>
              <option value="preferred">Préférés</option>
              <option value="standard">Standards</option>
            </select>
          </div>
        </div>

        {/* Liste des fournisseurs */}
        {filteredSuppliers.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun fournisseur</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || typeFilter !== 'all' || statusFilter !== 'all' || preferredFilter !== 'all'
                ? 'Aucun fournisseur ne correspond aux critères de recherche.'
                : 'Commencez par créer votre premier fournisseur.'}
            </p>
            {(!searchTerm && typeFilter === 'all' && statusFilter === 'all' && preferredFilter === 'all') && (
              <div className="mt-6">
                <Button onClick={handleCreateSupplier} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau fournisseur
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredSuppliers.map((supplier: Supplier) => (
              <div
                key={supplier.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                {/* En-tête de la carte */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {safeTextRender(supplier.name, 'Sans nom')}
                      </h3>
                      {supplier.isPreferred && (
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        supplier.type === 'COMPANY'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {supplier.type === 'COMPANY' ? 'Entreprise' : 'Particulier'}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        supplier.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {supplier.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Informations de contact */}
                <div className="space-y-2 mb-4">
                  {supplier.contactName && (
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium">Contact:</span>
                      <span className="ml-2">{safeTextRender(supplier.contactName)}</span>
                    </div>
                  )}

                  {supplier.email && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="truncate">{safeTextRender(supplier.email)}</span>
                    </div>
                  )}

                  {supplier.phone && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="h-4 w-4 mr-2 text-gray-400" />
                      <span>{safeTextRender(supplier.phone)}</span>
                    </div>
                  )}

                  {supplier.city && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                      <span>{safeTextRender(supplier.city)}</span>
                      {supplier.country && supplier.country !== 'France' && (
                        <span className="ml-1">({safeTextRender(supplier.country)})</span>
                      )}
                    </div>
                  )}

                  {supplier.website && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Globe className="h-4 w-4 mr-2 text-gray-400" />
                      <a
                        href={supplier.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 truncate"
                      >
                        {safeTextRender(supplier.website)}
                      </a>
                    </div>
                  )}
                </div>

                {/* Informations commerciales */}
                <div className="border-t pt-4 mb-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {supplier.paymentTerms && (
                      <div>
                        <span className="text-gray-500">Délai paiement:</span>
                        <div className="font-medium">{supplier.paymentTerms} jours</div>
                      </div>
                    )}

                    {supplier.discount && supplier.discount > 0 && (
                      <div>
                        <span className="text-gray-500">Remise:</span>
                        <div className="font-medium">{supplier.discount}%</div>
                      </div>
                    )}

                    {supplier.rating && supplier.rating > 0 && (
                      <div>
                        <span className="text-gray-500">Note:</span>
                        <div className="flex items-center">
                          <span className="font-medium mr-1">{supplier.rating}</span>
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${
                                  i < supplier.rating!
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {supplier.productsCount !== undefined && (
                      <div>
                        <span className="text-gray-500">Produits:</span>
                        <div className="font-medium">{supplier.productsCount}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewSupplier(supplier.id)}
                  >
                    Voir
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditSupplier(supplier.id)}
                  >
                    Modifier
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDeleteSupplier(supplier.id)}
                    disabled={supplier.productsCount ? supplier.productsCount > 0 : false}
                    title={supplier.productsCount && supplier.productsCount > 0 ? 'Impossible de supprimer un fournisseur avec des produits' : ''}
                  >
                    Supprimer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
