/**
 * Utilitaires de programmation défensive pour l'application de gestion commerciale
 * Ces fonctions garantissent la robustesse des opérations sur les données
 */
import React from 'react'

// Types de base pour la validation
export type SafeArray<T> = T[]
export type ValidationResult<T> = {
  isValid: boolean
  data: T
  error?: string
}

// Validateurs pour différents types de données
export const validators = {
  isString: (value: unknown): value is string => typeof value === 'string',
  isNumber: (value: unknown): value is number => typeof value === 'number' && !isNaN(value),
  isBoolean: (value: unknown): value is boolean => typeof value === 'boolean',
  isObject: (value: unknown): value is object => typeof value === 'object' && value !== null,
  isArray: (value: unknown): value is unknown[] => Array.isArray(value),
  isDate: (value: unknown): value is Date => value instanceof Date && !isNaN(value.getTime()),
  
  // Validators spécifiques pour les types de l'application
  isOrderArray: (data: unknown): data is any[] => {
    // Accepter tout tableau, même vide
    if (Array.isArray(data)) {
      console.log('✅ Validator Orders: tableau détecté avec', data.length, 'éléments')
      return true
    }
    console.warn('⚠️ Validator Orders: données non-tableau détectées')
    return false
  },

  isClientArray: (data: unknown): data is any[] => {
    // Accepter tout tableau, même vide
    if (Array.isArray(data)) {
      console.log('✅ Validator Clients: tableau détecté avec', data.length, 'éléments')
      return true
    }
    console.warn('⚠️ Validator Clients: données non-tableau détectées')
    return false
  },

  isProductArray: (data: unknown): data is any[] => {
    // Accepter tout tableau, même vide
    if (Array.isArray(data)) {
      console.log('✅ Validator Products: tableau détecté avec', data.length, 'éléments')
      return true
    }
    console.warn('⚠️ Validator Products: données non-tableau détectées')
    return false
  }
}

// Fonction pour créer un état initial sécurisé pour les tableaux
export function createSafeArrayInitialState<T>(initialValue: T[] = []): T[] {
  return initialValue
}

/**
 * Assure qu'une valeur est un tableau valide
 * @param value - La valeur à vérifier
 * @returns Tableau valide garanti
 */
export function ensureArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[]
  }
  
  console.warn('⚠️ Valeur non-tableau détectée:', typeof value, value)
  return []
}

/**
 * Filtre sécurisé avec validation préalable
 * @param array - Tableau à filtrer
 * @param predicate - Fonction de filtrage

 * @returns Tableau filtré
 */
export function safeFilter<T>(
  array: unknown, 
  predicate: (item: T) => boolean
): T[] {
  const safeArray = ensureArray<T>(array)
  
  try {
    return safeArray.filter(predicate)
  } catch (error) {
    console.error('❌ Erreur lors du filtrage:', error)
    return []
  }
}

/**
 * Map sécurisé avec validation préalable
 * @param array - Tableau à mapper
 * @param mapper - Fonction de mapping
 * @param fallback - Tableau de fallback
 * @returns Tableau mappé ou fallback
 */
export function safeMap<T, U>(
  array: unknown,
  mapper: (item: T) => U,
  fallback: U[] = []
): U[] {
  const safeArray = ensureArray<T>(array)
  
  try {
    return safeArray.map(mapper)
  } catch (error) {
    console.error('❌ Erreur lors du mapping:', error)
    return fallback
  }
}

/**
 * Trouve un élément dans un tableau de façon sécurisée
 * @param array - Tableau dans lequel chercher
 * @param predicate - Fonction de recherche
 * @returns L'élément trouvé ou undefined
 */
export function safeFind<T>(
  array: unknown,
  predicate: (item: T) => boolean
): T | undefined {
  const safeArray = ensureArray<T>(array)
  
  try {
    return safeArray.find(predicate)
  } catch (error) {
    console.error('❌ Erreur lors de la recherche:', error)
    return undefined
  }
}

/**
 * Formate une date de façon sécurisée
 * @param date - Date à formater
 * @param locale - Locale à utiliser (par défaut: 'fr-FR')
 * @param fallback - Valeur de fallback si la date est invalide
 * @returns Date formatée ou fallback
 */
export function safeFormatDate(
  date: string | Date | undefined,
  locale: string = 'fr-FR',
  fallback: string = '-'
): string {
  if (!date) return fallback
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return fallback
    
    return dateObj.toLocaleDateString(locale)
  } catch (error) {
    console.error('❌ Erreur lors du formatage de la date:', error)
    return fallback
  }
}

/**
 * Rendu sécurisé de texte avec fallback
 * @param text - Texte à rendre
 * @param fallback - Texte de fallback
 * @returns Texte sécurisé
 */
export function safeTextRender(
  text: string | null | undefined,
  fallback: string = '-'
): string {
  if (text === null || text === undefined || text === '') {
    return fallback
  }
  return text
}

/**
 * Validation de données avec résultat typé
 * @param data - Données à valider
 * @param validator - Fonction de validation
 * @param fallback - Valeur de fallback
 * @returns Résultat de validation
 */
export function validateData<T>(
  data: unknown,
  validator: (value: unknown) => boolean,
  fallback: T
): ValidationResult<T> {
  try {
    if (validator(data)) {
      return {
        isValid: true,
        data: data as T
      }
    } else {
      console.warn('⚠️ Validation échouée:', typeof data, data)
      return {
        isValid: false,
        data: fallback,
        error: 'Format de données invalide'
      }
    }
  } catch (error) {
    console.error('❌ Erreur lors de la validation:', error)
    return {
      isValid: false,
      data: fallback,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Fonction pour réessayer une opération asynchrone en cas d'échec
 * @param fn - Fonction à exécuter
 * @param options - Options de retry (retries, delay)
 * @returns Résultat de la fonction
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { retries?: number; delay?: number } = {}
): Promise<T> {
  const { retries = 3, delay = 1000 } = options

  try {
    return await fn()
  } catch (error) {
    if (retries <= 0) {
      throw error
    }

    console.warn(`⚠️ Tentative échouée, ${retries} tentatives restantes:`, error)

    await new Promise(resolve => setTimeout(resolve, delay))
    return withRetry(fn, { retries: retries - 1, delay })
  }
}

/**
 * Valide une réponse API et vérifie sa structure
 * @param response - Réponse API à valider
 * @returns true si la réponse est valide, false sinon
 */
export function validateApiResponse(response: unknown): boolean {
  try {
    if (!response || typeof response !== 'object') {
      console.warn('⚠️ Réponse API invalide: pas un objet')
      return false
    }

    const apiResponse = response as any

    // Vérifier la structure de base d'une réponse API
    if (typeof apiResponse.success !== 'boolean') {
      console.warn('⚠️ Réponse API invalide: propriété success manquante ou invalide')
      return false
    }

    // Si success est false, on peut avoir un message d'erreur
    if (!apiResponse.success) {
      console.warn('⚠️ Réponse API avec success=false:', apiResponse.message || 'Erreur inconnue')
      return true // La réponse est structurellement valide même si elle indique un échec
    }

    // Si success est true, on s'attend à avoir des données
    if (apiResponse.success && !apiResponse.data) {
      console.warn('⚠️ Réponse API avec success=true mais sans données')
      return false
    }

    console.log('✅ Réponse API valide')
    return true
  } catch (error) {
    console.error('❌ Erreur lors de la validation de la réponse API:', error)
    return false
  }
}

/**
 * Formate une valeur monétaire de façon sécurisée
 * @param amount - Montant à formater
 * @param currency - Devise (par défaut: 'DZD')
 * @param locale - Locale à utiliser (par défaut: 'fr-DZ')
 * @param fallback - Valeur de fallback si le montant est invalide
 * @returns Montant formaté ou fallback
 */
export function safeFormatCurrency(
  amount: number | string | undefined | null,
  currency: string = 'DZD',
  locale: string = 'fr-DZ',
  fallback: string = '0,00 DZD'
): string {
  if (amount === null || amount === undefined) {
    return fallback
  }

  try {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount

    if (isNaN(numericAmount)) {
      console.warn('⚠️ Montant invalide pour le formatage:', amount)
      return fallback
    }

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numericAmount)
  } catch (error) {
    console.error('❌ Erreur lors du formatage de la devise:', error)
    return fallback
  }
}