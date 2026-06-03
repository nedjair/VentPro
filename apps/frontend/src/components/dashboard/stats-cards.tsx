'use client'

import { Users, Package, DollarSign, ShoppingCart } from 'lucide-react'
// Définition locale pour éviter les erreurs d'importation
interface DashboardStats {
  totalClients: number;
  totalProducts: number;
  totalRevenue: number;
  totalOrders: number;
  revenueChange: number;
  clientsChange: number;
  ordersChange: number;
  productsChange: number;
  clients: {
    total: number;
    growth: number;
  };
  products: {
    total: number;
    lowStock: number;
    outOfStock: number;
  };
  sales: {
    month?: number;
    currentMonth?: number;
    growth: number;
  };
  orders: {
    pending: number;
    processing: number;
    completed: number;
    accepted?: number;
    total?: number;
  };
}
import { formatCurrency } from '@/lib/utils'

interface StatsCardsProps {
  stats: DashboardStats | null
  loading: boolean
}

export function StatsCards({ stats, loading }: StatsCardsProps) {
  const cards = [
    {
      title: 'Clients',
      value: stats?.clients?.total || 0,
      change: stats?.clients?.growth || 0,
      icon: Users,
      color: 'blue',
      suffix: '',
    },
    {
      title: 'Produits',
      value: stats?.products?.total || 0,
      change: 0,
      icon: Package,
      color: 'green',
      suffix: '',
      subtitle: stats ? (
        <div className="flex items-center space-x-2">
          {stats.products?.outOfStock > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              {stats.products.outOfStock} rupture
            </span>
          )}
          {stats.products?.lowStock > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              {stats.products.lowStock} stock bas
            </span>
          )}
          {(!stats.products?.outOfStock && !stats.products?.lowStock) && (
            <span className="text-green-600 text-xs">Tous les stocks OK</span>
          )}
        </div>
      ) : '',
    },
    {
      title: 'Ventes du mois',
      value: stats?.sales?.currentMonth ?? stats?.sales?.month ?? 0,
      change: stats?.sales?.growth || 0,
      icon: DollarSign,
      color: 'purple',
      suffix: '',
      format: 'currency',
    },
    {
      title: 'Commandes',
      value: stats?.orders?.pending || 0,
      change: 0,
      icon: ShoppingCart,
      color: 'yellow',
      suffix: '',
      subtitle: stats ? `${stats.orders?.accepted ?? 0} acceptées, ${stats.orders?.total ?? 0} total` : '',
    },
  ]

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    yellow: 'bg-yellow-100 text-yellow-600',
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => (
        <div key={card.title} className="card card-hover">
          <div className="p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${colorClasses[card.color as keyof typeof colorClasses]}`}>
                <card.icon className="h-6 w-6" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? (
                    <span className="animate-pulse">-</span>
                  ) : (
                    <>
                      {card.format === 'currency' 
                        ? formatCurrency(card.value)
                        : card.value.toLocaleString('fr-FR')
                      }
                      {card.suffix}
                    </>
                  )}
                </p>
                {card.change !== 0 && (
                  <p className={`text-xs ${card.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {loading ? (
                      <span className="animate-pulse">-</span>
                    ) : (
                      `${card.change > 0 ? '+' : ''}${card.change}% ce mois`
                    )}
                  </p>
                )}
                {card.subtitle && (
                  <div className="text-xs text-gray-500 mt-1">
                    {loading ? (
                      <span className="animate-pulse">-</span>
                    ) : (
                      card.subtitle
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
