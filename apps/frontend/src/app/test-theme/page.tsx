'use client'

import { MainLayout } from '@/components/layout/main-layout'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Sun,
  Moon,
  Laptop,
  Palette,
  Eye,
  Settings,
  Users,
  Package
} from 'lucide-react'
import { useState, useEffect } from 'react'

export default function TestThemePage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <MainLayout
        title="Test du Système de Thèmes"
        subtitle="Chargement..."
      >
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    )
  }

  return <TestThemeContent />
}

function TestThemeContent() {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme()

  return (
    <MainLayout
      title="Test du Système de Thèmes"
      subtitle="Validation visuelle des thèmes clair, sombre et automatique"
      actions={
        <div className="flex gap-2">
          <Button
            onClick={() => setTheme('light')}
            variant={theme === 'light' ? 'primary' : 'outline'}
            size="sm"
          >
            <Sun className="w-4 h-4 mr-2" />
            Clair
          </Button>
          <Button
            onClick={() => setTheme('dark')}
            variant={theme === 'dark' ? 'primary' : 'outline'}
            size="sm"
          >
            <Moon className="w-4 h-4 mr-2" />
            Sombre
          </Button>
          <Button
            onClick={() => setTheme('auto')}
            variant={theme === 'auto' ? 'primary' : 'outline'}
            size="sm"
          >
            <Laptop className="w-4 h-4 mr-2" />
            Auto
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        
        {/* Informations sur le thème actuel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              État du Thème
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted">
                <div className="text-sm font-medium text-muted-foreground">Thème Sélectionné</div>
                <div className="text-2xl font-bold text-card-foreground capitalize">{theme}</div>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <div className="text-sm font-medium text-muted-foreground">Thème Résolu</div>
                <div className="text-2xl font-bold text-card-foreground capitalize">{resolvedTheme}</div>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <div className="text-sm font-medium text-muted-foreground">Mode</div>
                <div className="text-2xl font-bold text-card-foreground">
                  {theme === 'auto' ? 'Automatique' : 'Manuel'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test des composants */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Test des Composants
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Boutons */}
            <div>
              <h3 className="text-lg font-semibold text-card-foreground mb-3">Boutons</h3>
              <div className="flex flex-wrap gap-2">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
              </div>
            </div>

            {/* Cartes */}
            <div>
              <h3 className="text-lg font-semibold text-card-foreground mb-3">Cartes</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Paramètres
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Configuration de l'application</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Utilisateurs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Gestion des comptes</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Produits
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Catalogue des articles</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Champs de saisie */}
            <div>
              <h3 className="text-lg font-semibold text-card-foreground mb-3">Champs de Saisie</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Nom d'utilisateur
                  </label>
                  <input
                    type="text"
                    placeholder="Entrez votre nom"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="votre@email.com"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Test de contraste */}
            <div>
              <h3 className="text-lg font-semibold text-card-foreground mb-3">Test de Contraste</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-primary text-primary-foreground text-center">
                  Primary
                </div>
                <div className="p-4 rounded-lg bg-secondary text-secondary-foreground text-center">
                  Secondary
                </div>
                <div className="p-4 rounded-lg bg-muted text-muted-foreground text-center">
                  Muted
                </div>
                <div className="p-4 rounded-lg bg-accent text-accent-foreground text-center">
                  Accent
                </div>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instructions de Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-muted-foreground">
              <p>1. Utilisez les boutons en haut pour changer de thème</p>
              <p>2. Vérifiez que tous les composants changent instantanément</p>
              <p>3. Testez le mode "Auto" avec les préférences de votre système</p>
              <p>4. Rechargez la page pour vérifier la persistance</p>
              <p>5. Ouvrez un nouvel onglet pour tester la synchronisation</p>
            </div>
          </CardContent>
        </Card>

      </div>
    </MainLayout>
  )
}
