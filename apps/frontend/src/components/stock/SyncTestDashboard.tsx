'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { 
  Play, 
  Pause, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  Activity,
  Clock,
  Target,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { stockSyncTester, SyncTestResult } from '@/utils/stockSyncTester'

export function SyncTestDashboard() {
  const [isAutoTesting, setIsAutoTesting] = useState(false)
  const [testHistory, setTestHistory] = useState<SyncTestResult[]>([])
  const [currentTest, setCurrentTest] = useState<SyncTestResult | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [isRunningTest, setIsRunningTest] = useState(false)

  // Rafraîchir les données
  const refreshData = () => {
    setTestHistory(stockSyncTester.getTestHistory())
    setStats(stockSyncTester.getTestStats())
  }

  // Exécuter un test manuel
  const runManualTest = async () => {
    setIsRunningTest(true)
    try {
      const result = await stockSyncTester.runSyncTest()
      setCurrentTest(result)
      refreshData()
    } finally {
      setIsRunningTest(false)
    }
  }

  // Démarrer/arrêter les tests automatiques
  const toggleAutoTesting = () => {
    if (isAutoTesting) {
      stockSyncTester.stopAutoTesting()
      setIsAutoTesting(false)
    } else {
      stockSyncTester.startAutoTesting(30000) // Toutes les 30 secondes
      setIsAutoTesting(true)
    }
  }

  // Rafraîchir les données périodiquement
  useEffect(() => {
    refreshData()
    const interval = setInterval(refreshData, 5000)
    return () => clearInterval(interval)
  }, [])

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 90) return 'default'
    if (score >= 70) return 'secondary'
    return 'destructive'
  }

  return (
    <div className="space-y-6">
      {/* Contrôles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Tests de Synchronisation
            </span>
            <div className="flex gap-2">
              <Button
                variant={isAutoTesting ? "destructive" : "default"}
                onClick={toggleAutoTesting}
              >
                {isAutoTesting ? (
                  <>
                    <Pause className="h-4 w-4 mr-1" />
                    Arrêter Auto
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-1" />
                    Démarrer Auto
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={runManualTest}
                disabled={isRunningTest}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isRunningTest ? 'animate-spin' : ''}`} />
                Test Manuel
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isAutoTesting ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <span>{isAutoTesting ? 'Tests automatiques actifs' : 'Tests automatiques arrêtés'}</span>
            </div>
            {stats && (
              <div className="text-gray-600">
                {stats.totalTests} tests • {stats.successRate.toFixed(1)}% succès
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Statistiques globales */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Score Moyen</p>
                  <p className={`text-2xl font-bold ${getScoreColor(stats.averageScore)}`}>
                    {stats.averageScore}/100
                  </p>
                </div>
                <Target className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Taux de Succès</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.successRate.toFixed(1)}%
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Durée Moyenne</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.averageDuration}ms
                  </p>
                </div>
                <Clock className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Incohérences</p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats.totalInconsistencies}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dernier test */}
      {currentTest && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Dernier Test</span>
              <Badge variant={getScoreBadgeVariant(currentTest.score)}>
                Score: {currentTest.score}/100
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Informations générales */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Heure:</span>
                  <div className="font-medium">{currentTest.timestamp.toLocaleTimeString('fr-FR')}</div>
                </div>
                <div>
                  <span className="text-gray-600">Durée:</span>
                  <div className="font-medium">{currentTest.duration}ms</div>
                </div>
                <div>
                  <span className="text-gray-600">Succès:</span>
                  <div className="flex items-center gap-1">
                    {currentTest.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                    <span>{currentTest.success ? 'Oui' : 'Non'}</span>
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Incohérences:</span>
                  <div className="font-medium text-red-600">{currentTest.inconsistencies.length}</div>
                </div>
              </div>

              {/* État des endpoints */}
              <div>
                <h4 className="font-medium mb-2">État des Endpoints</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {Object.entries(currentTest.endpoints).map(([name, endpoint]) => (
                    <div key={name} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium capitalize">{name}</span>
                        {endpoint.success ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      {endpoint.error && (
                        <div className="text-xs text-red-600 bg-red-50 p-1 rounded">
                          {endpoint.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Métriques comparées */}
              <div>
                <h4 className="font-medium mb-2">Métriques Comparées</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Source</th>
                        <th className="text-center p-2">Total</th>
                        <th className="text-center p-2">Stock Faible</th>
                        <th className="text-center p-2">Rupture</th>
                        <th className="text-center p-2">Surstock</th>
                        <th className="text-center p-2">Alertes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(currentTest.metrics).map(([source, metrics]) => (
                        <tr key={source} className="border-b">
                          <td className="p-2 font-medium capitalize">{source}</td>
                          <td className="text-center p-2">{metrics.totalProducts}</td>
                          <td className="text-center p-2">
                            <span className="text-orange-600">{metrics.lowStockProducts}</span>
                          </td>
                          <td className="text-center p-2">
                            <span className="text-red-600">{metrics.outOfStockProducts}</span>
                          </td>
                          <td className="text-center p-2">
                            <span className="text-blue-600">{metrics.overStockProducts}</span>
                          </td>
                          <td className="text-center p-2">{metrics.activeAlerts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Incohérences */}
              {currentTest.inconsistencies.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 text-red-800">Incohérences Détectées</h4>
                  <div className="space-y-1">
                    {currentTest.inconsistencies.map((inconsistency, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-red-700 bg-red-50 p-2 rounded">
                        <AlertTriangle className="h-4 w-4" />
                        <span>{inconsistency}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historique des tests */}
      {testHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historique des Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {testHistory.slice(0, 20).map((test, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {test.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                    <div>
                      <div className="font-medium text-sm">
                        {test.timestamp.toLocaleString('fr-FR')}
                      </div>
                      <div className="text-xs text-gray-600">
                        {test.duration}ms • {test.inconsistencies.length} incohérence{test.inconsistencies.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <Badge variant={getScoreBadgeVariant(test.score)}>
                    {test.score}/100
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
