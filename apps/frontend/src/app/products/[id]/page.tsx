'use client'

import { ProductDetailsPage } from '@/components/pages/products/product-details'

interface ProductPageProps {
  params: {
    id: string
  }
}

export default function ProductPage({ params }: ProductPageProps) {
  return <ProductDetailsPage productId={params.id} />
}
