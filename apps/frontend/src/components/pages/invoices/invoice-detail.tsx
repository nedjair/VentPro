'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit, FileText, Download, Mail, CreditCard, AlertCircle } from 'lucide-react'
import { api, Invoice } from '@/lib/api'
import { ExportService } from '@/lib/export'
import { InvoiceStatusBadge } from './invoice-status-badge'
import Link from 'next/link'

interface InvoiceDetailPageProps {
  invoiceId: string
}

export function InvoiceDetailPage({ invoiceId }: InvoiceDetailPageProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    loadInvoice()
  }, [invoiceId])

  const loadInvoice = async () => {
    try {
      setLoading(true)
      const response = await api.getInvoice(invoiceId)
      
      if (response.success && response.data) {
        setInvoice(response.data)
        setLoadError(null)
        setActionError(null)
      } else {
        throw new Error('Facture non trouvée')
      }
    } catch (err) {
      console.error('Erreur lors du chargement de la facture:', err)
      setLoadError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const getTypeIcon = (type: string | undefined) => {
    switch (type) {
      case 'INVOICE':
        return <FileText className="h-8 w-8 text-blue-600" />
      case 'CREDIT_NOTE':
        return <CreditCard className="h-8 w-8 text-red-600" />
      case 'QUOTE':
        return <AlertCircle className="h-8 w-8 text-orange-600" />
      default:
        return <FileText className="h-8 w-8 text-gray-600" />
    }
  }

  const getTypeLabel = (type: string | undefined) => {
    switch (type) {
      case 'INVOICE':
        return 'Facture'
      case 'CREDIT_NOTE':
        return 'Avoir'
      case 'QUOTE':
        return 'Devis'
      default:
        return type || 'Document'
    }
  }

  const getPaymentMethodLabel = (method?: string) => {
    const methods: Record<string, string> = {
      BANK_TRANSFER: 'Virement bancaire',
      CHECK: 'Chèque',
      CASH: 'Espèces',
      CARD: 'Carte bancaire',
      PAYPAL: 'PayPal',
      OTHER: 'Autre',
    }
    return method ? methods[method] || method : 'Non spécifié'
  }

  const handleDownloadPDF = async () => {
    try {
      setActionError(null)
      await ExportService.downloadInvoicePDF(invoiceId)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur lors du téléchargement du PDF')
    }
  }

  const handleSendEmail = () => {
    const recipientEmail = invoice?.client?.email

    if (!recipientEmail) {
      setActionError('Aucune adresse email client n’est disponible pour cette facture.')
      return
    }

    setActionError(null)

    const clientName = invoice?.client?.companyName
      || [invoice?.client?.firstName, invoice?.client?.lastName].filter(Boolean).join(' ')
      || 'client'

    const subject = encodeURIComponent(`Facture ${invoice?.number} - ${clientName}`)
    const body = encodeURIComponent(
      `Bonjour,\n\nVeuillez trouver ci-joint la facture ${invoice?.number}.\n\nCordialement,`
    )

    window.open(`mailto:${recipientEmail}?subject=${subject}&body=${body}`, '_self')
  }

  const actions = invoice ? (
    <div className="flex space-x-2">
      <Link href="/invoices">
        <Button variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
      </Link>
      <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
        <Download className="h-4 w-4 mr-2" />
        Télécharger PDF
      </Button>
      <Button variant="outline" size="sm" onClick={handleSendEmail}>
        <Mail className="h-4 w-4 mr-2" />
        Envoyer par email
      </Button>
      <Link href={`/invoices/${invoiceId}/edit`}>
        <Button size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Modifier
        </Button>
      </Link>
    </div>
  ) : null

  if (loading) {
    return (
      <MainLayout title="Détail de la facture">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Chargement...</span>
        </div>
      </MainLayout>
    )
  }

  if (loadError || !invoice) {
    return (
      <MainLayout title="Erreur">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-red-800 mb-2">
              Erreur de chargement
            </h3>
            <p className="text-red-700 mb-4">{loadError || 'Facture non trouvée'}</p>
            <Link href="/invoices">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour aux factures
              </Button>
            </Link>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout 
      title={`${getTypeLabel(invoice.type)} ${invoice.number}`}
      subtitle={`Créée le ${new Date(invoice.createdAt).toLocaleDateString('fr-FR')}`}
    >
      <div className="space-y-6">
        {actionError && (
          <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {actionError}
          </div>
        )}

        {/* En-tête avec statut */}
        <div className="card">
          <div className="card-content">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {getTypeIcon(invoice.type)}
                <div>
                  <h2 className="text-xl font-bold">
                    {getTypeLabel(invoice.type)} {invoice.number}
                  </h2>
                  <p className="text-gray-600">
                    Créée le {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString('fr-FR') : '-'}
                  </p>
                  {invoice.order && (
                    <p className="text-sm text-blue-600">
                      Basée sur la commande {invoice.order.number}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <InvoiceStatusBadge status={invoice.status} size="md" />
                <div className="mt-2 text-2xl font-bold text-blue-600">
                  {Number(invoice.total).toFixed(2)} €
                </div>
                {invoice.status === 'PAID' && (
                  <div className="text-sm text-green-600">
                    Payé: {Number(invoice.totalTTC).toFixed(2)} €
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Informations client */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium">Informations client</h3>
            </div>
            <div className="card-content">
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">Nom:</span>
                  <div className="text-sm text-gray-900">
                    {invoice.client?.type === 'COMPANY' 
                      ? invoice.client.companyName 
                      : `${invoice.client?.firstName} ${invoice.client?.lastName}`
                    }
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Email:</span>
                  <div className="text-sm text-gray-900">{invoice.client?.email}</div>
                </div>
                {invoice.client?.phone && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Téléphone:</span>
                    <div className="text-sm text-gray-900">{invoice.client.phone}</div>
                  </div>
                )}
                {invoice.client?.address && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Adresse:</span>
                    <div className="text-sm text-gray-900">
                      {invoice.client.address}
                      {invoice.client.postalCode && invoice.client.city && (
                        <><br />{invoice.client.postalCode} {invoice.client.city}</>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Informations facture */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium">Informations facture</h3>
            </div>
            <div className="card-content">
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">Type:</span>
                  <div className="text-sm text-gray-900">{getTypeLabel(invoice.type)}</div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Date de facture:</span>
                  <div className="text-sm text-gray-900">
                    {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString('fr-FR') : '-'}
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Date d'échéance:</span>
                  <div className={`text-sm ${
                    invoice.status === 'OVERDUE' ? 'text-red-600 font-medium' : 'text-gray-900'
                  }`}>
                    {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('fr-FR') : '-'}
                  </div>
                </div>
                {invoice.status === 'PAID' && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Date de paiement:</span>
                    <div className="text-sm text-green-600">
                      {invoice.paymentDate ? new Date(invoice.paymentDate).toLocaleDateString('fr-FR') : '-'}
                    </div>
                  </div>
                )}
                <div>
                  <span className="text-sm font-medium text-gray-500">Méthode de paiement:</span>
                  <div className="text-sm text-gray-900">
                    {getPaymentMethodLabel(invoice.status === 'PAID' ? 'BANK_TRANSFER' : undefined)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Articles */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium">Articles</h3>
          </div>
          <div className="card-content">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantité
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prix unitaire
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      TVA
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Remise
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total HT
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoice.items.map((item, index) => {
                    const itemTotal = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100)
                    return (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {item.product?.name || `Produit ${item.productId}`}
                          </div>
                          {item.product?.reference && (
                            <div className="text-sm text-gray-500">
                              Réf: {item.product.reference}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {Number(item.unitPrice).toFixed(2)} €
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.vatRate}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.discount || 0}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {Number(itemTotal).toFixed(2)} €
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Totaux */}
            <div className="mt-6 border-t pt-6">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span>Sous-total HT:</span>
                    <span>{Number(invoice.totalHT).toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TVA:</span>
                    <span>{Number(invoice.totalVAT).toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total TTC:</span>
                    <span>{Number(invoice.totalTTC).toFixed(2)} €</span>
                  </div>
                  {invoice.status === 'PAID' && (
                    <>
                      <div className="flex justify-between text-green-600">
                        <span>Montant payé:</span>
                        <span>{Number(invoice.totalTTC).toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Reste à payer:</span>
                        <span className="text-green-600">
                          {(0).toFixed(2)} €
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium">Notes</h3>
            </div>
            <div className="card-content">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-content">
            <div className="flex flex-col gap-4 border-t border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-gray-500">
                Vous pouvez revenir à la liste, télécharger le PDF, envoyer la facture par email ou ouvrir la modification du document.
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                {actions}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
