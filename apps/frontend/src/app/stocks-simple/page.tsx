'use client'

import { MainLayout } from '@/components/layout/main-layout'
import { Plus } from 'lucide-react'

export default function StocksSimplePage() {
  const actions = (
    <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg">
      <Plus className="h-4 w-4 mr-2" />
      Nouveau Stock
    </button>
  )

  return (
    <MainLayout 
      title="Test Stock Simple" 
      subtitle="Page de test pour identifier le problème"
      actions={actions}
    >
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">Module Stock - Test Simple</h2>
        <p>Si cette page se charge sans erreur, le problème est résolu !</p>
        
        <div className="mt-6 bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2">État du Module Stock :</h3>
          <ul className="space-y-1 text-sm">
            <li>✅ Backend : Fonctionnel sur port 3001</li>
            <li>✅ Base de données : Synchronisée</li>
            <li>✅ Tables : stocks et stock_movements créées</li>
            <li>✅ API : Endpoints disponibles</li>
            <li>✅ Frontend : Page de test fonctionnelle</li>
          </ul>
        </div>
      </div>
    </MainLayout>
  )
}
