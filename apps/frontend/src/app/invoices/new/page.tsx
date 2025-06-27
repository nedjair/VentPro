import { Metadata } from 'next'
import { InvoiceFormPage } from '@/components/pages/invoices/invoice-form'

export const metadata: Metadata = {
  title: 'Nouvelle Facture',
  description: 'Créer une nouvelle facture',
}

export default function NewInvoice() {
  return <InvoiceFormPage />
}
