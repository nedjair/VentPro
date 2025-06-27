'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit, Trash2, Building2, Star, MapPin, Phone, Mail, Globe, Package } from 'lucide-react'
import { api, Supplier } from '@/lib/api'
import { safeTextRender, safeFormatDate } from '@/lib/defensive-utils'

interface SupplierDetailPageProps {
  params: {
    id: string
  }
}

export default function SupplierDetailPage({ params }: SupplierDetailPageProps) {
  const router = useRouter()
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSupplier()
  }, [params.id])

  const loadSupplier = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await api.getSupplier(params.id)

      if (response.success && response.data) {
        setSupplier(response.data)
      } else {
        setError('Fournisseur non trouvé')
      }
    } catch (err: any) {
      console.error('Erreur lors du chargement du fournisseur:', err)
      setError(err.message || 'Erreur lors du chargement du fournisseur')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    router.push(`/suppliers/${params.id}/edit`)
  }

  const handleDelete = async () => {
    if (!supplier) return

    if (!confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ?')) {
      return
    }

    try {
      await api.deleteSupplier(params.id)
      router.push('/suppliers')
    } catch (err: any) {
      console.error('Erreur lors de la suppression:', err)
      alert(err.message || 'Erreur lors de la suppression du fournisseur')
    }
  }

  const handleBack = () => {
    router.push('/suppliers')
  }

  const actions = (
    <div className="flex space-x-2">
      <Button variant="outline" onClick={handleBack}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Retour
      </Button>
      {supplier && (
        <>
          <Button variant="outline" onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Modifier
          </Button>
          <Button 
            variant="danger" 
            onClick={handleDelete}
            disabled={supplier.productsCount ? supplier.productsCount > 0 : false}
            title={supplier.productsCount && supplier.productsCount > 0 ? 'Impossible de supprimer un fournisseur avec des produits' : ''}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer
          </Button>
        </>
      )}
    </div>
  )

  if (loading) {
    return (
      <MainLayout title="Fournisseur" subtitle="Chargement..." actions={actions}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    )
  }

  if (error || !supplier) {
    return (
      <MainLayout title="Fournisseur" subtitle="Erreur" actions={actions}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Erreur</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error || 'Fournisseur non trouvé'}</p>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout 
      title={safeTextRender(supplier.name, 'Fournisseur')} 
      subtitle="Détails du fournisseur"
      actions={actions}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* En-tête avec informations principales */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  {safeTextRender(supplier.name, 'Sans nom')}
                </h1>
                {supplier.isPreferred && (
                  <Star className="h-6 w-6 text-yellow-500 fill-current" />
                )}
              </div>
              
              <div className="flex items-center gap-3 mb-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  supplier.type === 'COMPANY' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  <Building2 className="h-4 w-4 mr-1" />
                  {supplier.type === 'COMPANY' ? 'Entreprise' : 'Particulier'}
                </span>
                
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  supplier.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {supplier.isActive ? 'Actif' : 'Inactif'}
                </span>

                {supplier.isPreferred && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                    <Star className="h-4 w-4 mr-1" />
                    Préféré
                  </span>
                )}
              </div>

              {supplier.contactName && (
                <p className="text-gray-600 mb-2">
                  <span className="font-medium">Contact principal:</span> {safeTextRender(supplier.contactName)}
                </p>
              )}

              {supplier.rating && supplier.rating > 0 && (
                <div className="flex items-center">
                  <span className="text-gray-600 mr-2">Note:</span>
                  <div className="flex items-center">
                    <span className="font-medium mr-2">{supplier.rating}/5</span>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
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
            </div>
          </div>
        </div>

        {/* Informations de contact */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations de contact</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {supplier.email && (
              <div className="flex items-center text-gray-600">
                <Mail className="h-5 w-5 mr-3 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">Email</div>
                  <a href={`mailto:${supplier.email}`} className="text-blue-600 hover:text-blue-800">
                    {safeTextRender(supplier.email)}
                  </a>
                </div>
              </div>
            )}

            {supplier.phone && (
              <div className="flex items-center text-gray-600">
                <Phone className="h-5 w-5 mr-3 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">Téléphone</div>
                  <a href={`tel:${supplier.phone}`} className="text-blue-600 hover:text-blue-800">
                    {safeTextRender(supplier.phone)}
                  </a>
                </div>
              </div>
            )}

            {supplier.mobile && (
              <div className="flex items-center text-gray-600">
                <Phone className="h-5 w-5 mr-3 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">Mobile</div>
                  <a href={`tel:${supplier.mobile}`} className="text-blue-600 hover:text-blue-800">
                    {safeTextRender(supplier.mobile)}
                  </a>
                </div>
              </div>
            )}

            {supplier.website && (
              <div className="flex items-center text-gray-600">
                <Globe className="h-5 w-5 mr-3 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">Site web</div>
                  <a 
                    href={supplier.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {safeTextRender(supplier.website)}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Adresse */}
        {(supplier.address || supplier.city || supplier.country) && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Adresse</h2>

            <div className="flex items-start text-gray-600">
              <MapPin className="h-5 w-5 mr-3 text-gray-400 mt-0.5" />
              <div>
                {supplier.address && (
                  <div>{safeTextRender(supplier.address)}</div>
                )}
                <div>
                  {supplier.postalCode && `${supplier.postalCode} `}
                  {supplier.city && safeTextRender(supplier.city)}
                </div>
                {supplier.country && (
                  <div className="text-sm text-gray-500 mt-1">
                    {safeTextRender(supplier.country)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Paramètres commerciaux */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Paramètres commerciaux</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {supplier.paymentTerms !== undefined && (
              <div>
                <div className="text-sm text-gray-500">Délai de paiement</div>
                <div className="font-medium">{supplier.paymentTerms} jours</div>
              </div>
            )}

            {supplier.discount !== undefined && supplier.discount > 0 && (
              <div>
                <div className="text-sm text-gray-500">Remise négociée</div>
                <div className="font-medium">{supplier.discount}%</div>
              </div>
            )}

            {supplier.currency && (
              <div>
                <div className="text-sm text-gray-500">Devise</div>
                <div className="font-medium">{safeTextRender(supplier.currency)}</div>
              </div>
            )}

            {supplier.productsCount !== undefined && (
              <div>
                <div className="text-sm text-gray-500">Produits</div>
                <div className="font-medium flex items-center">
                  <Package className="h-4 w-4 mr-1" />
                  {supplier.productsCount}
                </div>
              </div>
            )}
          </div>

          {supplier.deliveryTerms && (
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm text-gray-500">Conditions de livraison</div>
              <div className="font-medium">{safeTextRender(supplier.deliveryTerms)}</div>
            </div>
          )}
        </div>

        {/* Tags */}
        {supplier.tags && supplier.tags.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Tags</h2>

            <div className="flex flex-wrap gap-2">
              {supplier.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {supplier.notes && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>

            <div className="text-gray-600 whitespace-pre-wrap">
              {safeTextRender(supplier.notes)}
            </div>
          </div>
        )}

        {/* Informations système */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations système</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Créé le</div>
              <div className="font-medium">{safeFormatDate(supplier.createdAt)}</div>
            </div>

            <div>
              <div className="text-gray-500">Modifié le</div>
              <div className="font-medium">{safeFormatDate(supplier.updatedAt)}</div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
