import { Metadata } from 'next'
import { SalesReportPage } from '@/components/pages/reports/sales-report'

export const metadata: Metadata = {
  title: 'Rapport des Ventes',
  description: 'Analyse détaillée des ventes par période avec graphiques',
}

export default function SalesReport() {
  return <SalesReportPage />
}
