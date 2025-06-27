import { Metadata } from 'next'
import { InvoiceFormPage } from '@/components/pages/invoices/invoice-form'

export const metadata: Metadata = {
  title: 'Modifier Facture',
  description: 'Modifier une facture existante',
}

interface EditInvoiceProps {
  params: {
    id: string
  }
}

export default function EditInvoice({ params }: EditInvoiceProps) {
  return <InvoiceFormPage invoiceId={params.id} />
}
