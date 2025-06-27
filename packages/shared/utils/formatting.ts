// Formatage des montants en dinars algériens
export function formatCurrency(amount: number, currency = 'DA', locale = 'fr-DZ'): string {
  // Pour DA, on utilise un formatage personnalisé car DA n'est pas reconnu par Intl
  if (currency === 'DA') {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + ' DA'
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Formatage des nombres avec séparateurs
export function formatNumber(value: number, locale = 'fr-FR'): string {
  return new Intl.NumberFormat(locale).format(value)
}

// Formatage des pourcentages
export function formatPercentage(value: number, locale = 'fr-FR'): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value / 100)
}

// Formatage des dates
export function formatDate(date: Date | string, locale = 'fr-FR'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dateObj)
}

export function formatDateTime(date: Date | string, locale = 'fr-FR'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj)
}

// Formatage des numéros de téléphone français
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  
  if (cleaned.startsWith('33')) {
    // Format international
    const national = '0' + cleaned.substring(2)
    return formatPhoneNumber(national)
  }
  
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5')
  }
  
  return phone // Retourner tel quel si format non reconnu
}

// Génération de numéros de documents
export function generateDocumentNumber(prefix: string, sequence: number, year?: number): string {
  const currentYear = year || new Date().getFullYear()
  const paddedSequence = sequence.toString().padStart(4, '0')
  return `${prefix}${currentYear}${paddedSequence}`
}

// Formatage des noms propres
export function formatProperName(name: string): string {
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Formatage des adresses
export function formatAddress(address: {
  address?: string
  postalCode?: string
  city?: string
  country?: string
}): string {
  const parts = []
  
  if (address.address) parts.push(address.address)
  if (address.postalCode && address.city) {
    parts.push(`${address.postalCode} ${address.city}`)
  } else if (address.city) {
    parts.push(address.city)
  }
  if (address.country && address.country !== 'France') {
    parts.push(address.country)
  }
  
  return parts.join(', ')
}

// Calculs de TVA
export function calculateVAT(amountHT: number, vatRate: number): number {
  return Math.round(amountHT * (vatRate / 100) * 100) / 100
}

export function calculateTTC(amountHT: number, vatRate: number): number {
  return amountHT + calculateVAT(amountHT, vatRate)
}

export function calculateHT(amountTTC: number, vatRate: number): number {
  return Math.round((amountTTC / (1 + vatRate / 100)) * 100) / 100
}

// Utilitaires de texte
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
    .replace(/[^a-z0-9 -]/g, '') // Supprimer les caractères spéciaux
    .replace(/\s+/g, '-') // Remplacer les espaces par des tirets
    .replace(/-+/g, '-') // Supprimer les tirets multiples
    .trim()
}
