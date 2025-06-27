import { Metadata } from 'next'
import { ClientsReportPage } from '@/components/pages/reports/clients-report'

export const metadata: Metadata = {
  title: 'Rapport des Clients',
  description: 'Analyse des clients - top clients, historique et segmentation',
}

export default function ClientsReport() {
  return <ClientsReportPage />
}
