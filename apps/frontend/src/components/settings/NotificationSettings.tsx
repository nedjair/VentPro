'use client'

import { useState, useEffect } from 'react'
import { 
  Bell, 
  BellOff, 
  Settings, 
  Info,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import UserPreferencesService, { UserPreferences } from '@/services/userPreferences'

export function NotificationSettings() {
  const [preferences, setPreferences] = useState<UserPreferences>(
    UserPreferencesService.getPreferences()
  )
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    const handlePreferencesChange = (event: any) => {
      setPreferences(event.detail)
      setHasChanges(false)
    }

    window.addEventListener('userPreferencesChanged', handlePreferencesChange)
    return () => window.removeEventListener('userPreferencesChanged', handlePreferencesChange)
  }, [])

  const toggleStockPopups = () => {
    const newEnabled = !preferences.stockNotifications.popupsEnabled
    UserPreferencesService.toggleStockPopups(newEnabled)
    setHasChanges(true)
    
    // Mettre à jour l'état local
    setPreferences(prev => ({
      ...prev,
      stockNotifications: {
        ...prev.stockNotifications,
        popupsEnabled: newEnabled,
        disabledByUser: !newEnabled
      }
    }))
  }

  const resetToDefaults = () => {
    UserPreferencesService.resetToDefaults()
    setPreferences(UserPreferencesService.getPreferences())
    setHasChanges(true)
  }

  const { stockNotifications } = preferences

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Paramètres des Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Notifications Popup */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {stockNotifications.popupsEnabled ? (
                  <Bell className="h-4 w-4 text-blue-600" />
                ) : (
                  <BellOff className="h-4 w-4 text-gray-400" />
                )}
                <span className="font-medium">
                  Notifications Popup de Stock
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Affiche des popups en bas à droite pour les alertes de stock
              </p>
            </div>
            <Button
              onClick={toggleStockPopups}
              variant={stockNotifications.popupsEnabled ? "default" : "outline"}
              size="sm"
            >
              {stockNotifications.popupsEnabled ? "Activé" : "Désactivé"}
            </Button>
          </div>

          {/* Statut actuel */}
          <div className={`p-3 rounded-lg border ${
            stockNotifications.popupsEnabled 
              ? 'bg-blue-50 border-blue-200' 
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-start gap-2">
              {stockNotifications.popupsEnabled ? (
                <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
              ) : (
                <Info className="h-4 w-4 text-gray-500 mt-0.5" />
              )}
              <div className="text-sm">
                {stockNotifications.popupsEnabled ? (
                  <div>
                    <div className="font-medium text-blue-800">
                      Notifications popup activées
                    </div>
                    <div className="text-blue-600">
                      Vous recevrez des popups pour les changements de stock
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="font-medium text-gray-700">
                      Notifications popup désactivées
                    </div>
                    <div className="text-gray-600">
                      Les alertes restent visibles dans l'interface principale
                      {stockNotifications.lastDisabledAt && (
                        <div className="text-xs mt-1">
                          Désactivées le {new Date(stockNotifications.lastDisabledAt).toLocaleString('fr-FR')}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Informations importantes */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium text-amber-800">
                Information importante
              </div>
              <div className="text-amber-700 mt-1">
                Les notifications popup ont été désactivées par défaut pour éviter les interruptions. 
                Les alertes de stock restent visibles dans le dashboard et les pages de gestion.
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            onClick={resetToDefaults}
            variant="outline"
            size="sm"
          >
            Réinitialiser
          </Button>
          
          {hasChanges && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              Paramètres sauvegardés
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
