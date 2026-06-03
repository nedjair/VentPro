import { Metadata } from 'next'
import { Suspense } from 'react'
import { OrderFormPage } from '@/components/pages/orders/order-form'

export const metadata: Metadata = {
  title: 'Nouvelle Commande',
  description: 'Créer une nouvelle commande',
}

export default function NewOrder() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Chargement du formulaire de commande...</div>}>
      <OrderFormPage />
    </Suspense>
  )
}
