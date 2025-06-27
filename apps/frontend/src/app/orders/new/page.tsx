import { Metadata } from 'next'
import { OrderFormPage } from '@/components/pages/orders/order-form'

export const metadata: Metadata = {
  title: 'Nouvelle Commande',
  description: 'Créer une nouvelle commande ou devis',
}

export default function NewOrder() {
  return <OrderFormPage />
}
