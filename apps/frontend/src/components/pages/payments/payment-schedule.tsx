'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Button } from '../../ui/button'
import { Badge } from '../../ui/badge'
import { Input } from '../../ui/input'
import { 
  Clock, AlertTriangle, CheckCircle, Calendar, 
  Users, DollarSign, FileText, Mail, Phone, Plus
} from 'lucide-react'
import { api } from '@/lib/api'
import {
  ensureArray,
  safeFind,
  safeFormatDate,
  safeFormatCurrency
} from '@/lib/defensive-utils'

interface OverdueInvoice {
  id: string
  number: string
  total: number
  paidAmount: number
  remainingAmount: number
  dueDate: string
  daysPastDue: number
  client: {
    id: string
    firstName: string
    lastName: string
    companyName?: string
    email?: string
    phone?: string
    type: string
  }
  lastPaymentDate?: string
}

interface UpcomingPayment {
  id: string
  number: string
  total: number
  paidAmount: number
  remainingAmount: number
  dueDate: string
  daysUntilDue: number
  client: {
    id: string
    firstName: string
    lastName: string
    companyName?: string
    email?: string
    phone?: string
    type: string
  }
}

interface PaymentScheduleProps {
  onClose: () => void
  onCreatePayment: (invoiceId: string) => void
}

export function PaymentSchedule({ onClose, onCreatePayment }: PaymentScheduleProps) {
  // États des données
  const [overdueInvoices, setOverdueInvoices] = useState<OverdueInvoice[]>([])
  const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // États de l'interface
  const [activeTab, setActiveTab] = useState<'overdue' | 'upcoming'>('overdue')
  const [searchTerm, setSearchTerm] = useState('')

  // Chargement initial
  useEffect(() => {
    loadScheduleData()
  }, [])

  const loadScheduleData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [overdueResponse, upcomingResponse] = await Promise.all([
        api.get('/invoices/overdue'),
        api.get('/invoices/upcoming-due')
      ])

      if (overdueResponse.success) {
        setOverdueInvoices(ensureArray(overdueResponse.data))
      }

      if (upcomingResponse.success) {
        setUpcomingPayments(ensureArray(upcomingResponse.data))
      }
    } catch (err) {
      console.error('❌ Erreur lors du chargement des échéances:', err)
      setError('Erreur lors du chargement des échéances')
    } finally {
      setLoading(false)
    }
  }

  const getClientDisplayName = (client: any) => {
    if (client.type === 'COMPANY' && client.companyName) {
      return client.companyName
    }
    return `${client.firstName || ''} ${client.lastName || ''}`.trim()
  }

  const getOverdueSeverity = (daysPastDue: number) => {
    if (daysPastDue <= 7) return { color: 'bg-yellow-100 text-yellow-800', label: 'Récent' }
    if (daysPastDue <= 30) return { color: 'bg-orange-100 text-orange-800', label: 'Modéré' }
    return { color: 'bg-red-100 text-red-800', label: 'Critique' }
  }

  const getUpcomingUrgency = (daysUntilDue: number) => {
    if (daysUntilDue <= 3) return { color: 'bg-red-100 text-red-800', label: 'Urgent' }
    if (daysUntilDue <= 7) return { color: 'bg-orange-100 text-orange-800', label: 'Bientôt' }
    return { color: 'bg-blue-100 text-blue-800', label: 'À venir' }
  }

  const handleSendReminder = async (invoiceId: string, clientEmail?: string) => {
    if (!clientEmail) {
      alert('Aucune adresse email disponible pour ce client')
      return
    }

    try {
      const response = await api.post(`/invoices/${invoiceId}/send-reminder`)
      
      if (response.success) {
        alert('Rappel envoyé avec succès')
      } else {
        throw new Error(response.message || 'Erreur lors de l\'envoi du rappel')
      }
    } catch (err) {
      console.error('❌ Erreur lors de l\'envoi du rappel:', err)
      alert('Erreur lors de l\'envoi du rappel')
    }
  }

  // Filtrage des données
  const filteredOverdue = overdueInvoices.filter(invoice => {
    if (!searchTerm) return true
    const clientName = getClientDisplayName(invoice.client).toLowerCase()
    const invoiceNumber = invoice.number.toLowerCase()
    return clientName.includes(searchTerm.toLowerCase()) || 
           invoiceNumber.includes(searchTerm.toLowerCase())
  })

  const filteredUpcoming = upcomingPayments.filter(payment => {
    if (!searchTerm) return true
    const clientName = getClientDisplayName(payment.client).toLowerCase()
    const invoiceNumber = payment.number.toLowerCase()
    return clientName.includes(searchTerm.toLowerCase()) || 
           invoiceNumber.includes(searchTerm.toLowerCase())
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Chargement des échéances...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Gestion des Échéances
            </span>
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Onglets */}
          <div className="flex space-x-1 mb-4">
            <Button
              variant={activeTab === 'overdue' ? 'default' : 'outline'}
              onClick={() => setActiveTab('overdue')}
              className="flex items-center gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              En retard ({overdueInvoices.length})
            </Button>
            <Button
              variant={activeTab === 'upcoming' ? 'default' : 'outline'}
              onClick={() => setActiveTab('upcoming')}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              À venir ({upcomingPayments.length})
            </Button>
          </div>

          {/* Barre de recherche */}
          <div className="relative">
            <Input
              placeholder="Rechercher par client ou numéro de facture..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card>
          <CardContent className="p-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-destructive mr-2" />
                <span className="text-destructive">{error}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contenu des onglets */}
      {activeTab === 'overdue' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Factures en retard ({filteredOverdue.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredOverdue.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-green-800 mb-2">
                  Aucune facture en retard !
                </h3>
                <p className="text-green-600">
                  Tous vos clients sont à jour dans leurs paiements.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOverdue.map((invoice) => {
                  const severity = getOverdueSeverity(invoice.daysPastDue)
                  return (
                    <div key={invoice.id} className="border border-destructive/20 rounded-lg p-4 bg-destructive/10">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-card-foreground">
                              {invoice.number}
                            </h3>
                            <Badge className={severity.color}>
                              {invoice.daysPastDue} jour{invoice.daysPastDue > 1 ? 's' : ''} de retard
                            </Badge>
                            <Badge variant="outline" className={severity.color}>
                              {severity.label}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span>{getClientDisplayName(invoice.client)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>Échéance: {safeFormatDate(invoice.dueDate)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4" />
                              <span>
                                Restant: {safeFormatCurrency(invoice.remainingAmount, 'DA')}
                              </span>
                            </div>
                            {invoice.lastPaymentDate && (
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4" />
                                <span>Dernier paiement: {safeFormatDate(invoice.lastPaymentDate)}</span>
                              </div>
                            )}
                          </div>

                          {(invoice.client.email || invoice.client.phone) && (
                            <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                              {invoice.client.email && (
                                <div className="flex items-center gap-1">
                                  <Mail className="h-4 w-4" />
                                  <span>{invoice.client.email}</span>
                                </div>
                              )}
                              {invoice.client.phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-4 w-4" />
                                  <span>{invoice.client.phone}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onCreatePayment(invoice.id)}
                            className="flex items-center gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Paiement
                          </Button>
                          {invoice.client.email && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSendReminder(invoice.id, invoice.client.email)}
                              className="flex items-center gap-2"
                            >
                              <Mail className="h-4 w-4" />
                              Rappel
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'upcoming' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Calendar className="h-5 w-5" />
              Échéances à venir ({filteredUpcoming.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredUpcoming.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Aucune échéance à venir
                </h3>
                <p className="text-gray-500">
                  Toutes les factures sont soit payées, soit en retard.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredUpcoming.map((payment) => {
                  const urgency = getUpcomingUrgency(payment.daysUntilDue)
                  return (
                    <div key={payment.id} className="border border-secondary rounded-lg p-4 bg-secondary">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-card-foreground">
                              {payment.number}
                            </h3>
                            <Badge className={urgency.color}>
                              Dans {payment.daysUntilDue} jour{payment.daysUntilDue > 1 ? 's' : ''}
                            </Badge>
                            <Badge variant="outline" className={urgency.color}>
                              {urgency.label}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span>{getClientDisplayName(payment.client)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>Échéance: {safeFormatDate(payment.dueDate)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4" />
                              <span>
                                Restant: {safeFormatCurrency(payment.remainingAmount, 'DA')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              <span>
                                Total: {safeFormatCurrency(payment.total, 'DA')}
                              </span>
                            </div>
                          </div>

                          {(payment.client.email || payment.client.phone) && (
                            <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                              {payment.client.email && (
                                <div className="flex items-center gap-1">
                                  <Mail className="h-4 w-4" />
                                  <span>{payment.client.email}</span>
                                </div>
                              )}
                              {payment.client.phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-4 w-4" />
                                  <span>{payment.client.phone}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onCreatePayment(payment.id)}
                            className="flex items-center gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Paiement
                          </Button>
                          {payment.client.email && payment.daysUntilDue <= 7 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSendReminder(payment.id, payment.client.email)}
                              className="flex items-center gap-2"
                            >
                              <Mail className="h-4 w-4" />
                              Rappel
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
