import { Metadata } from 'next'
import { OrderDetailPage } from '@/components/pages/orders/order-detail'

export const metadata: Metadata = {
  title: 'Détail Commande',
  description: 'Détail d\'une commande avec historique et actions',
}

interface OrderDetailProps {
  params: {
    id: string
  }
}

export default function OrderDetail({ params }: OrderDetailProps) {
  return <OrderDetailPage orderId={params.id} />
}
