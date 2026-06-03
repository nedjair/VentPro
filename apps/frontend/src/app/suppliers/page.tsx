'use client'

import { Suspense } from 'react'
import { SuppliersPage } from '@/components/pages/suppliers'

export default function Suppliers() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Chargement des fournisseurs...</div>}>
      <SuppliersPage />
    </Suspense>
  )
}
