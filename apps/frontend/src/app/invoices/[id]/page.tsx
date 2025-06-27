import { Metadata } from 'next'
import { InvoiceDetailPage } from '@/components/pages/invoices/invoice-detail'

export const metadata: Metadata = {
  title: 'Détail Facture',
  description: 'Détail d\'une facture avec génération PDF',
}

interface InvoiceDetailProps {
  params: {
    id: string
  }
}

export default function InvoiceDetail({ params }: InvoiceDetailProps) {
  return <InvoiceDetailPage invoiceId={params.id} />
}
