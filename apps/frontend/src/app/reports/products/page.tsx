import { Metadata } from 'next'
import { ProductsReportPage } from '@/components/pages/reports/products-report'

export const metadata: Metadata = {
  title: 'Rapport des Produits',
  description: 'Analyse des produits - best-sellers, stock et marges',
}

export default function ProductsReport() {
  return <ProductsReportPage />
}
