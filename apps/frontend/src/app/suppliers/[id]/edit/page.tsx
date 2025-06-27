'use client'

import { SupplierFormPage } from '@/components/pages/suppliers/supplier-form'

interface EditSupplierPageProps {
  params: {
    id: string
  }
}

export default function EditSupplierPage({ params }: EditSupplierPageProps) {
  return <SupplierFormPage mode="edit" supplierId={params.id} />
}
