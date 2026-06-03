'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { ImportExportButtons, ImportExportMessage } from '@/components/ui/import-export-buttons'
import { Plus, Search, Filter, Building2, Star, MapPin, Phone, Mail, Globe } from 'lucide-react'
import { api, Supplier } from '@/lib/api'
import { DEFAULT_BUSINESS_COUNTRY, OTHER_COUNTRIES_FILTER } from '@/lib/countries'
import {
  ensureArray,
  safeFilter,
  validateApiResponse,
  withRetry,
  safeTextRender,
  safeFormatCurrency,
  safeFormatDate
} from '@/lib/defensive-utils'

type SupplierCountryFilter = 'all' | typeof DEFAULT_BUSINESS_COUNTRY | typeof OTHER_COUNTRIES_FILTER

export function SuppliersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // États avec programmation défensive
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [typeFilter, setTypeFilter] = useState<'all' | 'COMPANY' | 'INDIVIDUAL'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [preferredFilter, setPreferredFilter] = useState<'all' | 'preferred' | 'standard'>('all')
  const [countryFilter, setCountryFilter] = useState<SupplierCountryFilter>('all')

  // Messages d'import/export
  const [importExportMessage, setImportExportMessage] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
  } | null>(null)

  // Charger les fournisseurs au montage du composant
  useEffect(() => {
    loadSuppliers()
  }, [])

  // Détecter le paramètre de rafraîchissement après création/modification
  useEffect(() => {
    const refreshParam = searchParams?.get('refresh')
    if (refreshParam) {
      loadSuppliers()

      // Nettoyer l'URL en supprimant le paramètre refresh
      const url = new URL(window.location.href)
      url.searchParams.delete('refresh')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams])

  const loadSuppliers = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await withRetry(
        () => api.getSuppliers(),
        { retries: 3, delay: 1000 } // Augmentation des tentatives et du délai
      )

      if (!validateApiResponse(response)) {
        throw new Error('Réponse API invalide')
      }

      // CORRECTION : Gestion de la structure paginée data.data.data
      const payload = response as any
      const suppliersData = ensureArray(payload?.data?.data?.data || payload?.data?.data || payload?.data || [])

      setSuppliers(suppliersData)
      
      // Si aucun fournisseur n'est trouvé, afficher un message informatif
      if (suppliersData.length === 0) {
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
    if (countryFilter === DEFAULT_BUSINESS_COUNTRY && supplier.country !== DEFAULT_BUSINESS_COUNTRY) {
      return false
    }
    if (countryFilter === OTHER_COUNTRIES_FILTER && supplier.country === DEFAULT_BUSINESS_COUNTRY) {
      return false
    }

    return true
  })

  const handleCreateSupplier = () => {
    router.push('/suppliers/new')
  }

  const handleFilters = () => {
    setShowFilters((current) => !current)
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

      await api.deleteSupplier(supplierId)
      await loadSuppliers() // Recharger la liste
      setImportExportMessage({
        type: 'success',
        message: 'Fournisseur supprimé avec succès'
      })
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

  const exportFilters = {
    search: searchTerm || undefined,
    type: typeFilter !== 'all' ? typeFilter : undefined,
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
    isPreferred: preferredFilter === 'all' ? undefined : preferredFilter === 'preferred',
    country: countryFilter === DEFAULT_BUSINESS_COUNTRY ? DEFAULT_BUSINESS_COUNTRY : undefined,
  }

  // Affichage du loading
  if (loading) {
    return (
      <MainLayout title="Fournisseurs" subtitle="Chargement...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    )
  }

  // Préparation du message d'erreur
  const errorBanner = error && (
    <div className="border rounded-lg p-4 mb-6 bg-destructive/10 border-destructive/20">
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
      <MainLayout title="Fournisseurs" subtitle="Erreur">
        {errorBanner}
      </MainLayout>
    )
  }

  return (
    <MainLayout 
      title="Fournisseurs" 
      subtitle={`${filteredSuppliers.length} fournisseur${filteredSuppliers.length > 1 ? 's' : ''} trouvé${filteredSuppliers.length > 1 ? 's' : ''}`}
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

        {/* Barre de recherche et actions */}
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1 max-w-2xl">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input
                type="text"
                placeholder="Rechercher un fournisseur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-card text-card-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:ml-auto lg:flex-nowrap lg:justify-end">
              <Button variant="outline" size="sm" onClick={handleFilters} aria-expanded={showFilters}>
                <Filter className="h-4 w-4 mr-2" />
                Filtres
              </Button>
              <ImportExportButtons
                type="suppliers"
                filters={exportFilters}
                onImportSuccess={handleImportSuccess}
                onImportError={handleImportError}
                onExportError={handleExportError}
                showPdfExport={true}
                showImport={true}
                className="flex-wrap lg:flex-nowrap"
              />
              <Button size="sm" onClick={handleCreateSupplier} className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau fournisseur
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 rounded-lg border border-border bg-secondary p-4">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Filtres</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label htmlFor="supplier-filter-type" className="mb-2 block text-sm font-medium text-muted-foreground">
                    Type de fournisseur
                  </label>
                  <select
                    id="supplier-filter-type"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as any)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-card text-card-foreground"
                  >
                    <option value="all">Tous les types</option>
                    <option value="COMPANY">Entreprises</option>
                    <option value="INDIVIDUAL">Particuliers</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="supplier-filter-status" className="mb-2 block text-sm font-medium text-muted-foreground">
                    Statut
                  </label>
                  <select
                    id="supplier-filter-status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-card text-card-foreground"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="active">Actifs</option>
                    <option value="inactive">Inactifs</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="supplier-filter-preferred" className="mb-2 block text-sm font-medium text-muted-foreground">
                    Relation
                  </label>
                  <select
                    id="supplier-filter-preferred"
                    value={preferredFilter}
                    onChange={(e) => setPreferredFilter(e.target.value as any)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-card text-card-foreground"
                  >
                    <option value="all">Tous</option>
                    <option value="preferred">Préférés</option>
                    <option value="standard">Standards</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="supplier-filter-country" className="mb-2 block text-sm font-medium text-muted-foreground">
                    Pays
                  </label>
                  <select
                    id="supplier-filter-country"
                    value={countryFilter}
                    onChange={(e) => setCountryFilter(e.target.value as SupplierCountryFilter)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-card text-card-foreground"
                  >
                    <option value="all">Tous les pays</option>
                    <option value={DEFAULT_BUSINESS_COUNTRY}>{DEFAULT_BUSINESS_COUNTRY}</option>
                    <option value={OTHER_COUNTRIES_FILTER}>Autres pays</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Liste des fournisseurs */}
        {filteredSuppliers.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium text-card-foreground">Aucun fournisseur</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchTerm || typeFilter !== 'all' || statusFilter !== 'all' || preferredFilter !== 'all'
                ? 'Aucun fournisseur ne correspond aux critères de recherche.'
                : 'Commencez par créer votre premier fournisseur.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredSuppliers.map((supplier: Supplier) => (
              <div
                key={supplier.id}
                className="bg-card rounded-lg border border-border p-6 hover:shadow-md transition-shadow"
              >
                {/* En-tête de la carte */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-card-foreground truncate">
                        {safeTextRender(supplier.name, 'Sans nom')}
                      </h3>
                      {supplier.isPreferred && (
                        <Star className="h-4 w-4 text-primary fill-current" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        supplier.type === 'COMPANY'
                          ? 'bg-secondary text-card-foreground'
                          : 'bg-secondary text-card-foreground'
                      }`}>
                        {supplier.type === 'COMPANY' ? 'Entreprise' : 'Particulier'}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        supplier.isActive
                          ? 'bg-primary/10 text-primary'
                          : 'bg-destructive/10 text-destructive'
                      }`}>
                        {supplier.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Informations de contact */}
                <div className="space-y-2 mb-4">
                  {supplier.contactName && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <span className="font-medium">Contact:</span>
                      <span className="ml-2">{safeTextRender(supplier.contactName)}</span>
                    </div>
                  )}

                  {supplier.email && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="truncate">{safeTextRender(supplier.email)}</span>
                    </div>
                  )}

                  {supplier.phone && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{safeTextRender(supplier.phone)}</span>
                    </div>
                  )}

                  {supplier.city && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{safeTextRender(supplier.city)}</span>
                      {supplier.country && supplier.country !== DEFAULT_BUSINESS_COUNTRY && (
                        <span className="ml-1">({safeTextRender(supplier.country)})</span>
                      )}
                    </div>
                  )}

                  {supplier.website && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Globe className="h-4 w-4 mr-2 text-muted-foreground" />
                      <a
                        href={supplier.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-card-foreground truncate"
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
                        <span className="text-muted-foreground">Délai paiement:</span>
                        <div className="font-medium">{supplier.paymentTerms} jours</div>
                      </div>
                    )}

                    {supplier.discount && supplier.discount > 0 && (
                      <div>
                        <span className="text-muted-foreground">Remise:</span>
                        <div className="font-medium">{supplier.discount}%</div>
                      </div>
                    )}

                    {supplier.rating && supplier.rating > 0 && (
                      <div>
                        <span className="text-muted-foreground">Note:</span>
                        <div className="flex items-center">
                          <span className="font-medium mr-1">{supplier.rating}</span>
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${
                                  i < supplier.rating!
                                    ? 'text-primary fill-current'
                                    : 'text-muted-foreground'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {supplier.productsCount !== undefined && (
                      <div>
                        <span className="text-muted-foreground">Produits:</span>
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
