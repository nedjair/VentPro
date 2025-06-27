'use client'

import { MainLayout } from '@/components/layout/main-layout'
import { NotificationSettings } from '@/components/settings/NotificationSettings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Settings, 
  Bell, 
  Palette, 
  Shield,
  Info
} from 'lucide-react'

export default function SettingsPage() {
  return (
    <MainLayout 
      title="Paramètres" 
      subtitle="Configuration de l'application"
    >
      <div className="space-y-6">
        {/* Information générale */}
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
                  par défaut. Les alertes de stock restent visibles dans le dashboard et les pages 
                  de gestion des stocks. Vous pouvez les réactiver ci-dessous si nécessaire.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Paramètres des notifications */}
        <NotificationSettings />

        {/* Autres paramètres (pour extension future) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Interface Utilisateur
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600">
              <p>Paramètres d'interface à venir...</p>
              <ul className="mt-2 space-y-1 text-xs">
                <li>• Mode sombre/clair</li>
                <li>• Affichage compact</li>
                <li>• Langue de l'interface</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Sécurité et Confidentialité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600">
              <p>Paramètres de sécurité à venir...</p>
              <ul className="mt-2 space-y-1 text-xs">
                <li>• Authentification à deux facteurs</li>
                <li>• Sessions actives</li>
                <li>• Historique des connexions</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
