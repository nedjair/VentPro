import { describe, it, expect } from 'vitest'
import { AlgeriaConfigService } from '../../services/algeria-config.service'

describe('AlgeriaConfigService', () => {
  describe('formatCurrency', () => {
    it('should format currency with default options', () => {
      const result = AlgeriaConfigService.formatCurrency(1234.56)
      expect(result).toContain('1 234,56')
      expect(result).toContain('د.ج')
    })

    it('should format currency without symbol', () => {
      const result = AlgeriaConfigService.formatCurrency(1234.56, { showSymbol: false })
      expect(result).not.toContain('د.ج')
      expect(result).toContain('1 234,56')
    })

    it('should format currency with code', () => {
      const result = AlgeriaConfigService.formatCurrency(1234.56, { showCode: true })
      expect(result).toContain('DZD')
    })

    it('should format currency with custom precision', () => {
      const result = AlgeriaConfigService.formatCurrency(1234.5, { precision: 3 })
      expect(result).toContain('1 234,500')
    })

    it('should handle zero amount', () => {
      const result = AlgeriaConfigService.formatCurrency(0)
      expect(result).toContain('0,00')
    })

    it('should handle negative amounts', () => {
      const result = AlgeriaConfigService.formatCurrency(-1234.56)
      expect(result).toContain('-1 234,56')
    })
  })

  describe('formatDate', () => {
    it('should format date with default format', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      const result = AlgeriaConfigService.formatDate(date)
      expect(result).toMatch(/15\/01\/2024/)
    })

    it('should format date from string', () => {
      const result = AlgeriaConfigService.formatDate('2024-01-15')
      expect(result).toMatch(/15\/01\/2024/)
    })

    it('should handle invalid date gracefully', () => {
      const result = AlgeriaConfigService.formatDate('invalid-date')
      expect(result).toBe('invalid-date')
    })
  })

  describe('generateDocumentNumber', () => {
    it('should generate quote number correctly', () => {
      const result = AlgeriaConfigService.generateDocumentNumber('QUOTE', 0, 2024)
      expect(result).toBe('DEV-2024-0001')
    })

    it('should generate purchase order number correctly', () => {
      const result = AlgeriaConfigService.generateDocumentNumber('PURCHASE_ORDER', 5, 2024)
      expect(result).toBe('CF-2024-0006')
    })

    it('should generate invoice number correctly', () => {
      const result = AlgeriaConfigService.generateDocumentNumber('INVOICE', 99, 2024)
      expect(result).toBe('FACT-2024-0100')
    })

    it('should pad sequence numbers correctly', () => {
      const result = AlgeriaConfigService.generateDocumentNumber('QUOTE', 9999, 2024)
      expect(result).toBe('DEV-2024-10000')
    })

    it('should use current year if not provided', () => {
      const currentYear = new Date().getFullYear()
      const result = AlgeriaConfigService.generateDocumentNumber('QUOTE', 0)
      expect(result).toBe(`DEV-${currentYear}-0001`)
    })
  })

  describe('validateNIF', () => {
    it('should validate correct NIF', () => {
      const result = AlgeriaConfigService.validateNIF('123456789012345')
      expect(result.valid).toBe(true)
      expect(result.message).toBeUndefined()
    })

    it('should reject NIF with wrong length', () => {
      const result = AlgeriaConfigService.validateNIF('12345678901234')
      expect(result.valid).toBe(false)
      expect(result.message).toBe('Le NIF doit contenir exactement 15 chiffres')
    })

    it('should reject NIF with non-numeric characters', () => {
      const result = AlgeriaConfigService.validateNIF('12345678901234A')
      expect(result.valid).toBe(false)
      expect(result.message).toBe('Le NIF doit contenir exactement 15 chiffres')
    })

    it('should reject empty NIF', () => {
      const result = AlgeriaConfigService.validateNIF('')
      expect(result.valid).toBe(false)
      expect(result.message).toBe('NIF requis')
    })

    it('should reject null NIF', () => {
      const result = AlgeriaConfigService.validateNIF(null as any)
      expect(result.valid).toBe(false)
      expect(result.message).toBe('NIF requis')
    })
  })

  describe('validateNIS', () => {
    it('should validate correct NIS', () => {
      const result = AlgeriaConfigService.validateNIS('123456789012345')
      expect(result.valid).toBe(true)
      expect(result.message).toBeUndefined()
    })

    it('should reject NIS with wrong length', () => {
      const result = AlgeriaConfigService.validateNIS('12345678901234')
      expect(result.valid).toBe(false)
      expect(result.message).toBe('Le NIS doit contenir exactement 15 chiffres')
    })

    it('should reject empty NIS', () => {
      const result = AlgeriaConfigService.validateNIS('')
      expect(result.valid).toBe(false)
      expect(result.message).toBe('NIS requis')
    })
  })

  describe('validateRC', () => {
    it('should validate correct RC format', () => {
      const result = AlgeriaConfigService.validateRC('16/24-1234567')
      expect(result.valid).toBe(true)
      expect(result.message).toBeUndefined()
    })

    it('should reject RC with wrong format', () => {
      const result = AlgeriaConfigService.validateRC('16-24-1234567')
      expect(result.valid).toBe(false)
      expect(result.message).toBe('Format RC invalide (attendu: XX/XX-XXXXXXX)')
    })

    it('should reject RC with invalid wilaya code', () => {
      const result = AlgeriaConfigService.validateRC('99/24-1234567')
      expect(result.valid).toBe(false)
      expect(result.message).toBe('Code wilaya invalide: 99')
    })

    it('should reject empty RC', () => {
      const result = AlgeriaConfigService.validateRC('')
      expect(result.valid).toBe(false)
      expect(result.message).toBe('Numéro RC requis')
    })
  })

  describe('calculateTVA', () => {
    it('should calculate TVA with standard rate', () => {
      const result = AlgeriaConfigService.calculateTVA(1000)
      expect(result.htAmount).toBe(1000)
      expect(result.tvaAmount).toBe(190) // 19% of 1000
      expect(result.ttcAmount).toBe(1190)
    })

    it('should calculate TVA with custom rate', () => {
      const result = AlgeriaConfigService.calculateTVA(1000, 9)
      expect(result.htAmount).toBe(1000)
      expect(result.tvaAmount).toBe(90) // 9% of 1000
      expect(result.ttcAmount).toBe(1090)
    })

    it('should calculate TVA with zero rate', () => {
      const result = AlgeriaConfigService.calculateTVA(1000, 0)
      expect(result.htAmount).toBe(1000)
      expect(result.tvaAmount).toBe(0)
      expect(result.ttcAmount).toBe(1000)
    })

    it('should round amounts correctly', () => {
      const result = AlgeriaConfigService.calculateTVA(100.33, 19)
      expect(result.htAmount).toBe(100.33)
      expect(result.tvaAmount).toBe(19.06) // Rounded
      expect(result.ttcAmount).toBe(119.39)
    })
  })

  describe('formatAddress', () => {
    it('should format complete address', () => {
      const address = {
        street: '123 Rue de la Paix',
        city: 'Alger',
        wilayaCode: '16',
        postalCode: '16000',
        country: 'Algérie',
      }

      const result = AlgeriaConfigService.formatAddress(address)
      expect(result).toBe('123 Rue de la Paix, 16000, Alger, Alger, Algérie')
    })

    it('should format partial address', () => {
      const address = {
        street: '123 Rue de la Paix',
        city: 'Alger',
      }

      const result = AlgeriaConfigService.formatAddress(address)
      expect(result).toBe('123 Rue de la Paix, Alger')
    })

    it('should handle empty address', () => {
      const result = AlgeriaConfigService.formatAddress({})
      expect(result).toBe('')
    })

    it('should handle invalid wilaya code', () => {
      const address = {
        street: '123 Rue de la Paix',
        city: 'Alger',
        wilayaCode: '99', // Invalid code
      }

      const result = AlgeriaConfigService.formatAddress(address)
      expect(result).toBe('123 Rue de la Paix, Alger')
    })
  })

  describe('amountToWords', () => {
    it('should convert zero to words', () => {
      const result = AlgeriaConfigService.amountToWords(0)
      expect(result).toBe('zéro dinar')
    })

    it('should convert single digit to words', () => {
      const result = AlgeriaConfigService.amountToWords(5)
      expect(result).toBe('cinq dinars')
    })

    it('should convert amount with decimals', () => {
      const result = AlgeriaConfigService.amountToWords(5.50)
      expect(result).toContain('cinq dinars')
      expect(result).toContain('cinquante centimes')
    })

    it('should handle singular forms', () => {
      const result = AlgeriaConfigService.amountToWords(1.01)
      expect(result).toContain('un dinar')
      expect(result).toContain('un centime')
    })

    it('should handle amounts without decimals', () => {
      const result = AlgeriaConfigService.amountToWords(10)
      expect(result).toBe('dix dinars')
      expect(result).not.toContain('centime')
    })
  })

  describe('getConfigForFrontend', () => {
    it('should return complete configuration', () => {
      const config = AlgeriaConfigService.getConfigForFrontend()

      expect(config).toHaveProperty('currency')
      expect(config).toHaveProperty('taxRates')
      expect(config).toHaveProperty('dateFormats')
      expect(config).toHaveProperty('legalInfo')

      expect(config.currency.CODE).toBe('DZD')
      expect(config.taxRates.STANDARD).toBe(19)
      expect(config.legalInfo.WILAYA_CODES).toHaveProperty('16', 'Alger')
    })

    it('should include all required currency properties', () => {
      const config = AlgeriaConfigService.getConfigForFrontend()

      expect(config.currency).toHaveProperty('CODE', 'DZD')
      expect(config.currency).toHaveProperty('SYMBOL', 'د.ج')
      expect(config.currency).toHaveProperty('NAME', 'Dinar algérien')
      expect(config.currency).toHaveProperty('DECIMAL_PLACES', 2)
    })

    it('should include all tax rates', () => {
      const config = AlgeriaConfigService.getConfigForFrontend()

      expect(config.taxRates).toHaveProperty('STANDARD', 19)
      expect(config.taxRates).toHaveProperty('REDUCED', 9)
      expect(config.taxRates).toHaveProperty('ZERO', 0)
    })

    it('should include wilaya codes', () => {
      const config = AlgeriaConfigService.getConfigForFrontend()

      expect(Object.keys(config.legalInfo.WILAYA_CODES)).toHaveLength(58)
      expect(config.legalInfo.WILAYA_CODES['01']).toBe('Adrar')
      expect(config.legalInfo.WILAYA_CODES['16']).toBe('Alger')
    })
  })
})
