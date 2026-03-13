'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CategoryDisplay } from '@/components/ui/category-display'
import { api, Product } from '@/lib/api'
import { ensureApiAuthentication } from '@/lib/auth-utils'
import { AlertTriangle, Archive, ArrowLeft, Boxes, CalendarClock, DollarSign, Edit, Package, Settings2, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useUnifiedProduct } from '@/hooks/useUnifiedStockCache'

interface ProductDetailsProps {
  productId: string
}

export function ProductDetailsPage({ productId }: ProductDetailsProps) {
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Hook unifié pour les données de stock
  const {
    product: unifiedProduct,
    loading: stockLoading,
    error: stockError,
  } = useUnifiedProduct(productId)

  useEffect(() => {
    loadProduct()
  }, [productId])

  const ensureAuthentication = () => ensureApiAuthentication()

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

  const getStockStatus = () => {
    // Utiliser les données unifiées si disponibles, sinon fallback sur les données produit
    if (unifiedProduct) {
      switch (unifiedProduct.status) {
        case 'out': return { status: 'out', label: 'Rupture', color: 'red', icon: AlertTriangle }
        case 'low': return { status: 'low', label: 'Stock faible', color: 'yellow', icon: AlertTriangle }
        case 'over': return { status: 'over', label: 'Surstock', color: 'blue', icon: Package }
        case 'normal': return { status: 'normal', label: 'En stock', color: 'green', icon: Package }
        default: return { status: 'unknown', label: 'Inconnu', color: 'gray', icon: Archive }
      }
    }

    // Fallback sur les données produit classiques
    if (!product?.trackStock) return { status: 'no-track', label: 'Non suivi', color: 'gray', icon: Archive }
    if ((product.stock ?? 0) === 0) return { status: 'out', label: 'Rupture', color: 'red', icon: AlertTriangle }
    if (product.minStock && (product.stock ?? 0) <= product.minStock) return { status: 'low', label: 'Stock bas', color: 'yellow', icon: AlertTriangle }
    return { status: 'ok', label: 'En stock', color: 'green', icon: Package }
  }

  const getStockQuantity = () => {
    return unifiedProduct?.stockQuantity ?? product?.stock ?? 0
  }

  const getMinStock = () => {
    return unifiedProduct?.minStock ?? product?.minStock ?? 0
  }

  const getMaxStock = () => {
    return unifiedProduct?.maxStock ?? product?.maxStock
  }

  const formatDate = (value: string) => {
    return new Date(value).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const actions = (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" onClick={handleBack}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour
      </Button>
      {product && (
        <>
          <Button variant="outline" onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Modifier
          </Button>
          <Button variant="outline" onClick={handleDelete} className="text-red-600 hover:text-red-700">
            <Trash2 className="mr-2 h-4 w-4" />
            Supprimer
          </Button>
        </>
      )}
    </div>
  )

  if (loading) {
    return (
      <MainLayout title="Chargement...">
        <Card className="mx-auto max-w-3xl">
          <CardContent className="flex items-center justify-center gap-3 py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            <span className="text-sm text-muted-foreground">Chargement du produit...</span>
          </CardContent>
        </Card>
      </MainLayout>
    )
  }

  if (error || !product) {
    return (
      <MainLayout title="Erreur">
        <Card className="mx-auto max-w-xl border-red-200 bg-red-50/80 shadow-none">
          <CardContent className="space-y-4 p-6 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-red-800">Erreur de chargement</h3>
              <p className="text-sm text-red-700">{error || 'Produit non trouvé'}</p>
            </div>
            <Button onClick={handleBack}>Retour à la liste</Button>
          </CardContent>
        </Card>
      </MainLayout>
    )
  }

  const stockStatus = getStockStatus()
  const StockIcon = stockStatus.icon
  const stockQuantity = getStockQuantity()
  const minStock = getMinStock()
  const maxStock = getMaxStock()
  const showMargin = Boolean(product.costPrice && product.costPrice > 0)
  const marginValue = showMargin ? product.price - (product.costPrice || 0) : 0
  const marginRate = showMargin && product.costPrice
    ? ((marginValue / product.costPrice) * 100).toFixed(1)
    : null

  const stockBadgeClass =
    stockStatus.color === 'green'
      ? 'bg-emerald-500/10 text-emerald-700 border-emerald-200'
      : stockStatus.color === 'yellow'
        ? 'bg-amber-500/10 text-amber-700 border-amber-200'
        : stockStatus.color === 'red'
          ? 'bg-red-500/10 text-red-700 border-red-200'
          : stockStatus.color === 'blue'
            ? 'bg-sky-500/10 text-sky-700 border-sky-200'
            : 'bg-muted text-muted-foreground border-border'

  return (
    <MainLayout
      title={product.name}
      subtitle={product.reference || product.sku || 'Détails du produit'}
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-primary/10 p-2 text-primary">
                  <Package className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <CardTitle>Informations générales</CardTitle>
                  <CardDescription>
                    Données d’identification, description et statut du produit.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Nom du produit</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{product.name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Référence</p>
                  <p className="mt-2 text-lg text-foreground">{product.reference || product.sku || 'Non renseignée'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Catégorie</p>
                  <div className="mt-2">
                    <CategoryDisplay category={product.category || null} variant="full" fallbackText="Non catégorisé" />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Statut</p>
                  <div className="mt-2">
                    <Badge className={product.isActive ? 'border-emerald-200 bg-emerald-500/10 text-emerald-700' : 'border-border bg-muted text-muted-foreground'}>
                      {product.isActive ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Description</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
                  {product.description || 'Aucune description disponible.'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-emerald-500/10 p-2 text-emerald-600">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <CardTitle>Prix et coûts</CardTitle>
                  <CardDescription>
                    Vue synthétique de la valorisation du produit.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Prix de vente</p>
                <p className="mt-2 text-3xl font-semibold text-emerald-600">{formatCurrency(product.price)}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Prix d'achat</p>
                  <p className="mt-2 text-lg text-foreground">
                    {showMargin ? formatCurrency(product.costPrice || 0) : 'Non renseigné'}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">TVA</p>
                  <p className="mt-2 text-lg text-foreground">{product.vatRate ?? 20}%</p>
                </div>
              </div>

              {showMargin && marginRate && (
                <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Marge estimée</p>
                  <div className="mt-3 flex items-center justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">Marge brute</span>
                    <span className="font-medium text-foreground">{formatCurrency(marginValue)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">Taux de marge</span>
                    <span className="font-medium text-foreground">{marginRate}%</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-amber-500/10 p-2 text-amber-600">
                  <StockIcon className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <CardTitle>Gestion du stock</CardTitle>
                  <CardDescription>
                    Quantités, seuils de sécurité et indicateurs issus du cache unifié.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {product.trackStock ? (
                <>
                  <div className="grid gap-5 md:grid-cols-3">
                    <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Stock actuel</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{stockQuantity} {product.unit}</p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Stock minimum</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{minStock} {product.unit}</p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Stock maximum</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{maxStock ?? '—'}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Badge className={stockBadgeClass}>{stockStatus.label}</Badge>
                    <Badge variant="outline">{product.allowBackorder ? 'Rupture autorisée' : 'Rupture bloquée'}</Badge>
                    {unifiedProduct && (
                      <Badge variant="outline">Valeur stock: {formatCurrency(unifiedProduct.value)}</Badge>
                    )}
                  </div>

                  {unifiedProduct && (
                    <p className="text-xs text-muted-foreground">
                      Dernière mise à jour du cache stock: {new Date(unifiedProduct.lastUpdate).toLocaleDateString('fr-FR')}
                    </p>
                  )}

                  {(stockLoading || stockError) && (
                    <div className="rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
                      {stockLoading ? 'Synchronisation du stock en cours...' : `Données unifiées indisponibles: ${stockError}`}
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
                  <Archive className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">Le stock n'est pas suivi pour ce produit.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-sky-500/10 p-2 text-sky-600">
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <CardTitle>Informations système</CardTitle>
                  <CardDescription>
                    Traçabilité et paramètres techniques du produit.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Date de création</p>
                <p className="mt-2 text-sm leading-6 text-foreground">{formatDate(product.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Dernière modification</p>
                <p className="mt-2 text-sm leading-6 text-foreground">{formatDate(product.updatedAt)}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Settings2 className="h-4 w-4 text-muted-foreground" />
                  Configuration
                </div>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <li>Unité: <span className="text-foreground">{product.unit}</span></li>
                  <li>Suivi du stock: <span className="text-foreground">{product.trackStock ? 'Activé' : 'Désactivé'}</span></li>
                  <li>Produit actif: <span className="text-foreground">{product.isActive ? 'Oui' : 'Non'}</span></li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                Vous pouvez revenir à la liste, modifier cette fiche produit ou supprimer le produit si nécessaire.
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                {actions}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
