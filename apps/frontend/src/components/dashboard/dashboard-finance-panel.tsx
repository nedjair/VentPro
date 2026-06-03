'use client'

import { useMemo, useState, type ComponentType } from 'react'
import { AlertCircle, AreaChart, Globe2, Layers3, ReceiptText, WalletCards } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Invoice, ProductAnalytics, SalesAnalytics } from '@/lib/api'
import { formatCurrencyAmount, normalizeCurrencyCode } from '@/lib/currency'

type FinanceInvoice = Invoice & {
  salesperson?: {
    name?: string
    email?: string
  }
  paidAmount?: number
  paidDate?: string
  invoiceDate?: string
  total?: number
}

interface FinanceStatsSnapshot {
  invoices: {
    total: number
    overdue: number
    totalAmount: number
    paidAmount: number
    pendingAmount: number
  }
}

interface DashboardFinancePanelProps {
  currency?: string | null
  stats?: FinanceStatsSnapshot | null
  invoices?: FinanceInvoice[]
  salesData?: SalesAnalytics | null
  productData?: ProductAnalytics | null
  loading?: boolean
  error?: string | null
}

interface RankingRow {
  label: string
  value: number
  ratio: number
}

interface TrendDatum {
  label: string
  shortLabel: string
  value: number
  helper: string
}

const surfaceCardClass = 'rounded-[28px] border border-border/80 bg-white shadow-[0_18px_40px_rgba(19,33,54,0.08)]'

function FinanceEmptyState({
  title,
  description,
  compact = false,
}: {
  title: string
  description: string
  compact?: boolean
}) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 text-center ${compact ? 'px-5 py-8' : 'px-6 py-12'}`}>
      <div className="rounded-2xl bg-white p-3 text-slate-400 shadow-sm">
        <AlertCircle className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-2 max-w-md text-sm text-slate-500">{description}</p>
    </div>
  )
}

const getInvoiceClientLabel = (invoice: FinanceInvoice) => {
  if (invoice.client?.companyName) {
    return invoice.client.companyName
  }

  const fullName = `${invoice.client?.firstName || ''} ${invoice.client?.lastName || ''}`.trim()
  return fullName || invoice.client?.email || 'Client non renseigné'
}

const getInvoiceStatusMeta = (status: FinanceInvoice['status']) => {
  switch (status) {
    case 'PAID':
      return { label: 'Payée', className: 'border-emerald-200 bg-emerald-50 text-emerald-600' }
    case 'PARTIAL':
      return { label: 'Partiellement payée', className: 'border-amber-200 bg-amber-50 text-amber-600' }
    case 'OVERDUE':
      return { label: 'En retard', className: 'border-rose-200 bg-rose-50 text-rose-500' }
    case 'SENT':
      return { label: 'Envoyée', className: 'border-sky-200 bg-sky-50 text-sky-600' }
    case 'CANCELLED':
      return { label: 'Annulée', className: 'border-slate-200 bg-slate-100 text-slate-500' }
    default:
      return { label: 'Brouillon', className: 'border-slate-200 bg-slate-100 text-slate-500' }
  }
}

// Repli défensif : la donnée peut venir du backend recentré ventes,
// ou rester absente sur d'anciens enregistrements.
const getSalespersonLabel = (invoice: FinanceInvoice) => invoice.salesperson?.name || invoice.salesperson?.email || 'Non attribué'

// Repli défensif : l'API facture n'expose pas toujours explicitement le pays,
// on tente donc d'utiliser le champ dédié puis le dernier segment d'adresse.
const getCountryLabel = (invoice: FinanceInvoice) => {
  const explicitCountry = invoice.client?.country?.trim()
  if (explicitCountry) {
    return explicitCountry
  }

  const addressTokens = (invoice.client?.address || '').split(',').map((token) => token.trim()).filter(Boolean)
  return addressTokens[addressTokens.length - 1] || 'Non renseigné'
}

const getAverageCollectionDelay = (invoices: FinanceInvoice[]) => {
  const delays = invoices.map((invoice) => {
    const referenceInvoiceDate = invoice.invoiceDate || invoice.dueDate || invoice.createdAt
    const invoiceDate = new Date(referenceInvoiceDate).getTime()
    const endDate = new Date(invoice.paidDate || invoice.dueDate || referenceInvoiceDate).getTime()

    if (!Number.isFinite(invoiceDate) || !Number.isFinite(endDate)) {
      return null
    }

    return Math.max(0, Math.round((endDate - invoiceDate) / (1000 * 60 * 60 * 24)))
  }).filter((value): value is number => value !== null)

  if (!delays.length) {
    return 0
  }

  return delays.reduce((sum, value) => sum + value, 0) / delays.length
}

const buildRanking = (entries: Array<{ label: string; value: number }>) => {
  const totals = new Map<string, number>()

  entries.forEach((entry) => {
    totals.set(entry.label, (totals.get(entry.label) || 0) + entry.value)
  })

  const grandTotal = Array.from(totals.values()).reduce((sum, value) => sum + value, 0)

  return Array.from(totals.entries())
    .map(([label, value]) => ({
      label,
      value,
      ratio: grandTotal > 0 ? (value / grandTotal) * 100 : 0,
    }))
    .sort((left, right) => right.value - left.value)
}

const formatMonthLabel = (value: string) => {
  if (/^[0-9]{4}-[0-9]{2}$/.test(value)) {
    return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(`${value}-01T00:00:00`))
  }

  const parsedDate = new Date(value)
  if (!Number.isNaN(parsedDate.getTime())) {
    return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(parsedDate)
  }

  return value
}

const formatMonthShortLabel = (value: string) => {
  if (/^[0-9]{4}-[0-9]{2}$/.test(value)) {
    return new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(`${value}-01T00:00:00`))
  }

  const parsedDate = new Date(value)
  if (!Number.isNaN(parsedDate.getTime())) {
    return new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(parsedDate)
  }

  return value
}

const getRoundedMaxValue = (value: number) => {
  if (value <= 0) {
    return 100
  }

  const magnitude = 10 ** Math.max(String(Math.floor(value)).length - 1, 0)
  return Math.ceil(value / magnitude) * magnitude
}

const getAxisTicks = (maxValue: number, steps = 4) => {
  const roundedMax = getRoundedMaxValue(maxValue)
  return Array.from({ length: steps + 1 }, (_, index) => (roundedMax / steps) * (steps - index))
}

function FinanceTrendChart({ data, currency }: { data: TrendDatum[]; currency: string }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const maxValue = Math.max(...data.map((item) => item.value), 0)
  const chartMaxValue = getRoundedMaxValue(maxValue)
  const ticks = getAxisTicks(maxValue)
  const width = 100
  const height = 56
  const padding = 7

  const points = data.map((item, index) => {
    const x = data.length === 1 ? width / 2 : padding + ((width - padding * 2) * index) / (data.length - 1)
    const y = height - padding - ((Math.max(item.value, 0) / Math.max(chartMaxValue, 1)) * (height - padding * 2))
    return `${x},${y}`
  }).join(' ')

  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`
  const activeDatum = data[activeIndex ?? Math.max(data.length - 1, 0)]

  const summary = useMemo(() => {
    if (!data.length) {
      return { average: 0, bestMonth: null as TrendDatum | null }
    }

    const average = data.reduce((sum, item) => sum + item.value, 0) / data.length
    const bestMonth = [...data].sort((left, right) => right.value - left.value)[0] || null
    return { average, bestMonth }
  }, [data])

  return (
    <Card className={surfaceCardClass}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight text-slate-950">
          <AreaChart className="h-5 w-5 text-sky-500" />
          Facturé par mois
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <FinanceEmptyState
            title="Aucune évolution mensuelle disponible"
            description="Ajoutez ou synchronisez des factures sur la période sélectionnée pour alimenter la courbe de facturation."
          />
        ) : (
          <div className="space-y-5 overflow-x-auto">
            <div className="min-w-[720px] rounded-[24px] border border-sky-100 bg-[linear-gradient(180deg,rgba(240,249,255,0.95),rgba(255,255,255,1))] p-5">
              <div className="mb-5 grid gap-4 lg:grid-cols-[84px_minmax(0,1fr)]">
                <div className="flex h-72 flex-col justify-between text-xs text-slate-400">
                  {ticks.map((tick) => (
                    <span key={tick}>{formatCurrencyAmount(tick, currency)}</span>
                  ))}
                </div>

                <div className="relative h-72">
                  <div className="absolute inset-0 flex flex-col justify-between py-[6px]">
                    {ticks.map((tick) => (
                      <div key={tick} className="border-t border-dashed border-sky-100" />
                    ))}
                  </div>

                  <svg viewBox={`0 0 ${width} ${height}`} className="relative z-10 h-72 w-full" preserveAspectRatio="none" aria-hidden="true">
                    <defs>
                      <linearGradient id="financeAreaFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#93C5FD" stopOpacity="0.08" />
                      </linearGradient>
                    </defs>
                    <path d={`M ${padding} ${height - padding} H ${width - padding}`} stroke="#CBD5E1" strokeWidth="0.5" fill="none" />
                    <polygon points={areaPoints} fill="url(#financeAreaFill)" />
                    <polyline points={points} fill="none" stroke="#93C5FD" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" />
                    {data.map((item, index) => {
                      const x = data.length === 1 ? width / 2 : padding + ((width - padding * 2) * index) / (data.length - 1)
                      const y = height - padding - ((Math.max(item.value, 0) / Math.max(chartMaxValue, 1)) * (height - padding * 2))
                      const isActive = index === (activeIndex ?? data.length - 1)

                      return (
                        <g key={item.label}>
                          <circle cx={x} cy={y} r={isActive ? '1.5' : '1.1'} fill="#DBEAFE" stroke="#60A5FA" strokeWidth={isActive ? '0.6' : '0.4'} />
                          <circle
                            cx={x}
                            cy={y}
                            r="3.5"
                            fill="transparent"
                            onMouseEnter={() => setActiveIndex(index)}
                            onFocus={() => setActiveIndex(index)}
                          />
                        </g>
                      )
                    })}
                  </svg>

                  {activeDatum && (
                    <div className="absolute right-4 top-4 z-20 rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-[0_14px_30px_rgba(19,33,54,0.12)] backdrop-blur">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Mois actif</p>
                      <p className="mt-1 text-sm font-semibold text-slate-950">{activeDatum.label}</p>
                      <p className="mt-2 text-lg font-semibold text-sky-600">{formatCurrencyAmount(activeDatum.value, currency)}</p>
                      <p className="mt-1 text-xs text-slate-500">{activeDatum.helper}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-6">
                {data.map((item) => (
                  <div key={item.label} className="rounded-2xl bg-white/80 p-3 shadow-sm">
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">{item.shortLabel}</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">{formatCurrencyAmount(item.value, currency)}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.helper}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm">
                  <p className="text-sm text-slate-500">Moyenne mensuelle</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{formatCurrencyAmount(summary.average, currency)}</p>
                  <p className="mt-1 text-xs text-slate-500">Vision synthétique pour suivre la cadence de facturation.</p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm">
                  <p className="text-sm text-slate-500">Meilleur mois</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{summary.bestMonth?.label || '—'}</p>
                  <p className="mt-1 text-xs text-slate-500">{summary.bestMonth ? formatCurrencyAmount(summary.bestMonth.value, currency) : 'Aucune donnée exploitable'}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RankingTable({
  title,
  icon,
  rows,
  currency,
  valueHeader,
  emptyMessage,
}: {
  title: string
  icon: ComponentType<{ className?: string }>
  rows: RankingRow[]
  currency: string
  valueHeader: string
  emptyMessage: string
}) {
  const Icon = icon

  return (
    <Card className={surfaceCardClass}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight text-slate-950">
          <Icon className="h-5 w-5 text-teal-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="p-6">
            <FinanceEmptyState title={`Aucun classement pour ${title.toLowerCase()}`} description={emptyMessage} compact />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-y border-border bg-slate-50/80 text-left text-[11px] uppercase tracking-[0.14em] text-slate-400">
                  <th className="px-6 py-4 font-semibold">Libellé</th>
                  <th className="px-6 py-4 font-semibold">{valueHeader}</th>
                  <th className="px-6 py-4 font-semibold">Ratio</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-b border-border/70 text-sm transition-colors hover:bg-slate-50/70">
                    <td className="px-6 py-4 font-medium text-slate-900">{row.label}</td>
                    <td className="px-6 py-4 font-semibold text-slate-950">{formatCurrencyAmount(row.value, currency)}</td>
                    <td className="px-6 py-4 text-slate-500">{row.ratio.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function DashboardFinancePanel({
  currency,
  stats,
  invoices = [],
  salesData,
  productData,
  loading = false,
  error = null,
}: DashboardFinancePanelProps) {
  const safeCurrency = normalizeCurrencyCode(currency)

  const topInvoices = useMemo(() => [...invoices]
    .sort((left, right) => Number(right.total || 0) - Number(left.total || 0))
    .slice(0, 5), [invoices])

  const monthlyData = useMemo<TrendDatum[]>(() => (salesData?.monthlyRevenue || []).slice(-6).map((month) => ({
    label: formatMonthLabel(month.month),
    shortLabel: formatMonthShortLabel(month.month),
    value: month.revenue,
    helper: `${month.invoiceCount} facture(s)`,
  })), [salesData])

  const topCountries = useMemo(() => buildRanking(invoices.map((invoice) => ({
    label: getCountryLabel(invoice),
    value: Number(invoice.total || 0),
  }))).slice(0, 5), [invoices])

  const topCategories = useMemo(() => {
    if (productData?.categoryDistribution?.length) {
      const total = productData.categoryDistribution.reduce((sum, category) => sum + Number(category.totalRevenue || 0), 0)

      return [...productData.categoryDistribution]
        .map((category) => ({
          label: typeof category.category === 'string'
            ? category.category
            : category.category?.name || 'Non catégorisé',
          value: Number(category.totalRevenue || 0),
          ratio: total > 0 ? (Number(category.totalRevenue || 0) / total) * 100 : 0,
        }))
        .sort((left, right) => right.value - left.value)
        .slice(0, 5)
    }

    return buildRanking(invoices.flatMap((invoice) => invoice.items.map((item) => ({
      label: item.product?.category?.name || item.product?.name || 'Non catégorisé',
      value: item.quantity * item.unitPrice,
    })))).slice(0, 5)
  }, [invoices, productData])

  const averageInvoiceAmount = stats?.invoices.total ? stats.invoices.totalAmount / Math.max(stats.invoices.total, 1) : 0
  const averageCollectionDelay = useMemo(() => getAverageCollectionDelay(invoices), [invoices])

  if (loading) {
    return (
      <Card className={surfaceCardClass}>
        <CardContent className="flex items-center justify-center py-12 text-sm text-slate-500">
          Chargement des rapports financiers...
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

  if (!stats && invoices.length === 0 && !salesData) {
    return (
      <Card className={surfaceCardClass}>
        <CardContent className="p-6">
          <FinanceEmptyState
            title="Aucun rapport financier disponible"
            description="La feuille Finances sera alimentée dès que des factures, des paiements ou des historiques de facturation seront disponibles."
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-slate-500 shadow-sm">
          Période analysée : 6 derniers mois
        </Badge>
        <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-slate-500 shadow-sm">
          Source : factures · encaissements · catégories produits
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-[24px] border border-slate-200/80 bg-slate-50/70 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
          <CardContent className="flex items-start justify-between p-6">
            <div>
              <p className="text-sm font-medium text-slate-500">Facturé</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{formatCurrencyAmount(stats?.invoices.totalAmount || 0, safeCurrency)}</p>
              <p className="mt-2 text-sm text-slate-400">{formatCurrencyAmount(stats?.invoices.pendingAmount || 0, safeCurrency)} non encaissé</p>
            </div>
            <div className="rounded-2xl bg-white p-3 text-sky-600 shadow-sm"><ReceiptText className="h-5 w-5" /></div>
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border border-slate-200/80 bg-slate-50/70 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
          <CardContent className="flex items-start justify-between p-6">
            <div>
              <p className="text-sm font-medium text-slate-500">Facture moyenne</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{formatCurrencyAmount(averageInvoiceAmount, safeCurrency)}</p>
              <p className="mt-2 text-sm text-slate-400">{stats?.invoices.total || 0} facture(s) suivie(s)</p>
            </div>
            <div className="rounded-2xl bg-white p-3 text-emerald-600 shadow-sm"><WalletCards className="h-5 w-5" /></div>
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border border-rose-100 bg-rose-50/50 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
          <CardContent className="flex items-start justify-between p-6">
            <div>
              <p className="text-sm font-medium text-slate-500">Délai moyen de règlement</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{Math.round(averageCollectionDelay)} jours</p>
              <p className="mt-2 text-sm text-slate-400">{stats?.invoices.overdue || 0} facture(s) en retard</p>
            </div>
            <div className="rounded-2xl bg-white p-3 text-rose-500 shadow-sm"><AreaChart className="h-5 w-5" /></div>
          </CardContent>
        </Card>
      </div>

      <FinanceTrendChart data={monthlyData} currency={safeCurrency} />

      <Card className={surfaceCardClass}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight text-slate-950">
            <ReceiptText className="h-5 w-5 text-teal-600" />
            Meilleures factures
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-y border-border bg-slate-50/80 text-left text-[11px] uppercase tracking-[0.14em] text-slate-400">
                  <th className="px-6 py-4 font-semibold">Référence</th>
                  <th className="px-6 py-4 font-semibold">Commercial</th>
                  <th className="px-6 py-4 font-semibold">Statut</th>
                  <th className="px-6 py-4 font-semibold">Client</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Montant</th>
                  <th className="px-6 py-4 font-semibold">Reste à encaisser</th>
                </tr>
              </thead>
              <tbody>
                {topInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-6">
                      <FinanceEmptyState
                        title="Aucune facture stratégique disponible"
                        description="Les meilleures factures apparaîtront ici dès que des factures seront créées ou synchronisées sur la période analysée."
                        compact
                      />
                    </td>
                  </tr>
                ) : topInvoices.map((invoice) => {
                  const status = getInvoiceStatusMeta(invoice.status)
                  const outstandingAmount = Math.max(Number(invoice.total || 0) - Number(invoice.paidAmount || 0), 0)

                  return (
                    <tr key={invoice.id} className="border-b border-border/70 text-sm transition-colors hover:bg-slate-50/70">
                      <td className="px-6 py-4 font-semibold text-[#2F6ED2]">{invoice.number}</td>
                      <td className="px-6 py-4 text-slate-500">{getSalespersonLabel(invoice)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-800">{getInvoiceClientLabel(invoice)}</td>
                      <td className="px-6 py-4 text-slate-500">{invoice.invoiceDate ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(invoice.invoiceDate)) : '—'}</td>
                      <td className="px-6 py-4 font-semibold text-slate-950">{formatCurrencyAmount(Number(invoice.total || 0), safeCurrency)}</td>
                      <td className="px-6 py-4 text-slate-500">{formatCurrencyAmount(outstandingAmount, safeCurrency)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <RankingTable
          title="Meilleurs pays"
          icon={Globe2}
          rows={topCountries}
          currency={safeCurrency}
          valueHeader="Montant"
          emptyMessage="Ajoutez le pays dans vos fiches clients pour obtenir une ventilation géographique exploitable."
        />
        <RankingTable
          title="Meilleures catégories"
          icon={Layers3}
          rows={topCategories}
          currency={safeCurrency}
          valueHeader="Montant"
          emptyMessage="Les catégories apparaîtront dès que les lignes de facture ou les analytics produits remonteront une ventilation exploitable."
        />
      </div>
    </div>
  )
}
