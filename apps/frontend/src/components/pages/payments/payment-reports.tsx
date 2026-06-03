'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Badge } from '../../ui/badge'
import { 
  BarChart3, PieChart, TrendingUp, Download, Calendar, 
  DollarSign, Users, CreditCard, FileText, Filter
} from 'lucide-react'
import { api } from '@/lib/api'
import {
  ensureArray,
  safeFormatDate,
  safeFormatCurrency
} from '@/lib/defensive-utils'

interface PaymentReport {
  period: string
  totalAmount: number
  totalCount: number
  averageAmount: number
  methodBreakdown: Record<string, { count: number; amount: number }>
  clientBreakdown: Array<{ clientName: string; amount: number; count: number }>
  dailyBreakdown: Array<{ date: string; amount: number; count: number }>
}

interface PaymentReportsProps {
  onClose: () => void
}

export function PaymentReports({ onClose }: PaymentReportsProps) {
  // États des données
  const [report, setReport] = useState<PaymentReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // États des filtres
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date()
    date.setMonth(date.getMonth() - 1)
    return date.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [reportType, setReportType] = useState<'summary' | 'detailed'>('summary')

  // Chargement initial
  useEffect(() => {
    loadReport()
  }, [dateFrom, dateTo, reportType])

  const loadReport = async () => {
    try {
      setLoading(true)
      setError(null)

      const queryParams = new URLSearchParams({
        dateFrom,
        dateTo,
        type: reportType
      })

      const response = await api.get(`/api/v1/payments/reports?${queryParams}`)
      
      if (response.data?.success) {
        setReport(response.data.data)
      } else {
        throw new Error(response.data?.message || 'Erreur lors du chargement du rapport')
      }
    } catch (err) {
      console.error('❌ Erreur lors du chargement du rapport:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement du rapport')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      const queryParams = new URLSearchParams({
        dateFrom,
        dateTo,
        type: reportType,
        format
      })

      const response = await api.get(`/payments/reports/export?${queryParams}`, {
        responseType: 'blob'
      })
      
      if (response.status >= 200 && response.status < 300) {
        // Créer un lien de téléchargement
        const blob = new Blob([response.data])
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `rapport-paiements-${dateFrom}-${dateTo}.${format === 'pdf' ? 'pdf' : 'xlsx'}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('❌ Erreur lors de l\'export:', err)
      setError('Erreur lors de l\'export du rapport')
    }
  }

  const getMethodColor = (method: string) => {
    const colors = {
      CASH: 'bg-green-100 text-green-800',
      CHECK: 'bg-blue-100 text-blue-800',
      TRANSFER: 'bg-purple-100 text-purple-800',
      CARD: 'bg-orange-100 text-orange-800',
      OTHER: 'bg-gray-100 text-gray-800'
    }
    return colors[method as keyof typeof colors] || colors.OTHER
  }

  const getMethodLabel = (method: string) => {
    const labels = {
      CASH: 'Espèces',
      CHECK: 'Chèque',
      TRANSFER: 'Virement',
      CARD: 'Carte',
      OTHER: 'Autre'
    }
    return labels[method as keyof typeof labels] || method
  }

  if (loading && !report) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Génération du rapport...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Rapports de Paiements
            </span>
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Date de début
              </label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Date de fin
              </label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Type de rapport
              </label>
              <Select
                value={reportType}
                onValueChange={(value) => setReportType(value as 'summary' | 'detailed')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Résumé</SelectItem>
                  <SelectItem value="detailed">Détaillé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button
                onClick={() => handleExport('pdf')}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                PDF
              </Button>
              <Button
                onClick={() => handleExport('excel')}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card>
          <CardContent className="p-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-center">
                <div className="text-destructive">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-destructive">Erreur</h3>
                  <p className="text-sm text-destructive mt-1">{error}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {report && (
        <>
          {/* Statistiques générales */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total encaissé</p>
                    <p className="text-2xl font-bold text-card-foreground">
                      {safeFormatCurrency(report.totalAmount, 'DA')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <CreditCard className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Nombre de paiements</p>
                    <p className="text-2xl font-bold text-card-foreground">
                      {report.totalCount}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Montant moyen</p>
                    <p className="text-2xl font-bold text-card-foreground">
                      {safeFormatCurrency(report.averageAmount, 'DA')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <Calendar className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Période</p>
                    <p className="text-lg font-bold text-card-foreground">
                      {report.period}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Répartition par méthode de paiement */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Répartition par méthode de paiement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(report.methodBreakdown).map(([method, data]) => (
                  <div key={method} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={getMethodColor(method)}>
                        {getMethodLabel(method)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {data.count} paiement{data.count > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="text-lg font-semibold">
                      {safeFormatCurrency(data.amount, 'DA')}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {((data.amount / report.totalAmount) * 100).toFixed(1)}% du total
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top clients */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {report.clientBreakdown.slice(0, 10).map((client, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-card-foreground font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{client.clientName}</div>
                        <div className="text-sm text-muted-foreground">
                          {client.count} paiement{client.count > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {safeFormatCurrency(client.amount, 'DA')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {((client.amount / report.totalAmount) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Évolution quotidienne */}
          {reportType === 'detailed' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Évolution quotidienne
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {report.dailyBreakdown.map((day, index) => (
                    <div key={index} className="flex items-center justify-between p-2 hover:bg-secondary rounded">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{safeFormatDate(day.date)}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">
                          {day.count} paiement{day.count > 1 ? 's' : ''}
                        </span>
                        <span className="font-semibold">
                          {safeFormatCurrency(day.amount, 'DA')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
