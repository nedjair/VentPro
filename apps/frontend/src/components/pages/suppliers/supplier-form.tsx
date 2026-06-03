'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Save, Building2, User, Star } from 'lucide-react'
import { api, Supplier } from '@/lib/api'
import { DEFAULT_BUSINESS_COUNTRY, SUPPLIER_COUNTRY_OPTIONS } from '@/lib/countries'
import { safeTextRender } from '@/lib/defensive-utils'

interface SupplierFormPageProps {
  mode: 'create' | 'edit'
  supplierId?: string
}

interface SupplierFormData {
  type: 'COMPANY' | 'INDIVIDUAL'
  name: string
  contactName: string
  email: string
  phone: string
  mobile: string
  website: string
  fax: string
  address: string
  postalCode: string
  city: string
  country: string
  siret: string
  vatNumber: string
  rcs: string
  paymentTerms: number
  discount: number
  currency: string
  rating: number
  isActive: boolean
  isPreferred: boolean
  notes: string
  tags: string[]
}

export function SupplierFormPage({ mode, supplierId }: SupplierFormPageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<SupplierFormData>({
    type: 'COMPANY',
    name: '',
    contactName: '',
    email: '',
    phone: '',
    mobile: '',
    website: '',
    fax: '',
    address: '',
    postalCode: '',
    city: '',
    country: DEFAULT_BUSINESS_COUNTRY,
    siret: '',
    vatNumber: '',
    rcs: '',
    paymentTerms: 30,
    discount: 0,
    currency: 'DZD',
    rating: 0,
    isActive: true,
    isPreferred: false,
    notes: '',
    tags: []
  })

  const [tagsInput, setTagsInput] = useState('')

  // Charger les données du fournisseur en mode édition
  useEffect(() => {
    if (mode === 'edit' && supplierId) {
      loadSupplier()
    }
  }, [mode, supplierId])

  const loadSupplier = async () => {
    if (!supplierId) return

    try {
      setLoading(true)
      setError(null)

      const response = await api.getSupplier(supplierId)

      if (response.success && response.data) {
        const supplier = response.data

        // Mise à jour défensive des données du formulaire
        setFormData(prevData => ({
          type: supplier.type || prevData.type,
          name: supplier.name || prevData.name,
          contactName: supplier.contactName || prevData.contactName,
          email: supplier.email || prevData.email,
          phone: supplier.phone || prevData.phone,
          mobile: supplier.mobile || prevData.mobile,
          website: supplier.website || prevData.website,
          fax: supplier.fax || prevData.fax,
          address: supplier.address || prevData.address,
          postalCode: supplier.postalCode || prevData.postalCode,
          city: supplier.city || prevData.city,
          country: supplier.country || prevData.country,
          siret: supplier.siret || prevData.siret,
          vatNumber: supplier.vatNumber || prevData.vatNumber,
          rcs: supplier.rcs || prevData.rcs,
          paymentTerms: supplier.paymentTerms !== undefined ? supplier.paymentTerms : prevData.paymentTerms,
          discount: supplier.discount !== undefined ? supplier.discount : prevData.discount,
          currency: supplier.currency || prevData.currency,
          rating: supplier.rating !== undefined ? supplier.rating : prevData.rating,
          isActive: supplier.isActive !== undefined ? supplier.isActive : prevData.isActive,
          isPreferred: supplier.isPreferred !== undefined ? supplier.isPreferred : prevData.isPreferred,
          notes: supplier.notes || prevData.notes,
          tags: Array.isArray(supplier.tags) ? supplier.tags : prevData.tags
        }))

        setTagsInput(Array.isArray(supplier.tags) ? supplier.tags.join(', ') : '')
      } else {
        throw new Error('Fournisseur non trouvé')
      }
    } catch (err: any) {
      console.error('❌ Erreur lors du chargement du fournisseur:', err)
      setError(err.message || 'Erreur lors du chargement du fournisseur')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof SupplierFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleTagsChange = (value: string) => {
    setTagsInput(value)
    const tags = value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
    handleInputChange('tags', tags)
  }

  const handleCancel = () => {
    router.push('/suppliers')
  }

  const validateForm = (): string | null => {
    if (!formData.name.trim()) {
      return 'Le nom du fournisseur est requis'
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return 'L\'adresse email n\'est pas valide'
    }

    // Validation plus stricte pour le site web (format URI complet)
    if (formData.website && formData.website.trim()) {
      const websiteUrl = formData.website.trim()
      try {
        new URL(websiteUrl)
        if (!websiteUrl.startsWith('http://') && !websiteUrl.startsWith('https://')) {
          return 'L\'URL du site web doit commencer par http:// ou https://'
        }
      } catch {
        return 'L\'URL du site web n\'est pas valide'
      }
    }

    if (formData.paymentTerms < 0) {
      return 'Le délai de paiement ne peut pas être négatif'
    }

    if (formData.discount < 0 || formData.discount > 100) {
      return 'La remise doit être comprise entre 0 et 100%'
    }

    if (formData.rating < 0 || formData.rating > 5) {
      return 'La note doit être comprise entre 0 et 5'
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

      // Préparer les données en excluant les champs vides qui ne respectent pas les formats requis
      const submitData: any = {
        ...formData,
        paymentTerms: Number(formData.paymentTerms),
        discount: Number(formData.discount),
        rating: Number(formData.rating)
      }

      // Exclure les champs vides qui ont des contraintes de format
      if (!submitData.email || !submitData.email.trim()) {
        delete submitData.email
      }
      if (!submitData.website || !submitData.website.trim()) {
        delete submitData.website
      }
      if (!submitData.phone || !submitData.phone.trim()) {
        delete submitData.phone
      }
      if (!submitData.mobile || !submitData.mobile.trim()) {
        delete submitData.mobile
      }
      if (!submitData.fax || !submitData.fax.trim()) {
        delete submitData.fax
      }
      if (!submitData.contactName || !submitData.contactName.trim()) {
        delete submitData.contactName
      }
      if (!submitData.address || !submitData.address.trim()) {
        delete submitData.address
      }
      if (!submitData.postalCode || !submitData.postalCode.trim()) {
        delete submitData.postalCode
      }
      if (!submitData.city || !submitData.city.trim()) {
        delete submitData.city
      }
      if (!submitData.siret || !submitData.siret.trim()) {
        delete submitData.siret
      }
      if (!submitData.vatNumber || !submitData.vatNumber.trim()) {
        delete submitData.vatNumber
      }
      if (!submitData.rcs || !submitData.rcs.trim()) {
        delete submitData.rcs
      }

      let response
      if (mode === 'create') {
        response = await api.createSupplier(submitData)
      } else {
        response = await api.updateSupplier(supplierId!, submitData)
      }

      if (response.success) {

        // Redirection avec paramètre de rafraîchissement pour forcer le reload de la liste
        const timestamp = Date.now()
        router.push(`/suppliers?refresh=${timestamp}`)
      } else {
        console.error('❌ Erreur de sauvegarde:', response.message)
        setError(response.message || 'Erreur lors de la sauvegarde')
      }
    } catch (err: any) {
      console.error('❌ Erreur lors de la sauvegarde:', err)

      let errorMessage = 'Erreur lors de la sauvegarde du fournisseur'

      // Gestion spécifique des erreurs HTTP
      if (err.message.includes('401')) {
        errorMessage = 'Erreur d\'authentification. Veuillez vous reconnecter.'
      } else if (err.message.includes('404')) {
        errorMessage = 'Fournisseur non trouvé.'
      } else if (err.message.includes('409')) {
        // Extraire le message d'erreur détaillé du backend
        try {
          const response = JSON.parse(err.message.split('Response: ')[1] || '{}')
          errorMessage = response.message || 'Un fournisseur avec ces informations existe déjà.'
        } catch {
          errorMessage = 'Un fournisseur avec cet email existe déjà. Veuillez utiliser un autre email.'
        }
      } else if (err.message.includes('400')) {
        errorMessage = 'Données invalides. Veuillez vérifier les champs requis.'
      } else {
        errorMessage = err.message || errorMessage
      }

      setError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const title = mode === 'create' ? 'Nouveau fournisseur' : 'Modifier le fournisseur'
  const subtitle = mode === 'create' 
    ? 'Créer un nouveau fournisseur dans la base de données' 
    : 'Modifier les informations du fournisseur'

  if (loading) {
    return (
      <MainLayout title={title} subtitle="Chargement...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout title={title} subtitle={subtitle}>
      <div className="max-w-4xl mx-auto">
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

        <form id="supplier-form" onSubmit={handleSubmit} className="space-y-8">
          {/* Informations générales */}
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center mb-6">
              <Building2 className="h-5 w-5 text-muted-foreground mr-2" />
              <h2 className="text-lg font-semibold text-card-foreground">Informations générales</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Type de fournisseur */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Type de fournisseur *
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="type"
                      value="COMPANY"
                      checked={formData.type === 'COMPANY'}
                      onChange={(e) => handleInputChange('type', e.target.value)}
                      className="mr-2"
                    />
                    <Building2 className="h-4 w-4 mr-1" />
                    Entreprise
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="type"
                      value="INDIVIDUAL"
                      checked={formData.type === 'INDIVIDUAL'}
                      onChange={(e) => handleInputChange('type', e.target.value)}
                      className="mr-2"
                    />
                    <User className="h-4 w-4 mr-1" />
                    Particulier
                  </label>
                </div>
              </div>

              {/* Nom */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  {formData.type === 'COMPANY' ? 'Nom de l\'entreprise' : 'Nom complet'} *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-card text-card-foreground"
                  placeholder={formData.type === 'COMPANY' ? 'Ex: TechCorp Solutions' : 'Ex: Jean Dupont'}
                  required
                />
              </div>

              {/* Contact principal */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Contact principal
                </label>
                <input
                  type="text"
                  value={formData.contactName}
                  onChange={(e) => handleInputChange('contactName', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-card text-card-foreground"
                  placeholder="Nom du contact principal"
                />
              </div>
            </div>
          </div>

          {/* Informations de contact */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-lg font-semibold text-card-foreground mb-6">Informations de contact</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-card text-card-foreground"
                  placeholder="contact@exemple.com"
                />
              </div>

              {/* Téléphone */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-card text-card-foreground"
                  placeholder="01 23 45 67 89"
                />
              </div>

              {/* Mobile */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Mobile
                </label>
                <input
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => handleInputChange('mobile', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-card text-card-foreground"
                  placeholder="06 12 34 56 78"
                />
              </div>

              {/* Fax */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Fax
                </label>
                <input
                  type="tel"
                  value={formData.fax}
                  onChange={(e) => handleInputChange('fax', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-card text-card-foreground"
                  placeholder="01 23 45 67 90"
                />
              </div>

              {/* Site web */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Site web
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-card text-card-foreground"
                  placeholder="https://www.exemple.com"
                />
              </div>
            </div>
          </div>

          {/* Adresse */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-lg font-semibold text-card-foreground mb-6">Adresse</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Adresse */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Adresse
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-card text-card-foreground"
                  placeholder="123 Rue de la République"
                />
              </div>

              {/* Code postal */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Code postal
                </label>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => handleInputChange('postalCode', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-card text-card-foreground"
                  placeholder="75001"
                />
              </div>

              {/* Ville */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Ville
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-card text-card-foreground"
                  placeholder="Paris"
                />
              </div>

              {/* Pays */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Pays
                </label>
                <select
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-card text-card-foreground"
                >
                  {SUPPLIER_COUNTRY_OPTIONS.map((countryOption) => (
                    <option key={countryOption} value={countryOption}>{countryOption}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Informations professionnelles */}
          {formData.type === 'COMPANY' && (
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-lg font-semibold text-card-foreground mb-6">Informations professionnelles</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* SIRET */}
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    SIRET
                  </label>
                  <input
                    type="text"
                    value={formData.siret}
                    onChange={(e) => handleInputChange('siret', e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-card text-card-foreground"
                    placeholder="12345678901234"
                  />
                </div>

                {/* Numéro TVA */}
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Numéro de TVA
                  </label>
                  <input
                    type="text"
                    value={formData.vatNumber}
                    onChange={(e) => handleInputChange('vatNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-card text-card-foreground"
                    placeholder="FR12345678901"
                  />
                </div>

                {/* RCS */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    RCS (Registre du Commerce et des Sociétés)
                  </label>
                  <input
                    type="text"
                    value={formData.rcs}
                    onChange={(e) => handleInputChange('rcs', e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-card text-card-foreground"
                    placeholder="RCS Paris B 123 456 789"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Paramètres commerciaux */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-lg font-semibold text-card-foreground mb-6">Paramètres commerciaux</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Délai de paiement */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Délai de paiement (jours)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.paymentTerms}
                  onChange={(e) => handleInputChange('paymentTerms', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-card text-card-foreground"
                />
              </div>

              {/* Remise négociée */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Remise négociée (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.discount}
                  onChange={(e) => handleInputChange('discount', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-card text-card-foreground"
                />
              </div>

              {/* Devise */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Devise
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-card text-card-foreground"
                >
                  <option value="DA">DA (Dinar Algérien)</option>
                  <option value="EUR">EUR (Euro)</option>
                  <option value="USD">USD (Dollar américain)</option>
                  <option value="GBP">GBP (Livre sterling)</option>
                  <option value="CHF">CHF (Franc suisse)</option>
                  <option value="CAD">CAD (Dollar canadien)</option>
                </select>
              </div>

              {/* Note du fournisseur */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Note du fournisseur (0-5)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={formData.rating}
                    onChange={(e) => handleInputChange('rating', parseInt(e.target.value) || 0)}
                    className="w-20 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-card text-card-foreground"
                  />
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 cursor-pointer ${
                          i < formData.rating
                            ? 'text-yellow-400 fill-current'
                            : 'text-muted-foreground'
                        }`}
                        onClick={() => handleInputChange('rating', i + 1)}
                      />
                    ))}
                  </div>
                </div>
              </div>


            </div>
          </div>

          {/* Statut et préférences */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-lg font-semibold text-card-foreground mb-6">Statut et préférences</h2>

            <div className="space-y-4">
              {/* Statut actif */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-card-foreground">
                  Fournisseur actif
                </label>
              </div>

              {/* Fournisseur préféré */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPreferred"
                  checked={formData.isPreferred}
                  onChange={(e) => handleInputChange('isPreferred', e.target.checked)}
                  className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
                />
                <label htmlFor="isPreferred" className="ml-2 block text-sm text-card-foreground flex items-center">
                  <Star className="h-4 w-4 mr-1 text-yellow-500" />
                  Fournisseur préféré
                </label>
              </div>
            </div>
          </div>

          {/* Tags et notes */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-lg font-semibold text-card-foreground mb-6">Tags et notes</h2>

            <div className="space-y-6">
              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Tags (séparés par des virgules)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => handleTagsChange(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-card text-card-foreground"
                  placeholder="informatique, matériel, préféré"
                />
                {formData.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-card text-card-foreground"
                  placeholder="Notes internes sur le fournisseur..."
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={saving}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Sauvegarde...' : mode === 'create' ? 'Créer le fournisseur' : 'Enregistrer les modifications'}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  )
}
