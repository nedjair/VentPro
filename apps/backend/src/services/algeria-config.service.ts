import { logger } from '../utils/logger'

/**
 * Service de configuration pour les données commerciales algériennes
 * Gère les devises, formats de dates, numérotation des documents selon les standards algériens
 */
export class AlgeriaConfigService {
  // Configuration des devises
  static readonly CURRENCY = {
    CODE: 'DZD',
    SYMBOL: 'د.ج',
    NAME: 'Dinar algérien',
    DECIMAL_PLACES: 2,
    THOUSANDS_SEPARATOR: ' ',
    DECIMAL_SEPARATOR: ',',
  }

  // Configuration des taxes (TVA)
  static readonly TAX_RATES = {
    STANDARD: 19, // TVA standard en Algérie
    REDUCED: 9,   // TVA réduite
    ZERO: 0,      // Exonéré de TVA
  }

  // Configuration des formats de dates
  static readonly DATE_FORMATS = {
    DISPLAY: 'dd/MM/yyyy',
    INPUT: 'yyyy-MM-dd',
    LONG: 'dd MMMM yyyy',
    SHORT: 'dd/MM/yy',
    TIME: 'HH:mm',
    DATETIME: 'dd/MM/yyyy HH:mm',
  }

  // Configuration de la numérotation des documents
  static readonly DOCUMENT_NUMBERING = {
    QUOTE: {
      PREFIX: 'DEV',
      SEPARATOR: '-',
      YEAR_FORMAT: 'yyyy',
      SEQUENCE_LENGTH: 4,
      PATTERN: 'DEV-{YEAR}-{SEQUENCE}', // Ex: DEV-2024-0001
    },
    ORDER: {
      PREFIX: 'CMD',
      SEPARATOR: '-',
      YEAR_FORMAT: 'yyyy',
      SEQUENCE_LENGTH: 4,
      PATTERN: 'CMD-{YEAR}-{SEQUENCE}', // Ex: CMD-2024-0001
    },
    INVOICE: {
      PREFIX: 'FACT',
      SEPARATOR: '-',
      YEAR_FORMAT: 'yyyy',
      SEQUENCE_LENGTH: 4,
      PATTERN: 'FACT-{YEAR}-{SEQUENCE}', // Ex: FACT-2024-0001
    },
    PURCHASE_ORDER: {
      PREFIX: 'CF',
      SEPARATOR: '-',
      YEAR_FORMAT: 'yyyy',
      SEQUENCE_LENGTH: 4,
      PATTERN: 'CF-{YEAR}-{SEQUENCE}', // Ex: CF-2024-0001
    },
    GOODS_RECEPTION: {
      PREFIX: 'REC',
      SEPARATOR: '-',
      YEAR_FORMAT: 'yyyy',
      SEQUENCE_LENGTH: 4,
      PATTERN: 'REC-{YEAR}-{SEQUENCE}', // Ex: REC-2024-0001
    },
    PAYMENT: {
      PREFIX: 'PAIE',
      SEPARATOR: '-',
      YEAR_FORMAT: 'yyyy',
      SEQUENCE_LENGTH: 4,
      PATTERN: 'PAIE-{YEAR}-{SEQUENCE}', // Ex: PAIE-2024-0001
    },
  }

  // Configuration des informations légales algériennes
  static readonly LEGAL_INFO = {
    COMPANY_TYPES: [
      'SARL', 'SPA', 'SNC', 'SCS', 'EURL', 'SAS', 'SASU', 'EI', 'EIRL'
    ],
    REQUIRED_FIELDS: {
      NIF: 'Numéro d\'Identification Fiscale',
      NIS: 'Numéro d\'Identification Statistique',
      RC: 'Registre de Commerce',
      AI: 'Article d\'Imposition',
    },
    WILAYA_CODES: {
      '01': 'Adrar', '02': 'Chlef', '03': 'Laghouat', '04': 'Oum El Bouaghi',
      '05': 'Batna', '06': 'Béjaïa', '07': 'Biskra', '08': 'Béchar',
      '09': 'Blida', '10': 'Bouira', '11': 'Tamanrasset', '12': 'Tébessa',
      '13': 'Tlemcen', '14': 'Tiaret', '15': 'Tizi Ouzou', '16': 'Alger',
      '17': 'Djelfa', '18': 'Jijel', '19': 'Sétif', '20': 'Saïda',
      '21': 'Skikda', '22': 'Sidi Bel Abbès', '23': 'Annaba', '24': 'Guelma',
      '25': 'Constantine', '26': 'Médéa', '27': 'Mostaganem', '28': 'M\'Sila',
      '29': 'Mascara', '30': 'Ouargla', '31': 'Oran', '32': 'El Bayadh',
      '33': 'Illizi', '34': 'Bordj Bou Arréridj', '35': 'Boumerdès',
      '36': 'El Tarf', '37': 'Tindouf', '38': 'Tissemsilt', '39': 'El Oued',
      '40': 'Khenchela', '41': 'Souk Ahras', '42': 'Tipaza', '43': 'Mila',
      '44': 'Aïn Defla', '45': 'Naâma', '46': 'Aïn Témouchent', '47': 'Ghardaïa',
      '48': 'Relizane', '49': 'Timimoun', '50': 'Bordj Badji Mokhtar',
      '51': 'Ouled Djellal', '52': 'Béni Abbès', '53': 'In Salah',
      '54': 'In Guezzam', '55': 'Touggourt', '56': 'Djanet', '57': 'El M\'Ghair',
      '58': 'El Meniaa'
    }
  }

  /**
   * Formater un montant selon les standards algériens
   */
  static formatCurrency(amount: number, options?: {
    showSymbol?: boolean
    showCode?: boolean
    precision?: number
  }): string {
    const {
      showSymbol = true,
      showCode = false,
      precision = this.CURRENCY.DECIMAL_PLACES
    } = options || {}

    try {
      // Formater le nombre avec les séparateurs algériens
      const formattedAmount = new Intl.NumberFormat('ar-DZ', {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
      }).format(amount)

      let result = formattedAmount

      if (showSymbol) {
        result += ` ${this.CURRENCY.SYMBOL}`
      }

      if (showCode) {
        result += ` ${this.CURRENCY.CODE}`
      }

      return result
    } catch (error) {
      logger.error('Erreur lors du formatage de la devise', { error, amount })
      return `${amount.toFixed(precision)} ${this.CURRENCY.SYMBOL}`
    }
  }

  /**
   * Formater une date selon les standards algériens
   */
  static formatDate(date: Date | string, format: keyof typeof AlgeriaConfigService.DATE_FORMATS = 'DISPLAY'): string {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date
      
      if (isNaN(dateObj.getTime())) {
        throw new Error('Date invalide')
      }

      const formatPattern = this.DATE_FORMATS[format]

      // Utiliser la locale française pour l'Algérie
      return new Intl.DateTimeFormat('fr-DZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: format === 'DATETIME' ? '2-digit' : undefined,
        minute: format === 'DATETIME' ? '2-digit' : undefined,
      }).format(dateObj)
    } catch (error) {
      logger.error('Erreur lors du formatage de la date', { error, date, format })
      return date.toString()
    }
  }

  /**
   * Générer un numéro de document selon les standards algériens
   */
  static generateDocumentNumber(
    documentType: keyof typeof AlgeriaConfigService.DOCUMENT_NUMBERING,
    lastNumber: number = 0,
    year?: number
  ): string {
    try {
      const config = this.DOCUMENT_NUMBERING[documentType]
      const currentYear = year || new Date().getFullYear()
      const sequence = (lastNumber + 1).toString().padStart(config.SEQUENCE_LENGTH, '0')

      return config.PATTERN
        .replace('{YEAR}', currentYear.toString())
        .replace('{SEQUENCE}', sequence)
    } catch (error) {
      logger.error('Erreur lors de la génération du numéro de document', { error, documentType, lastNumber })
      return `${documentType}-${new Date().getFullYear()}-${(lastNumber + 1).toString().padStart(4, '0')}`
    }
  }

  /**
   * Valider un NIF (Numéro d'Identification Fiscale) algérien
   */
  static validateNIF(nif: string): { valid: boolean; message?: string } {
    if (!nif || typeof nif !== 'string') {
      return { valid: false, message: 'NIF requis' }
    }

    // Le NIF algérien doit contenir 15 chiffres
    const nifPattern = /^\d{15}$/
    
    if (!nifPattern.test(nif)) {
      return { valid: false, message: 'Le NIF doit contenir exactement 15 chiffres' }
    }

    return { valid: true }
  }

  /**
   * Valider un NIS (Numéro d'Identification Statistique) algérien
   */
  static validateNIS(nis: string): { valid: boolean; message?: string } {
    if (!nis || typeof nis !== 'string') {
      return { valid: false, message: 'NIS requis' }
    }

    // Le NIS algérien doit contenir 15 chiffres
    const nisPattern = /^\d{15}$/
    
    if (!nisPattern.test(nis)) {
      return { valid: false, message: 'Le NIS doit contenir exactement 15 chiffres' }
    }

    return { valid: true }
  }

  /**
   * Valider un numéro de registre de commerce algérien
   */
  static validateRC(rc: string): { valid: boolean; message?: string } {
    if (!rc || typeof rc !== 'string') {
      return { valid: false, message: 'Numéro RC requis' }
    }

    // Format: XX/XX-XXXXXXX (XX = code wilaya, XX = année, XXXXXXX = numéro séquentiel)
    const rcPattern = /^\d{2}\/\d{2}-\d{7}$/
    
    if (!rcPattern.test(rc)) {
      return { valid: false, message: 'Format RC invalide (attendu: XX/XX-XXXXXXX)' }
    }

    // Vérifier le code wilaya
    const wilayaCode = rc.substring(0, 2)
    if (!this.LEGAL_INFO.WILAYA_CODES[wilayaCode]) {
      return { valid: false, message: `Code wilaya invalide: ${wilayaCode}` }
    }

    return { valid: true }
  }

  /**
   * Calculer la TVA selon les taux algériens
   */
  static calculateTVA(amount: number, rate: number = this.TAX_RATES.STANDARD): {
    htAmount: number
    tvaAmount: number
    ttcAmount: number
  } {
    const htAmount = amount
    const tvaAmount = (htAmount * rate) / 100
    const ttcAmount = htAmount + tvaAmount

    return {
      htAmount: Math.round(htAmount * 100) / 100,
      tvaAmount: Math.round(tvaAmount * 100) / 100,
      ttcAmount: Math.round(ttcAmount * 100) / 100,
    }
  }

  /**
   * Obtenir les informations de configuration pour le frontend
   */
  static getConfigForFrontend(): {
    currency: typeof AlgeriaConfigService.CURRENCY
    taxRates: typeof AlgeriaConfigService.TAX_RATES
    dateFormats: typeof AlgeriaConfigService.DATE_FORMATS
    legalInfo: typeof AlgeriaConfigService.LEGAL_INFO
  } {
    return {
      currency: this.CURRENCY,
      taxRates: this.TAX_RATES,
      dateFormats: this.DATE_FORMATS,
      legalInfo: this.LEGAL_INFO,
    }
  }

  /**
   * Formater une adresse algérienne
   */
  static formatAddress(address: {
    street?: string
    city?: string
    wilayaCode?: string
    postalCode?: string
    country?: string
  }): string {
    const parts: string[] = []

    if (address.street) parts.push(address.street)
    if (address.postalCode) parts.push(address.postalCode)
    if (address.city) parts.push(address.city)
    
    if (address.wilayaCode && this.LEGAL_INFO.WILAYA_CODES[address.wilayaCode]) {
      parts.push(this.LEGAL_INFO.WILAYA_CODES[address.wilayaCode])
    }
    
    if (address.country) parts.push(address.country)

    return parts.join(', ')
  }

  /**
   * Convertir un montant en lettres (français)
   */
  static amountToWords(amount: number): string {
    // Implémentation simplifiée - peut être étendue avec une bibliothèque spécialisée
    const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf']
    const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf']
    const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix']

    if (amount === 0) return 'zéro dinar'

    const integerPart = Math.floor(amount)
    const decimalPart = Math.round((amount - integerPart) * 100)

    let result = this.convertIntegerToWords(integerPart)
    result += integerPart > 1 ? ' dinars' : ' dinar'

    if (decimalPart > 0) {
      result += ' et ' + this.convertIntegerToWords(decimalPart)
      result += decimalPart > 1 ? ' centimes' : ' centime'
    }

    return result
  }

  private static convertIntegerToWords(num: number): string {
    if (num === 0) return 'zéro'
    if (num < 0) return 'moins ' + this.convertIntegerToWords(-num)

    // Implémentation simplifiée pour les nombres jusqu'à 999999
    if (num < 10) return ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'][num]
    if (num < 20) return ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'][num - 10]
    if (num < 100) {
      const tens = Math.floor(num / 10)
      const units = num % 10
      const tensWords = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix']
      return tensWords[tens] + (units > 0 ? '-' + this.convertIntegerToWords(units) : '')
    }
    if (num < 1000) {
      const hundreds = Math.floor(num / 100)
      const remainder = num % 100
      let result = (hundreds === 1 ? 'cent' : this.convertIntegerToWords(hundreds) + ' cent')
      if (remainder > 0) result += ' ' + this.convertIntegerToWords(remainder)
      return result
    }

    // Pour les nombres plus grands, retourner la représentation numérique
    return num.toString()
  }
}
