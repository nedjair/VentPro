import { Metadata } from 'next'
import { AnalyticsPage } from '@/components/pages/analytics'

export const metadata: Metadata = {
  title: 'Analytics - Gestion Commerciale',
  description: 'Tableaux de bord et analyses avancées pour votre activité commerciale',
}

export default function Analytics() {
  return <AnalyticsPage />
}
