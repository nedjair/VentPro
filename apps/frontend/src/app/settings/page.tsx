'use client'

import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { NotificationSettings } from '@/components/settings/NotificationSettings'
import { UserInterfaceSettings } from '@/components/settings/UserInterfaceSettings'
import { SecurityPrivacySettings } from '@/components/settings/SecurityPrivacySettings'
import { UserManagementSettings } from '@/components/settings/UserManagementSettings'
import { KpiTargetsSettings } from '@/components/settings/KpiTargetsSettings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import {
  Settings,
  Bell,
  Palette,
  Shield,
  Info,
  UserCog,
  Building2,
  Upload,
  Trash2
} from 'lucide-react'

type CompanyProfileSettings = {
  companyName: string
  address: string
  city: string
  wilaya: string
  postalCode: string
  country: string
  phone: string
  fax: string
  email: string
  website: string
  nif: string
  rc: string
  ai: string
  logoUrl: string
  logoBase64: string
  accentColor: string
  vatExempt: boolean
  paymentTerms: string
  legalNotes: string
}

const emptyProfile: CompanyProfileSettings = {
  companyName: '',
  address: '',
  city: '',
  wilaya: '',
  postalCode: '',
  country: 'Algérie',
  phone: '',
  fax: '',
  email: '',
  website: '',
  nif: '',
  rc: '',
  ai: '',
  logoUrl: '',
  logoBase64: '',
  accentColor: '#2563EB',
  vatExempt: false,
  paymentTerms: '',
  legalNotes: '',
}

export default function SettingsPage() {
  const [companyProfile, setCompanyProfile] = useState<CompanyProfileSettings>(emptyProfile)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)

  const logoPreview = useMemo(() => companyProfile.logoBase64 || companyProfile.logoUrl, [companyProfile.logoBase64, companyProfile.logoUrl])

  const loadCompanyProfile = async () => {
    try {
      setProfileLoading(true)
      setProfileError(null)
      const response = await api.get('/api/v1/settings/company-profile')
      if (response.data?.success && response.data?.data) {
        setCompanyProfile((current) => ({ ...current, ...response.data.data }))
      }
    } catch (error: any) {
      setProfileError(error?.response?.data?.message || 'Erreur lors du chargement du profil société')
    } finally {
      setProfileLoading(false)
    }
  }

  useEffect(() => {
    loadCompanyProfile()
  }, [])

  const handleProfileChange = (key: keyof CompanyProfileSettings, value: string | boolean) => {
    setCompanyProfile((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const saveCompanyProfile = async () => {
    try {
      setProfileSaving(true)
      setProfileError(null)
      setProfileMessage(null)
      await api.put('/api/v1/settings/company-profile', companyProfile)
      setProfileMessage('Profil société enregistré avec succès')
    } catch (error: any) {
      setProfileError(error?.response?.data?.message || 'Erreur lors de l’enregistrement du profil société')
    } finally {
      setProfileSaving(false)
    }
  }

  const handleLogoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      setProfileError('Format logo non supporté. Utilisez PNG, JPG ou SVG.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      setCompanyProfile((current) => ({
        ...current,
        logoBase64: result,
        logoUrl: '',
      }))
    }
    reader.readAsDataURL(file)
  }

  const removeLogo = async () => {
    try {
      setProfileError(null)
      setProfileMessage(null)
      await api.delete('/api/v1/settings/company-profile/logo')
      setCompanyProfile((current) => ({
        ...current,
        logoBase64: '',
        logoUrl: '',
      }))
      setProfileMessage('Logo supprimé avec succès')
    } catch (error: any) {
      setProfileError(error?.response?.data?.message || 'Erreur lors de la suppression du logo')
    }
  }

  return (
    <MainLayout 
      title="Paramètres" 
      subtitle="Configuration de l'application"
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm text-blue-800">
                <div className="font-medium mb-2">
                  Notifications popup désactivées par défaut
                </div>
                <div className="text-blue-700">
                  Pour améliorer l'expérience utilisateur, les notifications popup ont été désactivées 
                  par défaut. Les alertes de stock restent visibles dans le tableau de bord et les pages 
                  de gestion des stocks. Vous pouvez les réactiver ci-dessous si nécessaire.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Profil société & facture
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {profileError && (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {profileError}
              </div>
            )}
            {profileMessage && (
              <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                {profileMessage}
              </div>
            )}

            {profileLoading ? (
              <div className="text-sm text-gray-600">Chargement du profil société...</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="space-y-1 text-sm">
                    <span className="font-medium">Raison sociale</span>
                    <input className="w-full rounded border px-3 py-2" value={companyProfile.companyName} onChange={(e) => handleProfileChange('companyName', e.target.value)} />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium">Adresse</span>
                    <input className="w-full rounded border px-3 py-2" value={companyProfile.address} onChange={(e) => handleProfileChange('address', e.target.value)} />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium">Ville</span>
                    <input className="w-full rounded border px-3 py-2" value={companyProfile.city} onChange={(e) => handleProfileChange('city', e.target.value)} />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium">Wilaya</span>
                    <input className="w-full rounded border px-3 py-2" value={companyProfile.wilaya} onChange={(e) => handleProfileChange('wilaya', e.target.value)} />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium">Code postal</span>
                    <input className="w-full rounded border px-3 py-2" value={companyProfile.postalCode} onChange={(e) => handleProfileChange('postalCode', e.target.value)} />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium">Pays</span>
                    <input className="w-full rounded border px-3 py-2" value={companyProfile.country} onChange={(e) => handleProfileChange('country', e.target.value)} />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium">Téléphone</span>
                    <input className="w-full rounded border px-3 py-2" value={companyProfile.phone} onChange={(e) => handleProfileChange('phone', e.target.value)} />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium">Fax</span>
                    <input className="w-full rounded border px-3 py-2" value={companyProfile.fax} onChange={(e) => handleProfileChange('fax', e.target.value)} />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium">Email</span>
                    <input className="w-full rounded border px-3 py-2" value={companyProfile.email} onChange={(e) => handleProfileChange('email', e.target.value)} />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium">Site web</span>
                    <input className="w-full rounded border px-3 py-2" value={companyProfile.website} onChange={(e) => handleProfileChange('website', e.target.value)} />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium">NIF</span>
                    <input className="w-full rounded border px-3 py-2" value={companyProfile.nif} onChange={(e) => handleProfileChange('nif', e.target.value)} />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium">RC</span>
                    <input className="w-full rounded border px-3 py-2" value={companyProfile.rc} onChange={(e) => handleProfileChange('rc', e.target.value)} />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium">Article d'imposition (AI)</span>
                    <input className="w-full rounded border px-3 py-2" value={companyProfile.ai} onChange={(e) => handleProfileChange('ai', e.target.value)} />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium">Couleur principale</span>
                    <input type="color" className="h-10 w-full rounded border px-2 py-1" value={companyProfile.accentColor || '#2563EB'} onChange={(e) => handleProfileChange('accentColor', e.target.value)} />
                  </label>
                </div>

                <label className="space-y-1 text-sm block">
                  <span className="font-medium">Conditions de paiement</span>
                  <input className="w-full rounded border px-3 py-2" value={companyProfile.paymentTerms} onChange={(e) => handleProfileChange('paymentTerms', e.target.value)} />
                </label>

                <label className="space-y-1 text-sm block">
                  <span className="font-medium">Mentions légales</span>
                  <textarea className="w-full rounded border px-3 py-2 min-h-[80px]" value={companyProfile.legalNotes} onChange={(e) => handleProfileChange('legalNotes', e.target.value)} />
                </label>

                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={companyProfile.vatExempt} onChange={(e) => handleProfileChange('vatExempt', e.target.checked)} />
                  <span>Non assujetti à la TVA</span>
                </label>

                <div className="space-y-2 rounded border p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Logo société</div>
                    <div className="flex gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded border px-3 py-1.5 text-sm">
                        <Upload className="h-4 w-4" />
                        Upload
                        <input type="file" accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml" className="hidden" onChange={handleLogoUpload} />
                      </label>
                      <Button type="button" variant="outline" size="sm" onClick={removeLogo}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Supprimer le logo
                      </Button>
                    </div>
                  </div>
                  <label className="space-y-1 text-sm block">
                    <span>URL du logo</span>
                    <input className="w-full rounded border px-3 py-2" value={companyProfile.logoUrl} onChange={(e) => handleProfileChange('logoUrl', e.target.value)} />
                  </label>
                  <div className="h-24 w-40 rounded border bg-gray-50 flex items-center justify-center overflow-hidden">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo société" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span className="text-xs italic text-gray-400">[Logo de la société]</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="button" onClick={saveCompanyProfile} disabled={profileSaving}>
                    {profileSaving ? 'Enregistrement...' : 'Enregistrer le profil société'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <KpiTargetsSettings />

        <NotificationSettings />

        <UserInterfaceSettings />

        <SecurityPrivacySettings />

        <UserManagementSettings />
      </div>
    </MainLayout>
  )
}
