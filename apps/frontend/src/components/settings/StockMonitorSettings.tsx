'use client'

import { useState, useEffect } from 'react'
import { Monitor, Eye, EyeOff, Settings } from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import UserPreferencesService from '@/services/userPreferences'

export function StockMonitorSettings() {
  const [isEnabled, setIsEnabled] = useState(true)
  const [position, setPosition] = useState<'top-right' | 'bottom-right' | 'top-left' | 'bottom-left'>('top-right')
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    setIsEnabled(UserPreferencesService.isStockMonitorEnabled())
    setPosition(UserPreferencesService.getStockMonitorPosition())
  }, [])

  const toggleMonitor = () => {
    const newState = !isEnabled
    setIsEnabled(newState)
    UserPreferencesService.toggleStockMonitor(newState)
  }

  const changePosition = (newPosition: typeof position) => {
    setPosition(newPosition)
    UserPreferencesService.setStockMonitorPosition(newPosition)
  }

  const positions = [
    { value: 'top-right', label: 'Haut droite' },
    { value: 'top-left', label: 'Haut gauche' },
    { value: 'bottom-right', label: 'Bas droite' },
    { value: 'bottom-left', label: 'Bas gauche' }
  ] as const

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Monitor className="h-5 w-5 text-gray-600" />
          <h3 className="font-medium text-gray-900">Moniteur de Stock</h3>
          <Badge variant={isEnabled ? "default" : "secondary"}>
            {isEnabled ? 'Activé' : 'Désactivé'}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Affichage du moniteur</span>
          <Button
            variant={isEnabled ? "default" : "outline"}
            size="sm"
            onClick={toggleMonitor}
            className="flex items-center gap-2"
          >
            {isEnabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {isEnabled ? 'Masquer' : 'Afficher'}
          </Button>
        </div>

        {isExpanded && isEnabled && (
          <div className="border-t pt-3">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Position du moniteur
            </label>
            <div className="grid grid-cols-2 gap-2">
              {positions.map((pos) => (
                <Button
                  key={pos.value}
                  variant={position === pos.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => changePosition(pos.value)}
                  className="text-xs"
                >
                  {pos.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {!isEnabled && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            Le moniteur de stock permet de suivre en temps réel les alertes et synchronisations.
            Il est maintenant masqué pour une interface plus épurée.
          </p>
        </div>
      )}
    </div>
  )
}
