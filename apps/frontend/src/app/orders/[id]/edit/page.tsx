import { Metadata } from 'next'
import { OrderFormPage } from '@/components/pages/orders/order-form'

export const metadata: Metadata = {
  title: 'Modifier Commande',
  description: 'Modifier une commande existante',
}

interface EditOrderProps {
  params: {
    id: string
  }
}

export default function EditOrder({ params }: EditOrderProps) {
  return <OrderFormPage orderId={params.id} />
}
