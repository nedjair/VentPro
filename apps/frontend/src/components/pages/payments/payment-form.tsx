'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Textarea } from '../../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Label } from '../../ui/label'
import { Badge } from '../../ui/badge'
import { 
  CreditCard, Save, X, AlertCircle, CheckCircle, 
  Banknote, FileText, RefreshCw, Receipt, Users, DollarSign
} from 'lucide-react'
import { api } from '@/lib/api'
import {
  ensureArray,
  safeFind,
  safeTextRender,
  safeFormatDate,
  safeFormatCurrency
} from '@/lib/defensive-utils'

interface Client {
  id: string
  firstName: string
  lastName: string
  companyName?: string
  type: string
}

interface Invoice {
  id: string
  number: string
  total: number
  paidAmount: number
  status: string
  dueDate: string
  client: Client
}

interface Payment {
  id?: string
  amount: number
  paymentDate: string
  paymentMethod: 'CASH' | 'CHECK' | 'TRANSFER' | 'CARD' | 'OTHER'
  reference?: string
  notes?: string
  invoiceId: string
  clientId: string
}

interface PaymentFormProps {
  payment?: Payment | null
  onSave: (payment: Payment) => void
  onCancel: () => void
}

export function PaymentForm({ payment, onSave, onCancel }: PaymentFormProps) {
  // États du formulaire
  const [formData, setFormData] = useState<Payment>({
    amount: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'CASH',
    reference: '',
    notes: '',
    invoiceId: '',
    clientId: ''
  })

  // États des données
  const [clients, setClients] = useState<Client[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  
  // États de l'interface
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Chargement initial
  useEffect(() => {
    loadInitialData()
  }, [])

  // Mise à jour du formulaire si un paiement est fourni
  useEffect(() => {
    if (payment) {
      setFormData({
        ...payment,
        paymentDate: payment.paymentDate.split('T')[0] // Format pour input date
      })
    }
  }, [payment])

  // Filtrage des factures par client
  useEffect(() => {
    if (formData.clientId) {
      const clientInvoices = safeFind(invoices, (invoice) => 
        invoice.client.id === formData.clientId && 
        (invoice.status === 'SENT' || invoice.status === 'PARTIAL')
      )
      setFilteredInvoices(ensureArray(clientInvoices ? [clientInvoices] : []))
    } else {
      setFilteredInvoices(invoices.filter(inv => 
        inv.status === 'SENT' || inv.status === 'PARTIAL'
      ))
    }
  }, [formData.clientId, invoices])

  // Mise à jour de la facture sélectionnée
  useEffect(() => {
    if (formData.invoiceId) {
      const invoice = safeFind(invoices, (inv) => inv.id === formData.invoiceId)
      setSelectedInvoice(invoice || null)
      if (invoice && !formData.clientId) {
        setFormData(prev => ({ ...prev, clientId: invoice.client.id }))
      }
    } else {
      setSelectedInvoice(null)
    }
  }, [formData.invoiceId, invoices])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Charger les clients et factures en parallèle
      const [clientsResponse, sentInvoicesResponse, partialInvoicesResponse] = await Promise.all([
        api.get('/api/v1/clients?limit=100'),
        api.get('/api/v1/invoices?limit=50&status=SENT'),
        api.get('/api/v1/invoices?limit=50&status=PARTIAL')
      ])

      if (clientsResponse.data?.success) {
        setClients(ensureArray(clientsResponse.data?.data || clientsResponse.data))
      }

      if (sentInvoicesResponse.data?.success && partialInvoicesResponse.data?.success) {
        // Combiner les factures SENT et PARTIAL
        const sentInvoices = ensureArray(sentInvoicesResponse.data?.data || sentInvoicesResponse.data)
        const partialInvoices = ensureArray(partialInvoicesResponse.data?.data || partialInvoicesResponse.data)
        setInvoices([...sentInvoices, ...partialInvoices])
      }
    } catch (err) {
      console.error('❌ Erreur lors du chargement:', err)
      setError('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  const getClientDisplayName = (client: Client) => {
    if (client.type === 'COMPANY' && client.companyName) {
      return client.companyName
    }
    return `${client.firstName || ''} ${client.lastName || ''}`.trim()
  }

  const getPaymentMethodIcon = (method: string) => {
    const icons = {
      CASH: Banknote,
      CHECK: FileText,
      TRANSFER: RefreshCw,
      CARD: CreditCard,
      OTHER: Receipt
    }
    return icons[method as keyof typeof icons] || Receipt
  }

  const handleInputChange = (field: keyof Payment, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  const validateForm = (): string | null => {
    if (!formData.amount || formData.amount <= 0) {
      return 'Le montant doit être supérieur à 0'
    }
    if (!formData.paymentDate) {
      return 'La date de paiement est requise'
    }
    if (!formData.paymentMethod) {
      return 'La méthode de paiement est requise'
    }
    if (!formData.invoiceId) {
      return 'Veuillez sélectionner une facture'
    }
    if (!formData.clientId) {
      return 'Veuillez sélectionner un client'
    }
    
    // Vérifier que le montant ne dépasse pas le solde restant
    if (selectedInvoice) {
      const remainingAmount = selectedInvoice.total - selectedInvoice.paidAmount
      if (!payment && formData.amount > remainingAmount) {
        return `Le montant ne peut pas dépasser le solde restant (${safeFormatCurrency(remainingAmount, 'DA')})`
      }
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const paymentData = {
        ...formData,
        amount: Number(formData.amount)
      }

      let response
      if (payment?.id) {
        // Modification
        response = await api.put(`/api/v1/payments/${payment.id}`, paymentData)
      } else {
        // Création
        response = await api.post('/api/v1/payments', paymentData)
      }

      if (response.data?.success) {
        setSuccess(true)
        setTimeout(() => {
          onSave(response.data.data as Payment)
        }, 1000)
      } else {
        throw new Error(response.data?.message || 'Erreur lors de la sauvegarde')
      }
    } catch (err) {
      console.error('❌ Erreur lors de la sauvegarde:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !clients.length) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          {payment ? 'Modifier le paiement' : 'Nouveau paiement'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-medium text-primary mb-2">
              Paiement {payment ? 'modifié' : 'créé'} avec succès !
            </h3>
            <p className="text-primary">Redirection en cours...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Sélection du client */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="clientId">Client *</Label>
                <Select
                  value={formData.clientId}
                  onValueChange={(value) => handleInputChange('clientId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {getClientDisplayName(client)}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sélection de la facture */}
              <div>
                <Label htmlFor="invoiceId">Facture *</Label>
                <Select
                  value={formData.invoiceId}
                  onValueChange={(value) => handleInputChange('invoiceId', value)}
                  disabled={!formData.clientId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une facture" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredInvoices.map((invoice) => (
                      <SelectItem key={invoice.id} value={invoice.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{invoice.number}</span>
                          <span className="text-sm text-gray-500">
                            {safeFormatCurrency(invoice.total - invoice.paidAmount, 'DA')} restant
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Informations de la facture sélectionnée */}
            {selectedInvoice && (
              <div className="bg-accent p-4 rounded-lg">
                <h4 className="font-medium text-card-foreground mb-2">Facture sélectionnée</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-primary">Total:</span> {safeFormatCurrency(selectedInvoice.total, 'DA')}
                  </div>
                  <div>
                    <span className="text-primary">Déjà payé:</span> {safeFormatCurrency(selectedInvoice.paidAmount, 'DA')}
                  </div>
                  <div>
                    <span className="text-primary">Restant:</span> {safeFormatCurrency(selectedInvoice.total - selectedInvoice.paidAmount, 'DA')}
                  </div>
                  <div>
                    <span className="text-primary">Échéance:</span> {safeFormatDate(selectedInvoice.dueDate)}
                  </div>
                </div>
              </div>
            )}

            {/* Montant et date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Montant (DA) *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount || ''}
                    onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                    className="pl-10"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="paymentDate">Date de paiement *</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => handleInputChange('paymentDate', e.target.value)}
                />
              </div>
            </div>

            {/* Méthode de paiement et référence */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="paymentMethod">Méthode de paiement *</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value) => handleInputChange('paymentMethod', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4" />
                        Espèces
                      </div>
                    </SelectItem>
                    <SelectItem value="CHECK">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Chèque
                      </div>
                    </SelectItem>
                    <SelectItem value="TRANSFER">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Virement
                      </div>
                    </SelectItem>
                    <SelectItem value="CARD">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Carte
                      </div>
                    </SelectItem>
                    <SelectItem value="OTHER">
                      <div className="flex items-center gap-2">
                        <Receipt className="h-4 w-4" />
                        Autre
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="reference">Référence</Label>
                <Input
                  id="reference"
                  value={formData.reference || ''}
                  onChange={(e) => handleInputChange('reference', e.target.value)}
                  placeholder="Numéro de chèque, référence virement..."
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Commentaires sur le paiement..."
                rows={3}
              />
            </div>

            {/* Messages d'erreur */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-destructive mr-2" />
                  <span className="text-destructive">{error}</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
              >
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {payment ? 'Modifier' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
