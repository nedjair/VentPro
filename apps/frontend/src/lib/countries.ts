'use client'

/**
 * Pays principal de l'application pour les formulaires B2B locaux.
 *
 * Pourquoi : centraliser cette valeur évite les incohérences entre
 * les formulaires, les filtres et les valeurs par défaut backend.
 */
export const DEFAULT_BUSINESS_COUNTRY = 'Algérie' as const

/**
 * Liste courte de pays proposée dans les formulaires fournisseurs.
 *
 * On conserve une liste explicite et maintenable, avec le pays par défaut
 * en première position pour faciliter la saisie la plus fréquente.
 */
export const SUPPLIER_COUNTRY_OPTIONS = [
  DEFAULT_BUSINESS_COUNTRY,
  'France',
  'Belgique',
  'Suisse',
  'Luxembourg',
  'Allemagne',
  'Espagne',
  'Italie',
  'Royaume-Uni',
  'Autre',
] as const

/**
 * Valeur spéciale utilisée dans les filtres pour regrouper les pays hors marché principal.
 */
export const OTHER_COUNTRIES_FILTER = 'other' as const