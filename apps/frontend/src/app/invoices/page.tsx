'use client'

import { Suspense } from 'react'
import { InvoicesPage } from '@/components/pages/invoices'

export default function Invoices() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Chargement des factures...</div>}>
      <InvoicesPage />
    </Suspense>
  )
}
