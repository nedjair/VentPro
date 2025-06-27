'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { api, Product } from '@/lib/api'
import { ArrowLeft, Edit, Trash2, Package, DollarSign, Archive, AlertTriangle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface ProductDetailsProps {
  productId: string
}

export function ProductDetailsPage({ productId }: ProductDetailsProps) {
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadProduct()
  }, [productId])

  // Fonction d'authentification automatique
  const ensureAuthentication = async () => {
    const authToken = api.getAuthToken()
    if (authToken) {
      return true
    }
    
    try {
      console.log('🔐 Tentative de connexion automatique...')
      const loginResponse = await api.login({
        email: 'admin@demo-tpe.fr',
        password: 'demo123'
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

  const loadProduct = async () => {
    try {
      setLoading(true)
      console.log('🔍 Chargement du produit:', productId)
      
      // S'assurer que l'utilisateur est authentifié
      const isAuthenticated = await ensureAuthentication()
      if (!isAuthenticated) {
        setError('Erreur d\'authentification. Impossible de charger le produit.')
        return
      }

      const response = await api.getProduct(productId)
      
      if (response.success && response.data) {
        setProduct(response.data)
        setError(null)
      } else {
        throw new Error('Produit non trouvé')
      }
    } catch (err) {
      console.error('❌ Erreur lors du chargement du produit:', err)
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    router.push(`/products/${productId}/edit`)
  }

  const handleDelete = async () => {
    if (!product) return

    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le produit "${product.name}" ?\n\nCette action est irréversible.`)) {
      try {
        console.log('Suppression du produit:', productId)
        
        // S'assurer que l'utilisateur est authentifié
        const isAuthenticated = await ensureAuthentication()
        if (!isAuthenticated) {
          setError('Erreur d\'authentification. Veuillez vous connecter.')
          return
        }

        await api.deleteProduct(productId)
        console.log('✅ Produit supprimé avec succès')
        
        // Redirection vers la liste des produits
        router.push('/products')
      } catch (error) {
        console.error('❌ Erreur lors de la suppression:', error)
        setError('Erreur lors de la suppression du produit')
      }
    }
  }

  const handleBack = () => {
    router.push('/products')
  }

  const getStockStatus = (product: Product) => {
    if (!product.trackStock) return { status: 'no-track', label: 'Non suivi', color: 'gray', icon: Archive }
    if ((product.stock ?? 0) === 0) return { status: 'out', label: 'Rupture', color: 'red', icon: AlertTriangle }
    if (product.minStock && (product.stock ?? 0) <= product.minStock) return { status: 'low', label: 'Stock bas', color: 'yellow', icon: AlertTriangle }
    return { status: 'ok', label: 'En stock', color: 'green', icon: Package }
  }

  const actions = (
    <div className="flex space-x-2">
      <Button variant="outline" onClick={handleBack}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Retour
      </Button>
      {product && (
        <>
          <Button variant="outline" onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Modifier
          </Button>
          <Button variant="outline" onClick={handleDelete} className="text-red-600 hover:text-red-700">
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer
          </Button>
        </>
      )}
    </div>
  )

  if (loading) {
    return (
      <MainLayout title="Chargement..." actions={actions}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3">Chargement du produit...</span>
        </div>
      </MainLayout>
    )
  }

  if (error || !product) {
    return (
      <MainLayout title="Erreur" actions={actions}>
        <div className="text-center py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-800 mb-2">Erreur de chargement</h3>
            <p className="text-red-700">{error || 'Produit non trouvé'}</p>
            <Button onClick={handleBack} className="mt-4">
              Retour à la liste
            </Button>
          </div>
        </div>
      </MainLayout>
    )
  }

  const stockStatus = getStockStatus(product)
  const StockIcon = stockStatus.icon

  return (
    <MainLayout 
      title={product.name}
      subtitle={product.reference || 'Détails du produit'}
      actions={actions}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Informations principales */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center">
              <Package className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Informations générales</h3>
            </div>
          </div>
          <div className="card-content">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Nom du produit</h4>
                <p className="text-lg text-gray-900">{product.name}</p>
              </div>
              
              {product.reference && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Référence</h4>
                  <p className="text-lg text-gray-900">{product.reference}</p>
                </div>
              )}
              
              {product.category && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Catégorie</h4>
                  <span className="inline-flex px-2 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
                    {product.category?.toString() || 'Non catégorisé'}
                  </span>
                </div>
              )}
              
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Statut</h4>
                <span className={`inline-flex px-2 py-1 text-sm font-semibold rounded-full ${
                  product.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {product.isActive ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </div>
            
            {product.description && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Description</h4>
                <p className="text-gray-900 whitespace-pre-wrap">{product.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Prix et coûts */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 text-green-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Prix et coûts</h3>
            </div>
          </div>
          <div className="card-content">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Prix de vente</h4>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(product.price)}</p>
              </div>
              
              {product.costPrice && product.costPrice > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Prix d'achat</h4>
                  <p className="text-xl text-gray-900">{formatCurrency(product.costPrice)}</p>
                </div>
              )}
            </div>
            
            {product.costPrice && product.costPrice > 0 && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Marge</h4>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Marge brute:</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(product.price - product.costPrice)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm text-gray-600">Taux de marge:</span>
                  <span className="font-medium text-gray-900">
                    {((product.price - product.costPrice) / product.costPrice * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stock */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center">
              <StockIcon className={`h-5 w-5 mr-2 ${
                stockStatus.color === 'green' ? 'text-green-600' :
                stockStatus.color === 'yellow' ? 'text-yellow-600' :
                stockStatus.color === 'red' ? 'text-red-600' :
                'text-gray-600'
              }`} />
              <h3 className="text-lg font-medium text-gray-900">Gestion du stock</h3>
            </div>
          </div>
          <div className="card-content">
            {product.trackStock ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Stock actuel</h4>
                  <p className="text-2xl font-bold text-gray-900">{product.stock || 0} {product.unit}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Stock minimum</h4>
                  <p className="text-xl text-gray-900">{product.minStock || 0} {product.unit}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Statut du stock</h4>
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                    stockStatus.color === 'green' ? 'bg-green-100 text-green-800' :
                    stockStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                    stockStatus.color === 'red' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {stockStatus.label}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Archive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Le stock n'est pas suivi pour ce produit</p>
              </div>
            )}
            
            <div className="mt-6 flex items-center space-x-6">
              <div className="flex items-center">
                <span className="text-sm text-gray-600">Commandes en rupture:</span>
                <span className={`ml-2 px-2 py-1 text-xs font-medium rounded ${
                  product.allowBackorder ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {product.allowBackorder ? 'Autorisées' : 'Interdites'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Informations système */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Informations système</h3>
          </div>
          <div className="card-content">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Date de création</h4>
                <p className="text-gray-900">{new Date(product.createdAt).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Dernière modification</h4>
                <p className="text-gray-900">{new Date(product.updatedAt).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
