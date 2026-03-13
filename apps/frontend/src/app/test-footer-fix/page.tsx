'use client'

import { MainLayout } from '@/components/layout/main-layout'
import { StockMonitorSettings } from '@/components/settings/StockMonitorSettings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, AlertTriangle, Info } from 'lucide-react'

export default function TestFooterFixPage() {
  return (
    <MainLayout 
      title="Test de Correction du Pied de Page" 
      subtitle="Vérification de la résolution du problème d'affichage"
    >
      <div className="space-y-6">
        {/* Statut de la correction */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Corrections Appliquées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Position du moniteur changée de 'bottom-right' à 'top-right'</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Z-index réduit de 50 à 30 pour éviter l'obstruction</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Taille du moniteur réduite pour être plus discret</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Option de masquage ajoutée via les préférences utilisateur</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Notifications repositionnées en haut à droite</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">CSS du mode sombre corrigé pour éviter les fonds sombres</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Composant StockDebugPanel repositionné</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contrôles du moniteur */}
        <Card>
          <CardHeader>
            <CardTitle>Contrôles du Moniteur de Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <StockMonitorSettings />
          </CardContent>
        </Card>

        {/* Zone de test d'affichage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              Zone de Test d'Affichage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Cette zone permet de vérifier que le contenu principal n'est plus obstrué par 
                la bande sombre du pied de page. Le moniteur de stock devrait maintenant être 
                positionné en haut à droite et être beaucoup moins intrusif.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Contenu Visible</h4>
                  <p className="text-sm text-blue-600">
                    Ce contenu devrait être entièrement visible sans obstruction.
                  </p>
                </div>
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">Navigation Libre</h4>
                  <p className="text-sm text-green-600">
                    La navigation principale ne devrait plus être gênée.
                  </p>
                </div>
                <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                  <h4 className="font-medium text-purple-800 mb-2">Interface Épurée</h4>
                  <p className="text-sm text-purple-600">
                    L'interface est maintenant plus épurée et professionnelle.
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800 mb-1">Instructions de Test</h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• Vérifiez que le moniteur de stock est maintenant en haut à droite</li>
                      <li>• Confirmez qu'aucune bande sombre n'obstrue le bas de l'écran</li>
                      <li>• Testez les contrôles de position et de masquage du moniteur</li>
                      <li>• Assurez-vous que le contenu principal est entièrement accessible</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contenu de remplissage pour tester le défilement */}
        <div className="space-y-4">
          {Array.from({ length: 5 }, (_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <h3 className="font-medium mb-2">Contenu de Test {i + 1}</h3>
                <p className="text-sm text-gray-600">
                  Ce contenu permet de tester que le défilement fonctionne correctement 
                  et que rien n'obstrue la visualisation des données en bas de page.
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod 
                  tempor incididunt ut labore et dolore magna aliqua.
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  )
}
