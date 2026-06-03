'use client'

import { Suspense } from 'react'
import { OrdersPage } from '@/components/pages/orders'

export default function Orders() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Chargement des commandes...</div>}>
      <OrdersPage />
    </Suspense>
  )
}
