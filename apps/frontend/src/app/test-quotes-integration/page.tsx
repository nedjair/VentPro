'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, ArrowRight, FileEdit, ShoppingCart, Trash2 } from 'lucide-react'
import Link from 'next/link'

export default function TestQuotesIntegrationPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          ✅ Intégration des Devis dans Commandes
        </h1>
        <p className="text-gray-600">
          Test de la suppression du menu "Devis" et intégration dans "Commandes & Devis"
        </p>
      </div>

      {/* Modifications appliquées */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            Modifications Appliquées
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-red-500" />
              <span className="text-sm">Élément "Devis" supprimé du menu principal</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">Menu renommé en "Commandes & Devis"</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">Onglets ajoutés pour séparer commandes et devis</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">Page de redirection créée pour /quotes</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">Paramètre URL ?tab=quotes supporté</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interface unifiée */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-blue-500" />
            Interface Unifiée Commandes & Devis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Nouvelles Fonctionnalités</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Onglets "Tout", "Commandes", "Devis"</li>
                <li>• Compteurs par type dans les onglets</li>
                <li>• Icônes distinctes (🛒 commandes, 📝 devis)</li>
                <li>• Badges colorés pour différencier les types</li>
                <li>• Boutons séparés "Nouvelle commande" / "Nouveau devis"</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Fonctionnalités Conservées</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Toutes les fonctionnalités de gestion des devis</li>
                <li>• Conversion devis → commande</li>
                <li>• Export PDF avec format algérien</li>
                <li>• Calcul TVA 19% automatique</li>
                <li>• Numérotation automatique</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tests de navigation */}
      <Card>
        <CardHeader>
          <CardTitle>Tests de Navigation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Testez les différents accès aux devis pour vérifier l'intégration :
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart className="h-4 w-4 text-blue-600" />
                  <h4 className="font-medium text-blue-800">Page Principale</h4>
                </div>
                <p className="text-sm text-blue-600 mb-3">
                  Interface unifiée avec onglets
                </p>
                <Link href="/orders">
                  <Button size="sm" className="w-full">
                    Commandes & Devis
                  </Button>
                </Link>
              </div>
              
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileEdit className="h-4 w-4 text-green-600" />
                  <h4 className="font-medium text-green-800">Onglet Devis</h4>
                </div>
                <p className="text-sm text-green-600 mb-3">
                  Accès direct aux devis
                </p>
                <Link href="/orders?tab=quotes">
                  <Button size="sm" variant="outline" className="w-full">
                    Voir les Devis
                  </Button>
                </Link>
              </div>
              
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowRight className="h-4 w-4 text-orange-600" />
                  <h4 className="font-medium text-orange-800">Redirection</h4>
                </div>
                <p className="text-sm text-orange-600 mb-3">
                  Ancienne URL avec redirection
                </p>
                <Link href="/quotes">
                  <Button size="sm" variant="outline" className="w-full">
                    /quotes (redirige)
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Avantages */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800">Avantages de cette Intégration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-blue-800">Interface Simplifiée</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Menu principal moins encombré</li>
                <li>• Navigation plus intuitive</li>
                <li>• Workflow unifié commandes/devis</li>
                <li>• Conversion facile devis → commande</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-blue-800">Fonctionnalités Améliorées</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Vue d'ensemble complète</li>
                <li>• Filtrage par type intégré</li>
                <li>• Recherche unifiée</li>
                <li>• Statistiques consolidées</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions de test */}
      <Card>
        <CardHeader>
          <CardTitle>Instructions de Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-700">
            <p><strong>1.</strong> Vérifiez que "Devis" n'apparaît plus dans le menu principal</p>
            <p><strong>2.</strong> Cliquez sur "Commandes & Devis" dans le menu</p>
            <p><strong>3.</strong> Testez les onglets "Tout", "Commandes", "Devis"</p>
            <p><strong>4.</strong> Vérifiez les compteurs dans chaque onglet</p>
            <p><strong>5.</strong> Testez la redirection depuis /quotes</p>
            <p><strong>6.</strong> Vérifiez l'accès direct avec ?tab=quotes</p>
            <p><strong>7.</strong> Testez les boutons "Nouvelle commande" et "Nouveau devis"</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
