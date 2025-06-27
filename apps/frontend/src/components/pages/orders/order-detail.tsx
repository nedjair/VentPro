'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit, FileText, Download, Mail, Check, X, Clock } from 'lucide-react'
import { api, Order } from '@/lib/api'
import Link from 'next/link'

interface OrderDetailPageProps {
  orderId: string
}

export function OrderDetailPage({ orderId }: OrderDetailPageProps) {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadOrder()
  }, [orderId])

  const loadOrder = async () => {
    try {
      setLoading(true)
      const response = await api.getOrder(orderId)
      
      if (response.success && response.data) {
        setOrder(response.data)
        setError(null)
      } else {
        throw new Error('Commande non trouvée')
      }
    } catch (err) {
      console.error('Erreur lors du chargement de la commande:', err)
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: Order['status']) => {
    const statusConfig = {
      DRAFT: { label: 'Brouillon', className: 'bg-gray-100 text-gray-800', icon: Clock },
      SENT: { label: 'Envoyé', className: 'bg-blue-100 text-blue-800', icon: Mail },
      ACCEPTED: { label: 'Accepté', className: 'bg-green-100 text-green-800', icon: Check },
      REJECTED: { label: 'Rejeté', className: 'bg-red-100 text-red-800', icon: X },
      EXPIRED: { label: 'Expiré', className: 'bg-orange-100 text-orange-800', icon: Clock },
      CANCELLED: { label: 'Annulé', className: 'bg-gray-100 text-gray-800', icon: X },
    }
    
    // @ts-ignore - Nous utilisons un accès dynamique au statut
    const config = statusConfig[status]
    const Icon = config.icon
    
    return (
      <span className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full ${config.className}`}>
        <Icon className="h-4 w-4 mr-1" />
        {config.label}
      </span>
    )
  }

  const handleDownloadPDF = () => {
    console.log('Téléchargement PDF de la commande:', orderId)
    // TODO: Implémenter le téléchargement PDF
  }

  const handleSendEmail = () => {
    console.log('Envoi par email de la commande:', orderId)
    // TODO: Implémenter l'envoi par email
  }

  const actions = order ? (
    <div className="flex space-x-2">
      <Link href="/orders">
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
      <Link href={`/orders/${orderId}/edit`}>
        <Button size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Modifier
        </Button>
      </Link>
    </div>
  ) : null

  if (loading) {
    return (
      <MainLayout title="Détail de la commande">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Chargement...</span>
        </div>
      </MainLayout>
    )
  }

  if (error || !order) {
    return (
      <MainLayout title="Erreur">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-red-800 mb-2">
              Erreur de chargement
            </h3>
            <p className="text-red-700 mb-4">{error || 'Commande non trouvée'}</p>
            <Link href="/orders">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour aux commandes
              </Button>
            </Link>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout 
      title={`Commande ${order.reference}`}
      subtitle={`Créé le ${new Date(order.createdAt).toLocaleDateString('fr-FR')}`}
      actions={actions}
    >
      <div className="space-y-6">
        {/* En-tête avec statut */}
        <div className="card">
          <div className="card-content">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <FileText className="h-8 w-8 text-blue-600" />
                <div>
                  <h2 className="text-xl font-bold">
                    Commande {order.reference}
                  </h2>
                  <p className="text-gray-600">
                    Commande créée le {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                {getStatusBadge(order.status)}
                <div className="mt-2 text-2xl font-bold text-blue-600">
                  {Number(order.totalTTC).toFixed(2)} €
                </div>
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
                    {order.client?.type === 'COMPANY' 
                      ? order.client.companyName 
                      : `${order.client?.firstName} ${order.client?.lastName}`
                    }
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Email:</span>
                  <div className="text-sm text-gray-900">{order.client?.email}</div>
                </div>
                {order.client?.phone && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Téléphone:</span>
                    <div className="text-sm text-gray-900">{order.client.phone}</div>
                  </div>
                )}
                {order.client?.address && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Adresse:</span>
                    <div className="text-sm text-gray-900">
                      {order.client.address}
                      {order.client.postalCode && order.client.city && (
                        <><br />{order.client.postalCode} {order.client.city}</>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Informations commande */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium">Informations commande</h3>
            </div>
            <div className="card-content">
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">Type:</span>
                  <div className="text-sm text-gray-900">
                    Commande
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Date:</span>
                  <div className="text-sm text-gray-900">
                    {new Date(order.createdAt).toLocaleDateString('fr-FR')}
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
                  {order.items.map((item, index) => {
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
                    <span>{Number(order.totalHT).toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TVA:</span>
                    <span>{Number(order.totalVAT).toFixed(2)} €</span>
                  </div>

                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total TTC:</span>
                    <span>{Number(order.totalTTC).toFixed(2)} €</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {order.notes && (
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium">Notes client</h3>
                </div>
                <div className="card-content">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{order.notes}</p>
                </div>
              </div>
            )}


          </div>
        )}
      </div>
    </MainLayout>
  )
}
