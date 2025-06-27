'use client'

import { ClientDetailPage } from '@/components/pages/clients/client-detail'

interface ClientDetailPageProps {
  params: {
    id: string
  }
}

export default function ClientDetail({ params }: ClientDetailPageProps) {
  return <ClientDetailPage clientId={params.id} />
}
