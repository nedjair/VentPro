'use client'

import { ClientFormPage } from '@/components/pages/clients/client-form'

interface ClientEditPageProps {
  params: {
    id: string
  }
}

export default function ClientEditPage({ params }: ClientEditPageProps) {
  return <ClientFormPage mode="edit" clientId={params.id} />
}
