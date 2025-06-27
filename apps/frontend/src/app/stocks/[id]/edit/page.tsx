'use client'

import { StockFormPage } from '@/components/pages/stocks/stock-form'

interface StockEditPageProps {
  params: {
    id: string
  }
}

export default function StockEditPage({ params }: StockEditPageProps) {
  return <StockFormPage mode="edit" stockId={params.id} />
}
