'use client'

import { MainLayout } from '@/components/layout/main-layout'
import { PurchaseOrderForm } from '@/components/pages/purchase-orders/purchase-order-form'
import { useRouter } from 'next/navigation'

export default function NewPurchaseOrderPage() {
  const router = useRouter()

  const handleSuccess = () => {
    router.push('/purchase-orders')
  }

  const handleCancel = () => {
    router.push('/purchase-orders')
  }

  return (
    <MainLayout
      title="Nouvelle Commande d'Achat"
      subtitle="Créer une nouvelle commande fournisseur"
    >
      <PurchaseOrderForm
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </MainLayout>
  )
}
