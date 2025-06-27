'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { api, Product } from '@/lib/api'
import { ArrowLeft, Save, Package } from 'lucide-react'

interface ProductFormProps {
  mode: 'create' | 'edit'
  productId?: string
}

export function ProductFormPage({ mode, productId }: ProductFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    reference: '',
    description: '',
    category: '',
    supplierId: '',
    price: 0,
    costPrice: 0,
    stock: 0,
    minStock: 0,
    unit: 'pièce',
    isActive: true,
    trackStock: true,
    allowBackorder: false
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loadingSuppliers, setLoadingSuppliers] = useState(false)
  const [suppliersError, setSuppliersError] = useState<string | null>(null)

  useEffect(() => {
    console.log('🚀 [ProductForm] Initialisation du composant...')
    loadSuppliers()
    if (mode === 'edit' && productId) {
      loadProduct()
    }
  }, [mode, productId])

  // Fonction pour tester la connectivité du backend
  const testBackendConnectivity = async (): Promise<boolean> => {
    try {
      console.log('🔗 [ProductForm] Test de connectivité backend...')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000) // 5 secondes timeout
      })

      const isConnected = response.ok
      console.log(`${isConnected ? '✅' : '❌'} [ProductForm] Backend ${isConnected ? 'accessible' : 'inaccessible'}`)
      return isConnected
    } catch (error) {
      console.error('❌ [ProductForm] Erreur de connectivité backend:', error)
      return false
    }
  }

  const loadSuppliers = async () => {
    try {
      setLoadingSuppliers(true)
      setSuppliersError(null)
      console.log('🔍 [ProductForm] Début du chargement des fournisseurs...')

      // Vérifier l'authentification d'abord
      console.log('🔐 [ProductForm] Vérification de l\'authentification...')
      const isAuthenticated = await ensureAuthentication()
      if (!isAuthenticated) {
        console.warn('⚠️ [ProductForm] Authentification échouée')
        setSuppliersError('Erreur d\'authentification. Veuillez vous reconnecter.')
        return
      }

      // Appel API avec authentification
      console.log('📡 [ProductForm] Appel API getSuppliers avec authentification...')
      const response = await api.getSuppliers({
        isActive: true,
        limit: 100
      })

      console.log('📥 [ProductForm] Réponse API reçue:', response)

      if (response.success && response.data) {
        // Gérer les différents formats de réponse possibles
        let suppliersData

        if (Array.isArray(response.data)) {
          // Format direct: { success: true, data: [...] }
          suppliersData = response.data
          console.log('📋 [ProductForm] Format de réponse: tableau direct')
        } else if (response.data.data && Array.isArray(response.data.data)) {
          // Format paginé: { success: true, data: { data: [...], total: X } }
          suppliersData = response.data.data
          console.log('📋 [ProductForm] Format de réponse: paginé avec data.data')
        } else if (response.data.suppliers && Array.isArray(response.data.suppliers)) {
          // Format alternatif: { success: true, data: { suppliers: [...] } }
          suppliersData = response.data.suppliers
          console.log('📋 [ProductForm] Format de réponse: avec propriété suppliers')
        } else {
          console.warn('⚠️ [ProductForm] Format de réponse inattendu:', response.data)
          suppliersData = []
        }

        const safeSuppliers = Array.isArray(suppliersData) ? suppliersData : []

        console.log(`✅ [ProductForm] ${safeSuppliers.length} fournisseurs chargés avec authentification`)
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

  // Fonction d'authentification automatique
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

  const loadProduct = async () => {
    if (!productId) return

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
        const product = response.data
        setFormData({
          name: product.name || '',
          reference: product.reference || '',
          description: product.description || '',
          category: typeof product.category === 'object' ? (product.category as any)?.name || '' : product.category || '',
          supplierId: product.supplierId || '',
          price: product.price || 0,
          costPrice: product.costPrice || 0,
          stock: product.stock || 0,
          minStock: product.minStock || 0,
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
    
    if (formData.price < 0) {
      return 'Le prix doit être positif'
    }
    
    if (formData.costPrice < 0) {
      return 'Le prix d\'achat doit être positif'
    }
    
    if (formData.stock < 0) {
      return 'Le stock doit être positif'
    }
    
    if (formData.minStock < 0) {
      return 'Le stock minimum doit être positif'
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
      
      console.log(`💾 ${mode === 'create' ? 'Création' : 'Modification'} du produit...`)
      
      if (mode === 'create') {
        const response = await api.createProduct(formData)
        console.log('✅ Produit créé avec succès:', response)
      } else if (productId) {
        const response = await api.updateProduct(productId, formData)
        console.log('✅ Produit modifié avec succès:', response)
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
          errorMessage = 'Données invalides. Vérifiez les champs obligatoires.'
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

  const actions = (
    <div className="flex space-x-2">
      <Button variant="outline" onClick={handleCancel} disabled={saving}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Retour
      </Button>
      <Button onClick={handleSubmit} disabled={saving}>
        <Save className="h-4 w-4 mr-2" />
        {saving ? 'Sauvegarde...' : 'Sauvegarder'}
      </Button>
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

  return (
    <MainLayout 
      title={mode === 'create' ? 'Nouveau produit' : 'Modifier le produit'}
      subtitle={mode === 'edit' ? formData.name : 'Créer un nouveau produit'}
      actions={actions}
    >
      <div className="max-w-4xl mx-auto">
        {/* Message d'erreur */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Erreur</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card">
            <div className="card-header">
              <div className="flex items-center">
                <Package className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Informations générales</h3>
              </div>
            </div>
            <div className="card-content space-y-4">
              {/* Nom du produit */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du produit <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Ordinateur portable Dell"
                  required
                />
              </div>

              {/* Référence */}
              <div>
                <label htmlFor="reference" className="block text-sm font-medium text-gray-700 mb-2">
                  Référence
                </label>
                <input
                  type="text"
                  id="reference"
                  value={formData.reference}
                  onChange={(e) => handleInputChange('reference', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: DELL-LAT-5520"
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Description détaillée du produit..."
                />
              </div>

              {/* Catégorie */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                  Catégorie
                </label>
                <input
                  type="text"
                  id="category"
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Informatique, Mobilier, Consommables..."
                />
              </div>

              {/* Fournisseur */}
              <div>
                <label htmlFor="supplierId" className="block text-sm font-medium text-gray-700 mb-2">
                  Fournisseur
                  {loadingSuppliers && (
                    <span className="ml-2 text-xs text-blue-600">
                      <span className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></span>
                      Chargement...
                    </span>
                  )}
                  {!loadingSuppliers && suppliers.length > 0 && (
                    <span className="ml-2 text-xs text-green-600">
                      ({suppliers.length} fournisseur{suppliers.length > 1 ? 's' : ''} disponible{suppliers.length > 1 ? 's' : ''})
                    </span>
                  )}
                  {!loadingSuppliers && suppliers.length === 0 && !suppliersError && (
                    <span className="ml-2 text-xs text-orange-600">
                      (Aucun fournisseur disponible)
                    </span>
                  )}
                </label>

                <select
                  id="supplierId"
                  value={formData.supplierId}
                  onChange={(e) => handleInputChange('supplierId', e.target.value)}
                  disabled={loadingSuppliers}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    loadingSuppliers ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                >
                  <option value="">
                    {loadingSuppliers
                      ? 'Chargement des fournisseurs...'
                      : suppliers.length === 0
                        ? 'Aucun fournisseur disponible'
                        : 'Sélectionner un fournisseur'
                    }
                  </option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                      {supplier.isPreferred && ' ⭐'}
                    </option>
                  ))}
                </select>

                {/* Messages d'erreur et d'aide */}
                {suppliersError && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    <div className="flex items-center">
                      <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {suppliersError}
                    </div>
                    <button
                      type="button"
                      onClick={loadSuppliers}
                      className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                    >
                      Réessayer le chargement
                    </button>
                  </div>
                )}

                {!loadingSuppliers && !suppliersError && suppliers.length === 0 && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                    <div className="flex items-center">
                      <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      💡 Astuce : Créez d'abord des fournisseurs dans la section "Fournisseurs" pour pouvoir les associer à vos produits.
                    </div>
                    <a
                      href="/suppliers/new"
                      className="mt-2 inline-block text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Créer un nouveau fournisseur
                    </a>
                  </div>
                )}


              </div>
            </div>
          </div>

          {/* Prix et coûts */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Prix et coûts</h3>
            </div>
            <div className="card-content">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Prix de vente */}
                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                    Prix de vente (DZD) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="price"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                    required
                  />
                </div>

                {/* Prix d'achat */}
                <div>
                  <label htmlFor="costPrice" className="block text-sm font-medium text-gray-700 mb-2">
                    Prix d'achat (DZD)
                  </label>
                  <input
                    type="number"
                    id="costPrice"
                    value={formData.costPrice}
                    onChange={(e) => handleInputChange('costPrice', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Stock et unités */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Gestion du stock</h3>
            </div>
            <div className="card-content space-y-4">
              {/* Suivi du stock */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="trackStock"
                  checked={formData.trackStock}
                  onChange={(e) => handleInputChange('trackStock', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="trackStock" className="ml-2 block text-sm text-gray-900">
                  Suivre le stock de ce produit
                </label>
              </div>

              {formData.trackStock && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Stock actuel */}
                  <div>
                    <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-2">
                      Stock actuel
                    </label>
                    <input
                      type="number"
                      id="stock"
                      value={formData.stock}
                      onChange={(e) => handleInputChange('stock', parseInt(e.target.value) || 0)}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>

                  {/* Stock minimum */}
                  <div>
                    <label htmlFor="minStock" className="block text-sm font-medium text-gray-700 mb-2">
                      Stock minimum
                    </label>
                    <input
                      type="number"
                      id="minStock"
                      value={formData.minStock}
                      onChange={(e) => handleInputChange('minStock', parseInt(e.target.value) || 0)}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>

                  {/* Unité */}
                  <div>
                    <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-2">
                      Unité
                    </label>
                    <select
                      id="unit"
                      value={formData.unit}
                      onChange={(e) => handleInputChange('unit', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              )}

              {/* Autoriser les commandes en rupture */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="allowBackorder"
                  checked={formData.allowBackorder}
                  onChange={(e) => handleInputChange('allowBackorder', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="allowBackorder" className="ml-2 block text-sm text-gray-900">
                  Autoriser les commandes même en rupture de stock
                </label>
              </div>
            </div>
          </div>

          {/* Configuration */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Configuration</h3>
            </div>
            <div className="card-content">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                  Produit actif (visible dans les commandes et factures)
                </label>
              </div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex justify-end space-x-4 pt-6">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={saving}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Sauvegarde...' : (mode === 'create' ? 'Créer le produit' : 'Sauvegarder les modifications')}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  )
}
