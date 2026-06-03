'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sun, Moon, Laptop, Package, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react'

export default function TestDarkModePage() {
  const [mounted, setMounted] = useState(false)
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <MainLayout title="Test du Dark Mode" subtitle="Validation du système de thèmes">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout title="Test du Dark Mode" subtitle="Validation du système de thèmes">
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Test du Dark Mode</h1>
            <p className="text-muted-foreground mt-1">
              Validation du système de thèmes pour la page de gestion des stocks
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setTheme('light')}
              variant={theme === 'light' ? 'primary' : 'outline'}
              size="sm"
            >
              <Sun className="h-4 w-4 mr-2" />
              Clair
            </Button>
            <Button
              onClick={() => setTheme('dark')}
              variant={theme === 'dark' ? 'primary' : 'outline'}
              size="sm"
            >
              <Moon className="h-4 w-4 mr-2" />
              Sombre
            </Button>
            <Button
              onClick={() => setTheme('auto')}
              variant={theme === 'auto' ? 'primary' : 'outline'}
              size="sm"
            >
              <Laptop className="h-4 w-4 mr-2" />
              Auto
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="h-5 w-5 mr-2 text-primary" />
                Total Produits
              </CardTitle>
              <CardDescription>Nombre total de produits en stock</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-card-foreground">156</div>
              <p className="text-xs text-muted-foreground">+12% par rapport au mois dernier</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-accent-foreground" />
                Stock Faible
              </CardTitle>
              <CardDescription>Produits nécessitant un réapprovisionnement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-card-foreground">23</div>
              <p className="text-xs text-muted-foreground">Attention requise</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-primary" />
                Rupture
              </CardTitle>
              <CardDescription>Produits en rupture de stock</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">8</div>
              <p className="text-xs text-muted-foreground">Action immédiate requise</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Statuts de Stock</CardTitle>
            <CardDescription>Exemples de badges de statut avec les nouveaux tokens de thème</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-primary/10 text-primary">Stock Normal</Badge>
              <Badge className="bg-accent text-accent-foreground">Stock Faible</Badge>
              <Badge className="bg-destructive/10 text-destructive">Rupture</Badge>
              <Badge className="bg-secondary text-card-foreground">Surstock</Badge>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Informations du thème actuel :</div>
              <div className="text-sm text-card-foreground">
                <strong>Thème sélectionné :</strong> {theme}
              </div>
              <div className="text-sm text-card-foreground">
                <strong>Thème résolu :</strong> {resolvedTheme}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test des Éléments d'Interface</CardTitle>
            <CardDescription>Vérification de l'adaptation des composants au dark mode</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Champ de recherche</label>
                <input
                  type="text"
                  placeholder="Rechercher un produit..."
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-card text-card-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Sélection</label>
                <select className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-card text-card-foreground">
                  <option>Tous les statuts</option>
                  <option>Stock normal</option>
                  <option>Stock faible</option>
                  <option>Rupture</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="primary">Bouton Principal</Button>
              <Button variant="outline">Bouton Secondaire</Button>
              <Button variant="danger">Bouton Destructeur</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
