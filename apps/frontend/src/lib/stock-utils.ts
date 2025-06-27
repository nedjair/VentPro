import { AlertTriangle, Package, TrendingDown } from 'lucide-react'

/**
 * Interface pour le statut de stock
 */
export interface StockStatus {
  status: 'rupture' | 'faible' | 'normal' | 'non-suivi'
  label: string
  color: string
  bgColor: string
  textColor: string
  icon: any
  priority: number // Pour le tri (1 = plus urgent)
}

/**
 * Interface pour un produit avec stock
 */
export interface ProductWithStock {
  id: string
  name: string
  stockQuantity: number
  minStock: number
  maxStock?: number | null
  isService?: boolean
  isActive?: boolean
  unit?: string
}

/**
 * Calcule le statut de stock d'un produit de manière cohérente
 * avec les alertes du tableau de bord
 */
export function calculateStockStatus(product: ProductWithStock): StockStatus {
  // Si c'est un service, pas de suivi de stock
  if (product.isService) {
    return {
      status: 'non-suivi',
      label: 'Non suivi',
      color: 'gray',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800',
      icon: Package,
      priority: 4
    }
  }

  // Rupture de stock (stockQuantity = 0)
  if (product.stockQuantity === 0) {
    return {
      status: 'rupture',
      label: 'Rupture',
      color: 'red',
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      icon: AlertTriangle,
      priority: 1
    }
  }

  // Stock faible (stockQuantity > 0 ET stockQuantity <= minStock)
  if (product.stockQuantity > 0 && product.stockQuantity <= product.minStock) {
    return {
      status: 'faible',
      label: 'Stock faible',
      color: 'orange',
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-800',
      icon: TrendingDown,
      priority: 2
    }
  }

  // Stock normal (stockQuantity > minStock)
  return {
    status: 'normal',
    label: 'Stock normal',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    icon: Package,
    priority: 3
  }
}

/**
 * Obtient les classes CSS pour l'affichage du badge de statut
 */
export function getStockStatusClasses(status: StockStatus): string {
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium'
  
  switch (status.status) {
    case 'rupture':
      return `${baseClasses} bg-red-100 text-red-800`
    case 'faible':
      return `${baseClasses} bg-orange-100 text-orange-800`
    case 'normal':
      return `${baseClasses} bg-green-100 text-green-800`
    case 'non-suivi':
      return `${baseClasses} bg-gray-100 text-gray-800`
    default:
      return `${baseClasses} bg-gray-100 text-gray-800`
  }
}

/**
 * Obtient l'icône pour le statut de stock
 */
export function getStockStatusIcon(status: StockStatus) {
  return status.icon
}

/**
 * Filtre les produits par statut de stock
 */
export function filterProductsByStockStatus(
  products: ProductWithStock[], 
  statusFilter: 'all' | 'rupture' | 'faible' | 'normal' | 'non-suivi'
): ProductWithStock[] {
  if (statusFilter === 'all') {
    return products
  }

  return products.filter(product => {
    const status = calculateStockStatus(product)
    return status.status === statusFilter
  })
}

/**
 * Trie les produits par priorité de stock (plus urgent en premier)
 */
export function sortProductsByStockPriority(products: ProductWithStock[]): ProductWithStock[] {
  return [...products].sort((a, b) => {
    const statusA = calculateStockStatus(a)
    const statusB = calculateStockStatus(b)
    
    // Tri par priorité (1 = plus urgent)
    if (statusA.priority !== statusB.priority) {
      return statusA.priority - statusB.priority
    }
    
    // Si même priorité, trier par quantité (plus faible en premier)
    if (statusA.status === 'faible' && statusB.status === 'faible') {
      return a.stockQuantity - b.stockQuantity
    }
    
    // Sinon, tri alphabétique par nom
    return a.name.localeCompare(b.name)
  })
}

/**
 * Obtient les statistiques de stock pour un ensemble de produits
 */
export function getStockStatistics(products: ProductWithStock[]) {
  const stats = {
    total: products.length,
    rupture: 0,
    faible: 0,
    normal: 0,
    nonSuivi: 0
  }

  products.forEach(product => {
    const status = calculateStockStatus(product)
    switch (status.status) {
      case 'rupture':
        stats.rupture++
        break
      case 'faible':
        stats.faible++
        break
      case 'normal':
        stats.normal++
        break
      case 'non-suivi':
        stats.nonSuivi++
        break
    }
  })

  return stats
}

/**
 * Formate l'affichage de la quantité de stock
 */
export function formatStockQuantity(product: ProductWithStock): string {
  if (product.isService) {
    return 'Non suivi'
  }
  
  const unit = product.unit || 'unité'
  const quantity = product.stockQuantity || 0
  
  return `${quantity} ${unit}${quantity > 1 ? 's' : ''}`
}

/**
 * Formate l'affichage des seuils de stock
 */
export function formatStockThresholds(product: ProductWithStock): string {
  if (product.isService) {
    return 'Non applicable'
  }
  
  const min = product.minStock || 0
  const max = product.maxStock
  
  if (max) {
    return `Min: ${min} • Max: ${max}`
  }
  
  return `Min: ${min}`
}

/**
 * Vérifie si un produit nécessite une alerte de stock
 */
export function needsStockAlert(product: ProductWithStock): boolean {
  if (product.isService) {
    return false
  }
  
  const status = calculateStockStatus(product)
  return status.status === 'rupture' || status.status === 'faible'
}

/**
 * Obtient le message d'alerte pour un produit
 */
export function getStockAlertMessage(product: ProductWithStock): string | null {
  if (!needsStockAlert(product)) {
    return null
  }
  
  const status = calculateStockStatus(product)
  
  if (status.status === 'rupture') {
    return `${product.name} est en rupture de stock`
  }
  
  if (status.status === 'faible') {
    return `${product.name} a un stock faible (${product.stockQuantity}/${product.minStock})`
  }
  
  return null
}
