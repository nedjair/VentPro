import { z } from 'zod'

// Validateurs personnalisés
export const frenchPhoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/
export const siretRegex = /^\d{14}$/
export const vatNumberRegex = /^FR\d{11}$/

// Schémas de validation pour les données françaises
export const FrenchPhoneSchema = z.string().regex(frenchPhoneRegex, 'Numéro de téléphone français invalide')
export const SiretSchema = z.string().regex(siretRegex, 'Numéro SIRET invalide (14 chiffres)')
export const VatNumberSchema = z.string().regex(vatNumberRegex, 'Numéro de TVA français invalide')

// Validation des codes postaux français
export const FrenchPostalCodeSchema = z.string().regex(/^\d{5}$/, 'Code postal français invalide')

// Validation des emails avec domaines français courants
export const EmailSchema = z.string().email('Adresse email invalide')

// Validation des montants monétaires
export const MoneySchema = z.number().min(0, 'Le montant doit être positif').multipleOf(0.01, 'Maximum 2 décimales')

// Validation des pourcentages
export const PercentageSchema = z.number().min(0, 'Le pourcentage doit être positif').max(100, 'Le pourcentage ne peut pas dépasser 100%')

// Validation des quantités
export const QuantitySchema = z.number().int('La quantité doit être un nombre entier').min(0, 'La quantité doit être positive')

// Utilitaires de validation
export function isValidSiret(siret: string): boolean {
  if (!siretRegex.test(siret)) return false
  
  // Algorithme de validation SIRET (Luhn modifié)
  const digits = siret.split('').map(Number)
  let sum = 0
  
  for (let i = 0; i < 14; i++) {
    let digit = digits[i]
    if (digit === undefined) return false
    if (i % 2 === 1) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
  }
  
  return sum % 10 === 0
}

export function isValidVatNumber(vatNumber: string): boolean {
  if (!vatNumberRegex.test(vatNumber)) return false
  
  // Validation basique du numéro de TVA français
  const key = parseInt(vatNumber.substring(2, 4))
  const siren = vatNumber.substring(4)
  
  return key === (12 + 3 * (parseInt(siren) % 97)) % 97
}

export function formatSiret(siret: string): string {
  return siret.replace(/(\d{3})(\d{3})(\d{3})(\d{5})/, '$1 $2 $3 $4')
}

export function formatVatNumber(vatNumber: string): string {
  return vatNumber.replace(/^FR(\d{2})(\d{9})$/, 'FR $1 $2')
}
