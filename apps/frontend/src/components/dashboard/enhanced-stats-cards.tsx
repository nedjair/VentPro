import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Package, 
  DollarSign, 
  ShoppingCart,
  FileEdit,
  CreditCard,
  ShoppingBag,
  Truck,
  AlertTriangle,
  CheckCircle,
  Clock,
  Send
} from 'lucide-react'

interface DashboardStats {
  clients: {
    total: number
    individuals: number
    companies: number
    recentCount: number
    growth?: number
  }
  products: {
    total: number
    inStock: number
    outOfStock: number
    lowStock: number
    totalStockValue: number
  }
  sales: {
    currentMonth: number
    previousMonth: number
    growth: number
    currency: string
  }
  orders: {
    total: number
    pending: number
    accepted: number
    rejected: number
    averageValue: number
  }
  invoices: {
    total: number
    paid: number
    pending: number
    overdue: number
    totalAmount: number
    paidAmount: number
    pendingAmount: number
  }
  lastUpdated: string
}

interface EnhancedStatsCardsProps {
  stats: Record<string, any> | null
  loading?: boolean
}

const EnhancedStatsCards: React.FC<EnhancedStatsCardsProps> = ({ stats, loading = false }) => {
  // Valeurs par défaut pour éviter les erreurs undefined
  const safeStats = {
    clients: {
      total: stats?.clients?.total ?? 0,
      individuals: stats?.clients?.individuals ?? 0,
      companies: stats?.clients?.companies ?? 0,
      recentCount: stats?.clients?.recentCount ?? 0,
      growth: stats?.clients?.growth ?? 0,
    },
    products: {
      total: stats?.products?.total ?? 0,
      inStock: stats?.products?.inStock ?? 0,
      outOfStock: stats?.products?.outOfStock ?? 0,
      lowStock: stats?.products?.lowStock ?? 0,
      totalStockValue: stats?.products?.totalStockValue ?? 0,
    },
    sales: {
      currentMonth: stats?.sales?.currentMonth ?? 0,
      previousMonth: stats?.sales?.previousMonth ?? 0,
      growth: stats?.sales?.growth ?? 0,
      currency: stats?.sales?.currency ?? 'DA',
    },
    orders: {
      total: stats?.orders?.total ?? 0,
      pending: stats?.orders?.pending ?? 0,
      accepted: stats?.orders?.accepted ?? 0,
      rejected: stats?.orders?.rejected ?? 0,
      averageValue: stats?.orders?.averageValue ?? 0,
    },
    invoices: {
      total: stats?.invoices?.total ?? 0,
      paid: stats?.invoices?.paid ?? 0,
      pending: stats?.invoices?.pending ?? 0,
      overdue: stats?.invoices?.overdue ?? 0,
      totalAmount: stats?.invoices?.totalAmount ?? 0,
      paidAmount: stats?.invoices?.paidAmount ?? 0,
      pendingAmount: stats?.invoices?.pendingAmount ?? 0,
    },
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-DZ', {
      style: 'currency',
      currency: 'DZD'
    }).format(amount || 0)
  }

  const formatChange = (change: number) => {
    const safeChange = change || 0
    const isPositive = safeChange >= 0
    const Icon = isPositive ? TrendingUp : TrendingDown
    const colorClass = isPositive ? 'text-primary' : 'text-destructive'

    return (
      <div className={`flex items-center gap-1 text-sm ${colorClass}`}>
        <Icon className="h-4 w-4" />
        {Math.abs(safeChange).toFixed(1)}%
      </div>
    )
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-secondary rounded mb-2"></div>
              <div className="h-8 bg-secondary rounded mb-2"></div>
              <div className="h-4 bg-secondary rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Clients */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/clients'}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Clients</p>
                <p className="text-2xl font-bold">{safeStats.clients.total.toLocaleString()}</p>
                {formatChange(safeStats.clients.growth)}
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Produits */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/products'}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Produits</p>
                <p className="text-2xl font-bold">{safeStats.products.total.toLocaleString()}</p>
                <div className="flex items-center gap-2 mt-1">
                  {safeStats.products.outOfStock > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {safeStats.products.outOfStock} rupture
                    </Badge>
                  )}
                  {safeStats.products.lowStock > 0 && (
                    <Badge variant="warning" className="text-xs">
                      {safeStats.products.lowStock} faible
                    </Badge>
                  )}
                </div>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <Package className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chiffre d'affaires */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">CA du mois</p>
                <p className="text-2xl font-bold">{formatCurrency(safeStats.sales.currentMonth)}</p>
                {formatChange(safeStats.sales.growth)}
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Commandes */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/orders'}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Commandes</p>
                <p className="text-2xl font-bold">{safeStats.orders.total.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {safeStats.orders.pending} en attente
                  </Badge>
                </div>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modules factures et stock */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Factures */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/invoices'}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Factures</p>
                <p className="text-2xl font-bold">{safeStats.invoices.total.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1">
                  {safeStats.invoices.paid > 0 && (
                    <Badge variant="success" className="text-xs flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      {safeStats.invoices.paid} payées
                    </Badge>
                  )}
                  {safeStats.invoices.overdue > 0 && (
                    <Badge variant="destructive" className="text-xs flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {safeStats.invoices.overdue} retard
                    </Badge>
                  )}
                </div>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <FileEdit className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stock */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/stock'}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Stock</p>
                <p className="text-2xl font-bold">{safeStats.products.inStock.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {formatCurrency(safeStats.products.totalStockValue)} valeur
                  </Badge>
                  {safeStats.products.outOfStock > 0 && (
                    <Badge variant="destructive" className="text-xs flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {safeStats.products.outOfStock} rupture
                    </Badge>
                  )}
                </div>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <Package className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clients détail */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Clients Détail</p>
                <p className="text-2xl font-bold">{safeStats.clients.individuals.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Badge variant="outline" className="text-xs">
                    Particuliers
                  </Badge>
                </div>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clients Entreprises */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Entreprises</p>
                <p className="text-2xl font-bold">{safeStats.clients.companies.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Badge variant="outline" className="text-xs">
                    Clients B2B
                  </Badge>
                </div>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <ShoppingBag className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default EnhancedStatsCards
