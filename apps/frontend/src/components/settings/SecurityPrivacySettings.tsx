'use client'

import { useState, useEffect } from 'react'
import { 
  Shield, 
  Smartphone,
  Monitor,
  Clock,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Info,
  Key,
  History,
  Wifi
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/stores/auth'

interface SecuritySettings {
  twoFactorEnabled: boolean
  activeSessions: Array<{
    id: string
    device: string
    location: string
    lastActive: string
    current: boolean
  }>
  loginHistory: Array<{
    id: string
    timestamp: string
    device: string
    location: string
    success: boolean
    ip: string
  }>
}

export function SecurityPrivacySettings() {
  const { user } = useAuth()
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    twoFactorEnabled: false,
    activeSessions: [
      {
        id: '1',
        device: 'Chrome sur Windows',
        location: 'Alger, Algérie',
        lastActive: new Date().toISOString(),
        current: true
      }
    ],
    loginHistory: [
      {
        id: '1',
        timestamp: new Date().toISOString(),
        device: 'Chrome sur Windows',
        location: 'Alger, Algérie',
        success: true,
        ip: '192.168.1.100'
      }
    ]
  })
  const [showSessions, setShowSessions] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const toggleTwoFactor = () => {
    // Pour l'instant, on simule juste le toggle
    // L'implémentation complète nécessitera une intégration backend
    setSecuritySettings(prev => ({
      ...prev,
      twoFactorEnabled: !prev.twoFactorEnabled
    }))
  }

  const terminateSession = (sessionId: string) => {
    setSecuritySettings(prev => ({
      ...prev,
      activeSessions: prev.activeSessions.filter(session => session.id !== sessionId)
    }))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Sécurité et Confidentialité
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Authentification à deux facteurs */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {securitySettings.twoFactorEnabled ? (
                  <Smartphone className="h-4 w-4 text-green-600" />
                ) : (
                  <Key className="h-4 w-4 text-gray-400" />
                )}
                <span className="font-medium">
                  Authentification à deux facteurs (2FA)
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Ajoutez une couche de sécurité supplémentaire à votre compte
              </p>
            </div>
            <Button
              onClick={toggleTwoFactor}
              variant={securitySettings.twoFactorEnabled ? "primary" : "outline"}
              size="sm"
            >
              {securitySettings.twoFactorEnabled ? "Activé" : "Désactivé"}
            </Button>
          </div>

          <div className={`p-3 rounded-lg border ${
            securitySettings.twoFactorEnabled 
              ? 'bg-green-50 border-green-200' 
              : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-start gap-2">
              {securitySettings.twoFactorEnabled ? (
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
              )}
              <div className="text-sm">
                {securitySettings.twoFactorEnabled ? (
                  <div>
                    <div className="font-medium text-green-800">
                      Authentification à deux facteurs activée
                    </div>
                    <div className="text-green-700">
                      Votre compte est protégé par une authentification renforcée
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="font-medium text-amber-800">
                      Fonctionnalité en développement
                    </div>
                    <div className="text-amber-700">
                      L'authentification à deux facteurs sera disponible dans une prochaine version
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sessions actives */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-blue-600" />
                <span className="font-medium">
                  Sessions actives ({securitySettings.activeSessions.length})
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Gérez les appareils connectés à votre compte
              </p>
            </div>
            <Button
              onClick={() => setShowSessions(!showSessions)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              {showSessions ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showSessions ? 'Masquer' : 'Afficher'}
            </Button>
          </div>

          {showSessions && (
            <div className="space-y-2">
              {securitySettings.activeSessions.map((session) => (
                <div key={session.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Monitor className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="font-medium text-sm">
                          {session.device}
                          {session.current && (
                            <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                              Session actuelle
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {session.location} • Dernière activité: {formatDate(session.lastActive)}
                        </div>
                      </div>
                    </div>
                    {!session.current && (
                      <Button
                        onClick={() => terminateSession(session.id)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        Terminer
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Historique des connexions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-purple-600" />
                <span className="font-medium">
                  Historique des connexions
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Consultez l'historique de vos connexions récentes
              </p>
            </div>
            <Button
              onClick={() => setShowHistory(!showHistory)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              {showHistory ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showHistory ? 'Masquer' : 'Afficher'}
            </Button>
          </div>

          {showHistory && (
            <div className="space-y-2">
              {securitySettings.loginHistory.slice(0, 5).map((login) => (
                <div key={login.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${
                        login.success ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <div className="font-medium text-sm">
                          {login.success ? 'Connexion réussie' : 'Tentative de connexion échouée'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(login.timestamp)} • {login.device} • {login.location}
                        </div>
                        <div className="text-xs text-gray-400">
                          IP: {login.ip}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Information de développement */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium text-blue-800">
                Fonctionnalités en développement
              </div>
              <div className="text-blue-700 mt-1">
                Les fonctionnalités de sécurité avancées sont en cours de développement. 
                Les données affichées sont des exemples pour démonstration.
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
