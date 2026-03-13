'use client'

import { useState, useEffect } from 'react'
import {
  Palette,
  Monitor,
  Sun,
  Moon,
  Laptop,
  Maximize2,
  Minimize2,
  Globe,
  CheckCircle,
  Info
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/contexts/ThemeContext'
import UserPreferencesService, { UserPreferences } from '@/services/userPreferences'

export function UserInterfaceSettings() {
  const { theme, setTheme } = useTheme()
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

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'auto') => {
    // Utiliser le contexte de thème pour un changement instantané
    setTheme(newTheme)

    // Mettre à jour l'état local pour l'affichage
    const newPreferences = {
      ...preferences,
      ui: {
        ...preferences.ui,
        theme: newTheme
      }
    }
    setPreferences(newPreferences)
    setHasChanges(true)
  }

  const toggleCompactMode = () => {
    const newCompactMode = !preferences.ui.compactMode
    const newPreferences = {
      ...preferences,
      ui: {
        ...preferences.ui,
        compactMode: newCompactMode
      }
    }
    UserPreferencesService.savePreferences(newPreferences)
    setPreferences(newPreferences)
    setHasChanges(true)
  }

  const setLanguage = (language: 'fr' | 'ar') => {
    // Pour l'instant, on stocke juste la préférence
    // L'implémentation complète de l'i18n sera ajoutée plus tard
    const newPreferences = {
      ...preferences,
      ui: {
        ...preferences.ui,
        language
      }
    }
    UserPreferencesService.savePreferences(newPreferences)
    setPreferences(newPreferences)
    setHasChanges(true)
  }

  const { ui } = preferences

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Interface Utilisateur
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Mode sombre/clair */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-gray-600" />
              <span className="font-medium">Mode d'affichage</span>
            </div>
            <p className="text-sm text-gray-600">
              Choisissez le thème d'affichage de l'application
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={() => handleThemeChange('light')}
              variant={theme === 'light' ? "primary" : "outline"}
              size="sm"
              className="flex items-center gap-2"
            >
              <Sun className="h-4 w-4" />
              Clair
            </Button>
            <Button
              onClick={() => handleThemeChange('dark')}
              variant={theme === 'dark' ? "primary" : "outline"}
              size="sm"
              className="flex items-center gap-2"
            >
              <Moon className="h-4 w-4" />
              Sombre
            </Button>
            <Button
              onClick={() => handleThemeChange('auto')}
              variant={theme === 'auto' ? "primary" : "outline"}
              size="sm"
              className="flex items-center gap-2"
            >
              <Laptop className="h-4 w-4" />
              Auto
            </Button>
          </div>

          <div className="p-3 rounded-lg border border-border bg-muted">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="text-sm">
                <div className="font-medium text-card-foreground">
                  Mode {theme === 'light' ? 'clair' : theme === 'dark' ? 'sombre' : 'automatique'} activé
                </div>
                <div className="text-muted-foreground">
                  {theme === 'auto'
                    ? 'Le thème s\'adapte automatiquement aux préférences de votre système'
                    : `Interface en mode ${theme === 'light' ? 'clair' : 'sombre'}`
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Affichage compact */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {ui.compactMode ? (
                  <Minimize2 className="h-4 w-4 text-blue-600" />
                ) : (
                  <Maximize2 className="h-4 w-4 text-gray-400" />
                )}
                <span className="font-medium">
                  Affichage compact
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Réduit l'espacement et la taille des éléments pour afficher plus d'informations
              </p>
            </div>
            <Button
              onClick={toggleCompactMode}
              variant={ui.compactMode ? "primary" : "outline"}
              size="sm"
            >
              {ui.compactMode ? "Activé" : "Désactivé"}
            </Button>
          </div>

          <div className={`p-3 rounded-lg border ${
            ui.compactMode 
              ? 'bg-blue-50 border-blue-200' 
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-start gap-2">
              {ui.compactMode ? (
                <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
              ) : (
                <Info className="h-4 w-4 text-gray-500 mt-0.5" />
              )}
              <div className="text-sm">
                <div className="font-medium">
                  {ui.compactMode ? 'Mode compact activé' : 'Mode normal activé'}
                </div>
                <div className="opacity-80">
                  {ui.compactMode 
                    ? 'Interface optimisée pour afficher plus d\'informations'
                    : 'Interface avec espacement standard pour plus de confort'
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Langue de l'interface */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-gray-600" />
              <span className="font-medium">Langue de l'interface</span>
            </div>
            <p className="text-sm text-gray-600">
              Sélectionnez la langue d'affichage de l'application
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={() => setLanguage('fr')}
              variant={(ui as any).language === 'ar' ? "outline" : "primary"}
              size="sm"
              className="flex items-center gap-2"
            >
              🇫🇷 Français
            </Button>
            <Button
              onClick={() => setLanguage('ar')}
              variant={(ui as any).language === 'ar' ? "primary" : "outline"}
              size="sm"
              className="flex items-center gap-2"
            >
              🇩🇿 العربية
            </Button>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium text-amber-800">
                  Fonctionnalité en développement
                </div>
                <div className="text-amber-700 mt-1">
                  La traduction en arabe sera disponible dans une prochaine version. 
                  Pour l'instant, l'interface reste en français.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Indicateur de changements */}
        {hasChanges && (
          <div className="flex items-center gap-2 text-sm text-green-600 pt-4 border-t">
            <CheckCircle className="h-4 w-4" />
            Paramètres sauvegardés automatiquement
          </div>
        )}
      </CardContent>
    </Card>
  )
}
