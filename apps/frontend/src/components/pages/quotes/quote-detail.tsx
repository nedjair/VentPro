import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Badge } from '../../ui/badge'
import { Button } from '../../ui/button'
import { 
  FileText, 
  User, 
  Calendar, 
  Clock, 
  Package, 
  DollarSign,
  Download,
  Send,
  CheckCircle,
  XCircle,
  Edit
} from 'lucide-react'

interface Quote {
  id: string
  number: string
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
  quoteDate: string
  validUntil: string
  notes?: string
  subtotal: number
  taxAmount: number
  total: number
  discount: number
  client: {
    id: string
    firstName: string
    lastName: string
    companyName?: string
    email: string
    phone?: string
    address?: string
  }
  items: QuoteItem[]
  createdBy: {
    firstName: string
    lastName: string
  }
  order?: {
    id: string
    number: string
  }
  createdAt: string
  updatedAt: string
}

interface QuoteItem {
  id: string
  quantity: number
  unitPrice: number
  discount: number
  total: number
  product: {
    id: string
    name: string
    sku: string
    description?: string
  }
}

interface QuoteDetailProps {
  quote: Quote
  onEdit?: () => void
  onStatusChange?: (status: Quote['status']) => void
  onConvertToOrder?: () => void
  onExportPDF?: () => void
}

const QuoteDetail: React.FC<QuoteDetailProps> = ({
  quote,
  onEdit,
  onStatusChange,
  onConvertToOrder,
  onExportPDF
}) => {
  const getStatusBadge = (status: Quote['status']) => {
    const statusConfig = {
      DRAFT: { label: 'Brouillon', variant: 'secondary' as const, icon: Edit },
      SENT: { label: 'Envoyé', variant: 'default' as const, icon: Send },
      ACCEPTED: { label: 'Accepté', variant: 'success' as const, icon: CheckCircle },
      REJECTED: { label: 'Refusé', variant: 'destructive' as const, icon: XCircle },
      EXPIRED: { label: 'Expiré', variant: 'outline' as const, icon: Clock }
    }

    const config = statusConfig[status]
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-DZ', {
      style: 'currency',
      currency: 'DZD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR')
  }

  const isExpired = new Date(quote.validUntil) < new Date()

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{quote.number}</h1>
            {getStatusBadge(quote.status)}
            {quote.order && (
              <Badge variant="outline" className="text-green-600">
                Converti en {quote.order.number}
              </Badge>
            )}
            {isExpired && quote.status === 'SENT' && (
              <Badge variant="destructive">
                Expiré
              </Badge>
            )}
          </div>
          <p className="text-gray-600">
            Créé le {formatDateTime(quote.createdAt)} par {quote.createdBy.firstName} {quote.createdBy.lastName}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onExportPDF && (
            <Button variant="outline" onClick={onExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
          )}
          
          {quote.status === 'DRAFT' && onEdit && (
            <Button variant="outline" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </Button>
          )}

          {quote.status === 'DRAFT' && onStatusChange && (
            <Button onClick={() => onStatusChange('SENT')}>
              <Send className="h-4 w-4 mr-2" />
              Envoyer
            </Button>
          )}

          {quote.status === 'SENT' && onStatusChange && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => onStatusChange('REJECTED')}
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Refuser
              </Button>
              <Button 
                onClick={() => onStatusChange('ACCEPTED')}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Accepter
              </Button>
            </div>
          )}

          {quote.status === 'ACCEPTED' && !quote.order && onConvertToOrder && (
            <Button onClick={onConvertToOrder} className="bg-blue-600 hover:bg-blue-700">
              Convertir en commande
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informations client */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Client
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h3 className="font-semibold">
                {quote.client.companyName || `${quote.client.firstName} ${quote.client.lastName}`}
              </h3>
              {quote.client.companyName && (
                <p className="text-sm text-gray-600">
                  {quote.client.firstName} {quote.client.lastName}
                </p>
              )}
            </div>
            
            <div className="space-y-1 text-sm">
              <p><strong>Email:</strong> {quote.client.email}</p>
              {quote.client.phone && (
                <p><strong>Téléphone:</strong> {quote.client.phone}</p>
              )}
              {quote.client.address && (
                <p><strong>Adresse:</strong> {quote.client.address}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Informations devis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Informations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Date du devis</p>
              <p className="font-semibold">{formatDate(quote.quoteDate)}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Valide jusqu'au</p>
              <p className={`font-semibold ${isExpired ? 'text-red-600' : ''}`}>
                {formatDate(quote.validUntil)}
              </p>
            </div>

            {quote.discount > 0 && (
              <div>
                <p className="text-sm text-gray-600">Remise globale</p>
                <p className="font-semibold text-green-600">{quote.discount}%</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Résumé financier */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Montants
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Sous-total:</span>
              <span>{formatCurrency(quote.subtotal)}</span>
            </div>
            
            {quote.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span className="text-sm">Remise ({quote.discount}%):</span>
                <span>-{formatCurrency(quote.subtotal * quote.discount / 100)}</span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">TVA:</span>
              <span>{formatCurrency(quote.taxAmount)}</span>
            </div>
            
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span>{formatCurrency(quote.total)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Articles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Articles ({quote.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Produit</th>
                  <th className="text-right py-2">Qté</th>
                  <th className="text-right py-2">Prix unitaire</th>
                  <th className="text-right py-2">Remise</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {quote.items.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-3">
                      <div>
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-sm text-gray-600">SKU: {item.product.sku}</p>
                        {item.product.description && (
                          <p className="text-sm text-gray-500">{item.product.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="text-right py-3">{item.quantity}</td>
                    <td className="text-right py-3">{formatCurrency(item.unitPrice)}</td>
                    <td className="text-right py-3">
                      {item.discount > 0 ? `${item.discount}%` : '-'}
                    </td>
                    <td className="text-right py-3 font-semibold">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {quote.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{quote.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default QuoteDetail
