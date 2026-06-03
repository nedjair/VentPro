'use client'

import { Package, Barcode } from 'lucide-react'

interface ProductIdentifiersProps {
  sku?: string
  barcode?: string
  reference?: string // Pour compatibilité avec l'ancien système
  layout?: 'horizontal' | 'vertical' | 'compact'
  showIcons?: boolean
  className?: string
}

/**
 * Composant pour afficher clairement la référence produit (SKU) et le code-barres
 * de manière distincte et bien séparée
 */
export function ProductIdentifiers({
  sku,
  barcode,
  reference,
  layout = 'vertical',
  showIcons = true,
  className = ''
}: ProductIdentifiersProps) {
  // Utiliser SKU en priorité, puis reference pour compatibilité
  const productReference = sku || reference

  if (layout === 'compact') {
    return (
      <div className={`text-xs space-y-1 ${className}`}>
        {productReference && (
          <div className="flex items-center gap-1">
            {showIcons && <Package className="h-3 w-3 text-gray-400" />}
            <span className="text-gray-500">REF:</span>
            <span className="font-medium text-gray-700">{productReference}</span>
          </div>
        )}
        {barcode && (
          <div className="flex items-center gap-1">
            {showIcons && <Barcode className="h-3 w-3 text-gray-400" />}
            <span className="text-gray-500">CODE:</span>
            <span className="font-mono text-gray-600">{barcode}</span>
          </div>
        )}
      </div>
    )
  }

  if (layout === 'horizontal') {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        {productReference && (
          <div className="flex items-center gap-2">
            {showIcons && <Package className="h-4 w-4 text-blue-500" />}
            <div>
              <span className="text-xs text-gray-500 block">Référence produit</span>
              <span className="text-sm font-medium text-gray-900">{productReference}</span>
            </div>
          </div>
        )}
        {barcode && (
          <div className="flex items-center gap-2">
            {showIcons && <Barcode className="h-4 w-4 text-green-500" />}
            <div>
              <span className="text-xs text-gray-500 block">Code-barres</span>
              <span className="text-sm font-mono text-gray-700">{barcode}</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Layout vertical (par défaut)
  return (
    <div className={`space-y-3 ${className}`}>
      {productReference && (
        <div className="flex items-start gap-2">
          {showIcons && <Package className="h-4 w-4 text-blue-500 mt-0.5" />}
          <div className="flex-1">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Référence produit (SKU)
            </div>
            <div className="text-sm font-medium text-gray-900 mt-1">
              {productReference}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Identifiant interne de votre entreprise
            </div>
          </div>
        </div>
      )}
      
      {barcode && (
        <div className="flex items-start gap-2">
          {showIcons && <Barcode className="h-4 w-4 text-green-500 mt-0.5" />}
          <div className="flex-1">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Code-barres
            </div>
            <div className="text-sm font-mono text-gray-700 mt-1 bg-gray-50 px-2 py-1 rounded">
              {barcode}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Code numérique standardisé (EAN-13, UPC, etc.)
            </div>
          </div>
        </div>
      )}
      
      {!productReference && !barcode && (
        <div className="text-sm text-gray-500 italic">
          Aucun identifiant défini
        </div>
      )}
    </div>
  )
}

/**
 * Composant simplifié pour l'affichage en ligne dans les listes
 */
export function ProductIdentifiersInline({
  sku,
  barcode,
  reference,
  className = ''
}: Pick<ProductIdentifiersProps, 'sku' | 'barcode' | 'reference' | 'className'>) {
  const productReference = sku || reference

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 w-12 flex-shrink-0">REF:</span>
        <span className="text-sm font-medium text-gray-900">
          {productReference || 'Non définie'}
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 w-12 flex-shrink-0">CODE:</span>
        <span className="text-xs font-mono text-gray-600">
          {barcode || 'Non défini'}
        </span>
      </div>
    </div>
  )
}

/**
 * Composant pour les badges d'identifiants
 */
export function ProductIdentifierBadges({
  sku,
  barcode,
  reference,
  className = ''
}: Pick<ProductIdentifiersProps, 'sku' | 'barcode' | 'reference' | 'className'>) {
  const productReference = sku || reference

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {productReference && (
        <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md">
          <Package className="h-3 w-3" />
          <span className="font-medium">REF:</span>
          <span>{productReference}</span>
        </div>
      )}
      
      {barcode && (
        <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs rounded-md">
          <Barcode className="h-3 w-3" />
          <span className="font-medium">CODE:</span>
          <span className="font-mono">{barcode}</span>
        </div>
      )}
    </div>
  )
}
