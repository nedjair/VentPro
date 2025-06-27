'use client'

import { StockDetailPage } from '@/components/pages/stocks/stock-detail'

interface StockPageProps {
  params: {
    id: string
  }
}

export default function StockPage({ params }: StockPageProps) {
  return <StockDetailPage stockId={params.id} />
}
