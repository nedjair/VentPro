'use client'

import { Category } from '@/lib/api'
import { Tag, Folder } from 'lucide-react'

interface CategoryDisplayProps {
  category?: Category | string | { id: string; name: string; description?: string } | null
  variant?: 'badge' | 'text' | 'full'
  showIcon?: boolean
  className?: string
  fallbackText?: string
}

/**
 * Composant pour afficher les catégories de produits de manière cohérente
 * Gère les différents formats de données (objet Category, string, ou null)
 */
export function CategoryDisplay({
  category,
  variant = 'badge',
  showIcon = true,
  className = '',
  fallbackText = 'Non catégorisé'
}: CategoryDisplayProps) {
  // Extraire le nom de la catégorie selon le type de données
  const getCategoryName = (): string => {
    if (!category) return fallbackText
    
    if (typeof category === 'string') {
      return category
    }
    
    if (typeof category === 'object' && category.name) {
      return category.name
    }
    
    return fallbackText
  }

  // Extraire la description si disponible
  const getCategoryDescription = (): string | undefined => {
    // `typeof null === 'object'` en JavaScript : on garde donc une garde explicite
    // pour éviter les erreurs runtime quand l'API renvoie `category: null`.
    if (category && typeof category === 'object' && category.description) {
      return category.description
    }
    return undefined
  }

  const categoryName = getCategoryName()
  const categoryDescription = getCategoryDescription()
  const hasCategory = category && categoryName !== fallbackText

  // Variante badge (par défaut)
  if (variant === 'badge') {
    return (
      <span 
        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${
          hasCategory 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-gray-100 text-gray-600'
        } ${className}`}
        title={categoryDescription}
      >
        {showIcon && (
          hasCategory 
            ? <Tag className="h-3 w-3" />
            : <Folder className="h-3 w-3" />
        )}
        {categoryName}
      </span>
    )
  }

  // Variante texte simple
  if (variant === 'text') {
    return (
      <span 
        className={`text-sm ${
          hasCategory 
            ? 'text-gray-900 font-medium' 
            : 'text-gray-500 italic'
        } ${className}`}
        title={categoryDescription}
      >
        {showIcon && (
          <span className="inline-flex items-center gap-1">
            {hasCategory 
              ? <Tag className="h-3 w-3" />
              : <Folder className="h-3 w-3" />
            }
            {categoryName}
          </span>
        )}
        {!showIcon && categoryName}
      </span>
    )
  }

  // Variante complète avec description
  if (variant === 'full') {
    return (
      <div className={`${className}`}>
        <div className="flex items-center gap-2">
          {showIcon && (
            hasCategory 
              ? <Tag className="h-4 w-4 text-blue-500" />
              : <Folder className="h-4 w-4 text-gray-400" />
          )}
          <span className={`text-sm font-medium ${
            hasCategory ? 'text-gray-900' : 'text-gray-500'
          }`}>
            {categoryName}
          </span>
        </div>
        {categoryDescription && (
          <p className="text-xs text-gray-500 mt-1 ml-6">
            {categoryDescription}
          </p>
        )}
      </div>
    )
  }

  return null
}

/**
 * Composant spécialisé pour l'affichage dans les listes de produits
 */
export function ProductCategoryBadge({
  category,
  className = ''
}: Pick<CategoryDisplayProps, 'category' | 'className'>) {
  return (
    <CategoryDisplay
      category={category}
      variant="badge"
      showIcon={true}
      className={className}
      fallbackText="Non catégorisé"
    />
  )
}

/**
 * Composant pour l'affichage dans les formulaires
 */
export function CategoryFormDisplay({
  category,
  className = ''
}: Pick<CategoryDisplayProps, 'category' | 'className'>) {
  return (
    <CategoryDisplay
      category={category}
      variant="full"
      showIcon={true}
      className={className}
      fallbackText="Aucune catégorie sélectionnée"
    />
  )
}

/**
 * Utilitaire pour extraire le nom d'une catégorie
 */
export function getCategoryName(category?: Category | string | null): string {
  if (!category) return 'Non catégorisé'
  
  if (typeof category === 'string') {
    return category
  }
  
  if (typeof category === 'object' && category.name) {
    return category.name
  }
  
  return 'Non catégorisé'
}

/**
 * Utilitaire pour vérifier si un produit a une catégorie
 */
export function hasCategory(category?: Category | string | null): boolean {
  if (!category) return false
  
  if (typeof category === 'string') {
    return category.trim().length > 0
  }
  
  if (typeof category === 'object') {
    return !!(category.name && category.name.trim().length > 0)
  }
  
  return false
}
