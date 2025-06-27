'use client'

import { ProductFormPage } from '@/components/pages/products/product-form'

interface EditProductPageProps {
  params: {
    id: string
  }
}

export default function EditProduct({ params }: EditProductPageProps) {
  return <ProductFormPage mode="edit" productId={params.id} />
}
