'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { CategoryFormDisplay } from '@/components/ui/category-display'
import { toast } from '@/components/ui/toast'
import { api, Category, CategoryWriteInput, ProductWriteInput } from '@/lib/api'
import { ensureApiAuthentication } from '@/lib/auth-utils'
import { AlertTriangle, ArrowLeft, Boxes, Package, Plus, Save, Settings2 } from 'lucide-react'

interface ProductFormProps {
  mode: 'create' | 'edit'
  productId?: string
}

interface ProductFormData extends ProductWriteInput {
  supplierId: string
  categoryId: string
  stock: number
  maxStock: number | null
}

interface CategoryQuickCreateFormData extends CategoryWriteInput {}

const nativeSelectClass =
  'flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

export function ProductFormPage({ mode, productId }: ProductFormProps) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    sku: '',
    barcode: '',
    description: '',
    categoryId: '',
    supplierId: '',
    price: 0,
    costPrice: 0,
    stock: 0,
    minStock: 0,
    maxStock: null,
    unit: 'pièce',
    isActive: true,
    trackStock: true,
    allowBackorder: false
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingSuppliers, setLoadingSuppliers] = useState(false)
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [showCategoryQuickCreate, setShowCategoryQuickCreate] = useState(false)
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [categoryQuickCreateError, setCategoryQuickCreateError] = useState<string | null>(null)
  const [categoryQuickCreateForm, setCategoryQuickCreateForm] = useState<CategoryQuickCreateFormData>({
    name: '',
    description: '',
  })
  const [suppliersError, setSuppliersError] = useState<string | null>(null)
  const [categoriesError, setCategoriesError] = useState<string | null>(null)

  useEffect(() => {
    loadSuppliers()
    loadCategories()
    if (mode === 'edit' && productId) {
      loadProduct()
    }
  }, [mode, productId])

  const loadSuppliers = async () => {
    try {
      setLoadingSuppliers(true)
      setSuppliersError(null)
      const isAuthenticated = await ensureAuthentication()
      if (!isAuthenticated) {
        console.warn('⚠️ [ProductForm] Authentification échouée')
        setSuppliersError('Erreur d\'authentification. Veuillez vous reconnecter.')
        return
      }
      const response = await api.getSuppliers({
        isActive: true,
        limit: 100
      })

      const payload = response.data as any

      if (payload?.success && payload?.data) {
        // Gérer les différents formats de réponse possibles
        let suppliersData: any[] = []

        if (Array.isArray(payload.data)) {
          // Format direct: { success: true, data: [...] }
          suppliersData = payload.data
        } else if (payload.data?.data?.data && Array.isArray(payload.data.data.data)) {
          // Format paginé avec double data: { success: true, data: { data: { data: [...] } } }
          suppliersData = payload.data.data.data
        } else if (payload.data?.data && Array.isArray(payload.data.data)) {
          // Format paginé: { success: true, data: { data: [...], total: X } }
          suppliersData = payload.data.data
        } else if (payload.data?.suppliers && Array.isArray(payload.data.suppliers)) {
          // Format alternatif: { success: true, data: { suppliers: [...] } }
          suppliersData = payload.data.suppliers
        } else {
          console.warn('⚠️ [ProductForm] Format de réponse inattendu:', payload)
          suppliersData = []
        }

        const safeSuppliers = Array.isArray(suppliersData) ? suppliersData : []
        setSuppliers(safeSuppliers)
        setSuppliersError(null)

        if (safeSuppliers.length === 0) {
          setSuppliersError('Aucun fournisseur actif trouvé. Créez d\'abord des fournisseurs dans la section "Fournisseurs".')
        }
      } else {
        console.error('❌ [ProductForm] Réponse API en échec:', response)
        setSuppliers([])
        setSuppliersError(response.message || 'Erreur lors du chargement des fournisseurs')
      }
    } catch (error: any) {
      console.error('❌ [ProductForm] Erreur lors du chargement des fournisseurs:', {
        message: error.message,
        name: error.name,
        stack: error.stack?.split('\n').slice(0, 3)
      })

      setSuppliers([])

      let errorMessage = 'Erreur lors du chargement des fournisseurs'
      if (error.name === 'AbortError') {
        errorMessage = 'Timeout lors du chargement des fournisseurs'
      } else if (error.message?.includes('fetch')) {
        errorMessage = 'Erreur de connexion au serveur'
      } else if (error.message?.includes('401')) {
        errorMessage = 'Erreur d\'authentification'
      } else if (error.message?.includes('404')) {
        errorMessage = 'Service fournisseurs non disponible'
      }

      setSuppliersError(errorMessage)
    } finally {
      setLoadingSuppliers(false)
    }
  }

  const sortCategoriesByName = (items: Category[]) => {
    return [...items].sort((left, right) => left.name.localeCompare(right.name, 'fr', { sensitivity: 'base' }))
  }

  const resetQuickCreateCategoryForm = () => {
    setCategoryQuickCreateForm({ name: '', description: '' })
    setCategoryQuickCreateError(null)
  }

  const loadCategories = async (): Promise<Category[]> => {
    try {
      setLoadingCategories(true)
      setCategoriesError(null)

      const isAuthenticated = await ensureAuthentication()
      if (!isAuthenticated) {
        setCategoriesError('Erreur d\'authentification. Veuillez vous reconnecter.')
        return []
      }

      const response = await api.getCategories()

      if (response.success && response.data) {
        const categoriesData = Array.isArray(response.data)
          ? response.data
          : Array.isArray((response.data as any)?.data)
            ? (response.data as any).data
            : []

        const sortedCategories = sortCategoriesByName(categoriesData)
        setCategories(sortedCategories)
        if (categoriesData.length === 0) {
          setCategoriesError('Aucune catégorie disponible. Vous pouvez laisser le produit non catégorisé.')
        }
        return sortedCategories
      } else {
        setCategories([])
        setCategoriesError(response.message || 'Erreur lors du chargement des catégories')
        return []
      }
    } catch (error: any) {
      console.error('❌ [ProductForm] Erreur lors du chargement des catégories:', error)
      setCategories([])
      setCategoriesError(error?.message || 'Erreur lors du chargement des catégories')
      return []
    } finally {
      setLoadingCategories(false)
    }
  }

  const ensureAuthentication = (): Promise<boolean> => ensureApiAuthentication()

  const handleSaveButtonClick = () => {
    // Le bouton de l'en-tête est rendu hors du <form>.
    // requestSubmit() relance la validation native puis le onSubmit React.
    formRef.current?.requestSubmit()
  }

  const loadProduct = async () => {
    if (!productId) return

    try {
      setLoading(true)
      
      // S'assurer que l'utilisateur est authentifié
      const isAuthenticated = await ensureAuthentication()
      if (!isAuthenticated) {
        setError('Erreur d\'authentification. Impossible de charger le produit.')
        return
      }

      const response = await api.getProduct(productId)
      
      if (response.success && response.data) {
        const product = response.data
        const resolvedCategoryId = product.categoryId
          || (typeof product.category === 'object' ? (product.category as any)?.id || '' : '')

        setFormData({
          name: product.name || '',
          sku: product.sku || product.reference || '',
          barcode: product.barcode || '',
          description: product.description || '',
          categoryId: resolvedCategoryId,
          supplierId: product.supplierId || '',
          price: product.price || 0,
          costPrice: product.costPrice || 0,
          stock: product.stock || product.stockQuantity || 0,
          minStock: product.minStock || 0,
          maxStock: product.maxStock ?? null,
          unit: product.unit || 'pièce',
          isActive: product.isActive !== false,
          trackStock: product.trackStock !== false,
          allowBackorder: product.allowBackorder === true
        })
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

  const validateForm = () => {
    if (!formData.name.trim()) {
      return 'Le nom du produit est obligatoire'
    }

    // Validation de la référence produit (SKU)
    if (formData.sku && formData.sku.trim()) {
      if (formData.sku.length < 2) {
        return 'La référence produit doit contenir au moins 2 caractères'
      }
      if (formData.sku.length > 50) {
        return 'La référence produit ne peut pas dépasser 50 caractères'
      }
      // Vérifier que la référence ne contient que des caractères alphanumériques et des tirets/underscores
      if (!/^[a-zA-Z0-9_-]+$/.test(formData.sku)) {
        return 'La référence produit ne peut contenir que des lettres, chiffres, tirets et underscores'
      }
    }

    // Validation du code-barres (numérique uniquement)
    if (formData.barcode && formData.barcode.trim()) {
      if (formData.barcode.length < 8) {
        return 'Le code-barres doit contenir au moins 8 chiffres'
      }
      if (formData.barcode.length > 20) {
        return 'Le code-barres ne peut pas dépasser 20 chiffres'
      }
      // Vérifier que le code-barres ne contient que des chiffres (format standardisé)
      if (!/^\d+$/.test(formData.barcode)) {
        return 'Le code-barres ne peut contenir que des chiffres (format EAN-13, UPC, etc.)'
      }
      // Validation des formats courants
      const length = formData.barcode.length
      if (![8, 12, 13, 14].includes(length)) {
        return 'Le code-barres doit avoir 8, 12, 13 ou 14 chiffres (formats standards)'
      }
    }

    if (formData.price < 0) {
      return 'Le prix doit être positif'
    }

    if (Number(formData.costPrice || 0) < 0) {
      return 'Le prix d\'achat doit être positif'
    }

    if (Number(formData.stock || 0) < 0) {
      return 'Le stock doit être positif'
    }

    if (Number(formData.minStock || 0) < 0) {
      return 'Le stock minimum doit être positif'
    }

    if (formData.maxStock !== null && Number(formData.maxStock || 0) < 0) {
      return 'Le stock maximum doit être positif'
    }

    if (formData.maxStock !== null && Number(formData.maxStock || 0) < Number(formData.minStock || 0)) {
      return 'Le stock maximum doit être supérieur ou égal au stock minimum'
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }
    
    try {
      setSaving(true)
      setError(null)
      
      // S'assurer que l'utilisateur est authentifié
      const isAuthenticated = await ensureAuthentication()
      if (!isAuthenticated) {
        setError('Erreur d\'authentification. Veuillez vous connecter.')
        return
      }
      const payload: ProductWriteInput = {
        ...formData,
        categoryId: formData.categoryId || undefined,
        maxStock: formData.maxStock ?? undefined,
      }
      
      if (mode === 'create') {
        const response = await api.createProduct(payload)
      } else if (productId) {
        const response = await api.updateProduct(productId, payload)
      }
      
      // Redirection vers la liste des produits
      router.push('/products')
      
    } catch (err) {
      console.error(`❌ Erreur lors de la ${mode === 'create' ? 'création' : 'modification'}:`, err)
      
      // Messages d'erreur plus spécifiques
      let errorMessage = 'Erreur lors de la sauvegarde'
      if (err instanceof Error) {
        if (err.message.includes('401')) {
          errorMessage = 'Erreur d\'authentification. Veuillez vous reconnecter.'
        } else if (err.message.includes('400')) {
          // On préserve le message métier renvoyé par le backend quand il est
          // disponible (ex: SKU déjà existant) au lieu d'afficher un message
          // générique peu utile pour le diagnostic utilisateur.
          const backendMessage = err.message.replace(/^HTTP 400:\s*/, '').trim()
          errorMessage = backendMessage && backendMessage !== err.message
            ? backendMessage
            : 'Données invalides. Vérifiez les champs obligatoires.'
        } else if (err.message.includes('409')) {
          errorMessage = 'Un produit avec cette référence existe déjà.'
        } else if (err.message.includes('500')) {
          errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.'
        } else {
          errorMessage = err.message
        }
      }
      
      setError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    router.push('/products')
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleQuickCreateCategory = async () => {
    const trimmedName = categoryQuickCreateForm.name.trim()
    if (!trimmedName) {
      setCategoryQuickCreateError('Le nom de la catégorie est requis.')
      return
    }

    try {
      setCreatingCategory(true)
      setCategoryQuickCreateError(null)

      const isAuthenticated = await ensureAuthentication()
      if (!isAuthenticated) {
        setCategoryQuickCreateError('Erreur d\'authentification. Veuillez vous reconnecter.')
        return
      }

      const response = await api.createCategory({
        name: trimmedName,
        description: categoryQuickCreateForm.description?.trim() || undefined,
      })

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Erreur lors de la création de la catégorie')
      }

      const createdCategory = response.data
      const refreshedCategories = await loadCategories()
      const selectedCategory = refreshedCategories.find((category) => category.id === createdCategory.id) || createdCategory

      setCategories((currentCategories) => {
        const categoryMap = new Map(currentCategories.map((category) => [category.id, category]))
        categoryMap.set(selectedCategory.id, selectedCategory)
        return sortCategoriesByName(Array.from(categoryMap.values()))
      })
      handleInputChange('categoryId', selectedCategory.id)
      setShowCategoryQuickCreate(false)
      resetQuickCreateCategoryForm()
      setCategoriesError(null)
      toast.success(`Catégorie « ${selectedCategory.name} » créée et sélectionnée.`)
    } catch (error: any) {
      const message = error?.message || 'Erreur lors de la création de la catégorie'
      setCategoryQuickCreateError(message)
      toast.error(message)
    } finally {
      setCreatingCategory(false)
    }
  }

  const actions = mode === 'create'
    ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <Button type="button" onClick={handleSaveButtonClick} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Sauvegarde...' : 'Créer le produit'}
          </Button>
        </div>
      )
    : undefined

  if (loading) {
    return (
      <MainLayout title="Chargement..." actions={actions}>
        <Card className="mx-auto max-w-3xl">
          <CardContent className="flex items-center justify-center gap-3 py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            <span className="text-sm text-muted-foreground">Chargement du produit...</span>
          </CardContent>
        </Card>
      </MainLayout>
    )
  }

  return (
    <MainLayout
      title={mode === 'create' ? 'Nouveau produit' : 'Modifier le produit'}
      subtitle={mode === 'edit' ? formData.name || 'Mettre à jour le produit' : 'Créer un nouveau produit'}
      actions={actions}
    >
      <div className="mx-auto max-w-5xl space-y-6">
        {error && (
          <Card className="border-red-200 bg-red-50/80 shadow-none">
            <CardContent className="flex items-start gap-3 p-5">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-red-500" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-red-700">Erreur</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="rounded-2xl bg-primary/10 p-2 text-primary">
                      <Package className="h-5 w-5" />
                    </div>
                    <CardTitle>Informations générales</CardTitle>
                  </div>
                  <CardDescription>
                    Renseignez l’identification du produit et les informations visibles dans le catalogue.
                  </CardDescription>
                </div>
                <Badge variant="outline">{mode === 'create' ? 'Création' : 'Modification'}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="name">Nom du produit *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Ex: Ordinateur portable Dell"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sku">Référence produit (SKU)</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => handleInputChange('sku', e.target.value)}
                    placeholder="Ex: PROD-LAPTOP-HP"
                  />
                  <p className="text-xs text-muted-foreground">
                    Lettres, chiffres, tirets et underscores autorisés.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="barcode">Code-barres</Label>
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    onChange={(e) => handleInputChange('barcode', e.target.value)}
                    inputMode="numeric"
                    placeholder="Ex: 3760123456789"
                  />
                  <p className="text-xs text-muted-foreground">
                    Formats standards pris en charge : 8, 12, 13 ou 14 chiffres.
                  </p>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Description détaillée du produit..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex min-h-10 flex-wrap items-center gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Label htmlFor="categoryId">Catégorie</Label>
                      {loadingCategories ? (
                        <Badge variant="outline">Chargement...</Badge>
                      ) : categories.length > 0 ? (
                        <Badge variant="secondary">{categories.length} disponible{categories.length > 1 ? 's' : ''}</Badge>
                      ) : (
                        <Badge variant="outline">Optionnel</Badge>
                      )}
                      <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label={showCategoryQuickCreate ? 'Masquer la création de catégorie' : 'Créer une catégorie'}
                      aria-expanded={showCategoryQuickCreate}
                      title={showCategoryQuickCreate ? 'Masquer la création de catégorie' : 'Créer une catégorie'}
                      className="h-8 w-8 rounded-full px-0 text-base font-semibold leading-none"
                      onClick={() => {
                        setShowCategoryQuickCreate((current) => !current)
                        if (showCategoryQuickCreate) {
                          resetQuickCreateCategoryForm()
                        }
                      }}
                    >
                      +
                    </Button>
                    </div>
                  </div>
                  <select
                    id="categoryId"
                    value={formData.categoryId}
                    onChange={(e) => handleInputChange('categoryId', e.target.value)}
                    disabled={loadingCategories}
                    className={nativeSelectClass}
                  >
                    <option value="">
                      {loadingCategories
                        ? 'Chargement des catégories...'
                        : categories.length === 0
                          ? 'Aucune catégorie disponible'
                          : 'Sélectionner une catégorie'}
                    </option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {formData.categoryId ? (
                    <CategoryFormDisplay
                      category={categories.find((category) => category.id === formData.categoryId) || {
                        id: formData.categoryId,
                        name: 'Catégorie sélectionnée',
                      }}
                    />
                  ) : null}
                  {showCategoryQuickCreate ? (
                    <Card className="border border-dashed border-primary/25 bg-primary/5 shadow-none">
                      <CardContent className="space-y-4 p-4">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">Créer une catégorie sans quitter le produit</p>
                          <p className="text-xs text-muted-foreground">
                            La nouvelle catégorie sera enregistrée, ajoutée à la liste puis pré-sélectionnée automatiquement.
                          </p>
                        </div>

                        <div className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2 md:col-span-1">
                              <Label htmlFor="quickCategoryName">Nom de la catégorie *</Label>
                              <Input
                                id="quickCategoryName"
                                value={categoryQuickCreateForm.name}
                                onChange={(event) => setCategoryQuickCreateForm((current) => ({
                                  ...current,
                                  name: event.target.value,
                                }))}
                                placeholder="Ex. Accessoires réseau"
                                maxLength={120}
                                required
                              />
                            </div>

                            <div className="space-y-2 md:col-span-1">
                              <Label htmlFor="quickCategoryDescription">Description</Label>
                              <Textarea
                                id="quickCategoryDescription"
                                value={categoryQuickCreateForm.description}
                                onChange={(event) => setCategoryQuickCreateForm((current) => ({
                                  ...current,
                                  description: event.target.value,
                                }))}
                                placeholder="Optionnel : précisez l'usage de cette catégorie"
                                className="min-h-[88px]"
                              />
                            </div>
                          </div>

                          {categoryQuickCreateError ? (
                            <p className="text-sm text-red-600">{categoryQuickCreateError}</p>
                          ) : null}

                          <div className="flex flex-wrap justify-end gap-3">
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => {
                                setShowCategoryQuickCreate(false)
                                resetQuickCreateCategoryForm()
                              }}
                              disabled={creatingCategory}
                            >
                              Annuler
                            </Button>
                            <Button type="button" loading={creatingCategory} disabled={creatingCategory} onClick={handleQuickCreateCategory}>
                              <Plus className="h-4 w-4" />
                              Créer la catégorie
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : null}
                  {categoriesError ? (
                    <p className="text-xs text-red-600">{categoriesError}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      La catégorie sélectionnée sera persistée et réaffichée sur les écrans Voir et Modifier.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex min-h-10 flex-wrap items-center gap-2">
                    <Label htmlFor="supplierId">Fournisseur</Label>
                    {loadingSuppliers ? (
                      <Badge variant="outline">Chargement...</Badge>
                    ) : suppliers.length > 0 ? (
                      <Badge variant="secondary">{suppliers.length} disponible{suppliers.length > 1 ? 's' : ''}</Badge>
                    ) : (
                      <Badge variant="outline">Optionnel</Badge>
                    )}
                  </div>
                  <select
                    id="supplierId"
                    value={formData.supplierId}
                    onChange={(e) => handleInputChange('supplierId', e.target.value)}
                    disabled={loadingSuppliers}
                    className={nativeSelectClass}
                  >
                    <option value="">
                      {loadingSuppliers
                        ? 'Chargement des fournisseurs...'
                        : suppliers.length === 0
                          ? 'Aucun fournisseur disponible'
                          : 'Sélectionner un fournisseur'}
                    </option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                        {supplier.isPreferred ? ' ⭐' : ''}
                      </option>
                    ))}
                  </select>
                  {suppliersError ? (
                    <p className="text-xs text-red-600">{suppliersError}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Association facultative au fournisseur principal du produit.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="rounded-2xl bg-emerald-500/10 p-2 text-emerald-600">
                  <Boxes className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Prix et coûts</CardTitle>
                  <CardDescription>
                    Définissez le prix de vente, le coût d’achat et les données de stock initiales.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="price">Prix de vente (DZD) *</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="costPrice">Prix d'achat (DZD)</Label>
                  <Input
                    id="costPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.costPrice}
                    onChange={(e) => handleInputChange('costPrice', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock actuel</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => handleInputChange('stock', parseInt(e.target.value, 10) || 0)}
                    disabled={!formData.trackStock}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minStock">Stock minimum</Label>
                  <Input
                    id="minStock"
                    type="number"
                    min="0"
                    value={formData.minStock}
                    onChange={(e) => handleInputChange('minStock', parseInt(e.target.value, 10) || 0)}
                    disabled={!formData.trackStock}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxStock">Stock maximum</Label>
                  <Input
                    id="maxStock"
                    type="number"
                    min="0"
                    value={formData.maxStock ?? ''}
                    onChange={(e) => handleInputChange('maxStock', e.target.value === '' ? null : parseInt(e.target.value, 10) || 0)}
                    disabled={!formData.trackStock}
                    placeholder="Optionnel"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="rounded-2xl bg-amber-500/10 p-2 text-amber-600">
                  <Settings2 className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Configuration</CardTitle>
                  <CardDescription>
                    Ajustez les options de stock et le comportement du produit dans les autres modules.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="unit">Unité</Label>
                  <select
                    id="unit"
                    value={formData.unit}
                    onChange={(e) => handleInputChange('unit', e.target.value)}
                    className={nativeSelectClass}
                  >
                    <option value="pièce">Pièce</option>
                    <option value="kg">Kilogramme</option>
                    <option value="g">Gramme</option>
                    <option value="l">Litre</option>
                    <option value="ml">Millilitre</option>
                    <option value="m">Mètre</option>
                    <option value="cm">Centimètre</option>
                    <option value="m²">Mètre carré</option>
                    <option value="m³">Mètre cube</option>
                    <option value="lot">Lot</option>
                    <option value="boîte">Boîte</option>
                    <option value="carton">Carton</option>
                    <option value="palette">Palette</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/30 p-4">
                  <input
                    type="checkbox"
                    id="trackStock"
                    checked={formData.trackStock}
                    onChange={(e) => handleInputChange('trackStock', e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-primary"
                  />
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-foreground">Suivre le stock de ce produit</span>
                    <p className="text-xs leading-5 text-muted-foreground">
                      Active la gestion de quantité et le suivi des niveaux de stock.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/30 p-4">
                  <input
                    type="checkbox"
                    id="allowBackorder"
                    checked={formData.allowBackorder}
                    onChange={(e) => handleInputChange('allowBackorder', e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-primary"
                  />
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-foreground">Autoriser les commandes en rupture</span>
                    <p className="text-xs leading-5 text-muted-foreground">
                      Permet de commander le produit même si le stock disponible est insuffisant.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/30 p-4 md:col-span-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-primary"
                  />
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-foreground">Produit actif</span>
                    <p className="text-xs leading-5 text-muted-foreground">
                      Le produit reste disponible dans les commandes, factures et listes de sélection.
                    </p>
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap justify-end gap-3 pb-2">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={saving}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Sauvegarde...' : mode === 'create' ? 'Créer le produit' : 'Enregistrer les modifications'}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  )
}
