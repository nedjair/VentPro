'use client'

import { useMemo } from 'react'
import { BarChart3, Layers3, Medal, Package } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ProductAnalytics } from '@/lib/api'
import { formatCurrencyAmount, normalizeCurrencyCode } from '@/lib/currency'

interface DashboardProductsPanelProps {
  currency?: string | null
  productData?: ProductAnalytics | null
  loading?: boolean
  error?: string | null
}

interface ChartDatum {
  label: string
  value: number
  formattedValue: string
}

interface CategorySummary {
  category: string
  totalQuantity: number
  totalRevenue: number
  productCount: number
}

type ProductCategoryEntry = ProductAnalytics['categoryDistribution'][number]

const surfaceCardClass = 'rounded-[28px] border border-border/80 bg-white shadow-[0_18px_40px_rgba(19,33,54,0.08)]'

const rankingTones = [
  {
    badge: 'bg-gold-soft text-gold ring-1 ring-[rgba(198,168,106,0.22)]',
    bar: 'bg-[linear-gradient(90deg,#C6A86A,#E2C686)]',
  },
  {
    badge: 'bg-sky-50 text-sky-600 ring-1 ring-sky-100',
    bar: 'bg-[linear-gradient(90deg,#4D84DB,#6AA1F4)]',
  },
  {
    badge: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
    bar: 'bg-[linear-gradient(90deg,#94A3B8,#CBD5E1)]',
  },
]

const chartTones = {
  sky: {
    track: 'bg-sky-50',
    bar: 'bg-sky-300',
  },
  emerald: {
    track: 'bg-emerald-50',
    bar: 'bg-emerald-300',
  },
} as const

const truncateLabel = (label: string, maxLength = 22) => (label.length > maxLength ? `${label.slice(0, maxLength - 1)}…` : label)

// Repli défensif : si l'API ne retourne pas encore une vraie distribution catégories,
// on reconstruit un top lisible à partir des produits remontés.
const buildFallbackCategories = (topProducts: ProductAnalytics['topProducts']) => {
  const categoryMap = new Map<string, CategorySummary>()

  topProducts.forEach((product) => {
    const categoryName = product.category || 'Non catégorisé'
    const currentCategory = categoryMap.get(categoryName) || {
      category: categoryName,
      totalQuantity: 0,
      totalRevenue: 0,
      productCount: 0,
    }

    currentCategory.totalQuantity += product.totalQuantity
    currentCategory.totalRevenue += product.totalRevenue
    currentCategory.productCount += 1
    categoryMap.set(categoryName, currentCategory)
  })

  return Array.from(categoryMap.values()).sort((left, right) => right.totalQuantity - left.totalQuantity)
}

const normalizeCategoryEntry = (entry: ProductCategoryEntry): CategorySummary => {
  const normalizedEntry = entry as {
    category: string
    totalQuantity?: number
    totalRevenue?: number
    productCount?: number
    quantity?: number
    count?: number
    revenue?: number
  }

  return {
    category: normalizedEntry.category,
    totalQuantity: normalizedEntry.totalQuantity ?? normalizedEntry.quantity ?? normalizedEntry.count ?? 0,
    totalRevenue: normalizedEntry.totalRevenue ?? normalizedEntry.revenue ?? 0,
    productCount: normalizedEntry.productCount ?? 0,
  }
}

function VerticalBarChart({ title, data, tone }: { title: string; data: ChartDatum[]; tone: keyof typeof chartTones }) {
  const maxValue = Math.max(...data.map((item) => item.value), 0)
  const styles = chartTones[tone]

  return (
    <Card className={surfaceCardClass}>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold tracking-tight text-slate-950">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune donnée disponible pour ce graphique.</p>
        ) : (
          <div className="overflow-x-auto pb-3">
            <div className="flex min-w-[720px] items-end gap-4">
              {data.map((item) => {
                const barHeight = maxValue > 0 ? Math.max((item.value / maxValue) * 100, 10) : 10

                return (
                  <div key={item.label} className="flex min-w-[88px] flex-1 flex-col items-center gap-3">
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500 shadow-sm">
                      {item.formattedValue}
                    </span>
                    <div className={`flex h-64 w-full items-end rounded-[20px] border border-slate-100 ${styles.track} p-1.5`}>
                      <div className={`w-full rounded-[16px] ${styles.bar} transition-all`} style={{ height: `${barHeight}%` }} />
                    </div>
                    <span className="w-full text-center text-xs text-slate-500" title={item.label}>
                      {truncateLabel(item.label)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function DashboardProductsPanel({
  currency,
  productData,
  loading = false,
  error = null,
}: DashboardProductsPanelProps) {

  const safeCurrency = normalizeCurrencyCode(currency)

  const topProductsByQuantity = useMemo(() => [...(productData?.topProducts || [])].sort((left, right) => right.totalQuantity - left.totalQuantity), [productData])
  const topProductsByRevenue = useMemo(() => [...(productData?.topProducts || [])].sort((left, right) => right.totalRevenue - left.totalRevenue), [productData])

  const topCategories = useMemo<CategorySummary[]>(() => {
    const categories: CategorySummary[] = productData?.categoryDistribution?.length
      ? productData.categoryDistribution.map(normalizeCategoryEntry).sort((left, right) => right.totalQuantity - left.totalQuantity)
      : buildFallbackCategories(productData?.topProducts || [])

    return categories.slice(0, 3)
  }, [productData])

  const revenueChartData = useMemo<ChartDatum[]>(() => topProductsByRevenue.slice(0, 10).map((product) => ({
    label: product.name,
    value: product.totalRevenue,
    formattedValue: formatCurrencyAmount(product.totalRevenue, safeCurrency),
  })), [safeCurrency, topProductsByRevenue])

  const quantityChartData = useMemo<ChartDatum[]>(() => topProductsByQuantity.slice(0, 10).map((product) => ({
    label: product.name,
    value: product.totalQuantity,
    formattedValue: `${product.totalQuantity}`,
  })), [topProductsByQuantity])

  if (loading) {
    return (
      <Card className={surfaceCardClass}>
        <CardContent className="flex items-center justify-center py-12 text-sm text-slate-500">
          Chargement des rapports produits...
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="rounded-[26px] border border-red-200 bg-red-50 shadow-[0_14px_32px_rgba(239,68,68,0.08)]">
        <CardContent className="py-8 text-sm text-red-600">{error}</CardContent>
      </Card>
    )
  }

  if (!productData) {
    return (
      <Card className={surfaceCardClass}>
        <CardContent className="flex items-center justify-center py-12 text-sm text-slate-500">
          Aucun rapport produit disponible pour le moment.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-slate-500 shadow-sm">
          Période analysée : 3 derniers mois
        </Badge>
        <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-slate-500 shadow-sm">
          Source : ventes produits
        </Badge>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className={surfaceCardClass}>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight text-slate-950">
              <Package className="h-5 w-5 text-sky-500" />
              Classement des 3 meilleurs produits
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topProductsByQuantity.slice(0, 3).map((product, index) => {
              const tone = rankingTones[index % rankingTones.length]

              return (
                <div key={product.id} className="overflow-hidden rounded-[24px] border border-border/80 bg-white shadow-[0_10px_24px_rgba(19,33,54,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(19,33,54,0.08)]">
                  <div className="flex items-center justify-between gap-3 p-5">
                    <div>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone.badge}`}>
                        {index === 0 ? <Medal className="h-3.5 w-3.5" /> : null}
                        #{index + 1}
                      </span>
                      <p className="mt-3 text-sm font-semibold text-slate-950">{product.name}</p>
                      <p className="mt-1 text-xs text-slate-500">Catégorie : {product.category || 'Non catégorisé'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-slate-950">{product.totalQuantity}</p>
                      <p className="text-xs text-slate-500">unités vendues</p>
                    </div>
                </div>
                  <div className={`h-1.5 w-full ${tone.bar}`} />
              </div>
              )
            })}
          </CardContent>
        </Card>

        <Card className={surfaceCardClass}>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight text-slate-950">
              <Layers3 className="h-5 w-5 text-emerald-500" />
              Classement des 3 meilleures catégories
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topCategories.map((category, index) => {
              const tone = rankingTones[index % rankingTones.length]

              return (
                <div key={category.category} className="overflow-hidden rounded-[24px] border border-border/80 bg-white shadow-[0_10px_24px_rgba(19,33,54,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(19,33,54,0.08)]">
                  <div className="flex items-center justify-between gap-3 p-5">
                    <div>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone.badge}`}>
                        {index === 0 ? <Medal className="h-3.5 w-3.5" /> : null}
                        #{index + 1}
                      </span>
                      <p className="mt-3 text-sm font-semibold text-slate-950">{category.category}</p>
                      <p className="mt-1 text-xs text-slate-500">{category.productCount} produit(s) concernés</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-slate-950">{category.totalQuantity}</p>
                      <p className="text-xs text-slate-500">unités vendues</p>
                    </div>
                </div>
                  <div className={`h-1.5 w-full ${tone.bar}`} />
              </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <VerticalBarChart title="Meilleures ventes par chiffre d'affaires" data={revenueChartData} tone="sky" />
        <VerticalBarChart title="Meilleures ventes par unités vendues" data={quantityChartData} tone="emerald" />
      </div>

      <Card className={surfaceCardClass}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight text-slate-950">
            <BarChart3 className="h-5 w-5 text-violet-500" />
            Lecture rapide
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[22px] border border-sky-100 bg-sky-50/70 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <p className="text-sm text-slate-500">Produit leader</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{topProductsByRevenue[0]?.name || '—'}</p>
            <p className="mt-1 text-xs text-slate-500">Meilleur chiffre d'affaires produit</p>
          </div>
          <div className="rounded-[22px] border border-emerald-100 bg-emerald-50/70 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <p className="text-sm text-slate-500">Catégorie leader</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{topCategories[0]?.category || '—'}</p>
            <p className="mt-1 text-xs text-slate-500">Plus forte dynamique en unités vendues</p>
          </div>
          <div className="rounded-[22px] border border-violet-100 bg-violet-50/70 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <p className="text-sm text-slate-500">CA du produit n°1</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{topProductsByRevenue[0] ? formatCurrencyAmount(topProductsByRevenue[0].totalRevenue, safeCurrency) : '—'}</p>
            <p className="mt-1 text-xs text-slate-500">Indicateur utile pour le pilotage commercial</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}