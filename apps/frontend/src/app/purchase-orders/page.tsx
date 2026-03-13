'use client'

import { MainLayout } from '@/components/layout/main-layout'
import PurchaseOrdersPage from '@/components/pages/purchase-orders'

export default function PurchaseOrders() {
  return (
    <MainLayout
      title="Achats"
      subtitle="Gestion des achats et approvisionnements"
    >
      <PurchaseOrdersPage />
    </MainLayout>
  )
}