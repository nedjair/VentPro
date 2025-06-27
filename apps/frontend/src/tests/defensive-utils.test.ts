/**
 * Tests unitaires pour les utilitaires de programmation défensive
 * Valide la robustesse des fonctions de sécurité
 */

import { describe, test, expect } from '@jest/globals'
import {
  ensureArray,
  safeMap,
  safeFilter,
  safeFind,
  safeTextRender,
  safeFormatDate,
  safeFormatCurrency
} from '../lib/defensive-utils'

describe('Defensive Utils', () => {
  describe('ensureArray', () => {
    test('should return array when input is array', () => {
      const input = [1, 2, 3]
      const result = ensureArray(input)
      expect(result).toEqual([1, 2, 3])
      expect(Array.isArray(result)).toBe(true)
    })

    test('should return empty array when input is null', () => {
      const result = ensureArray(null)
      expect(result).toEqual([])
      expect(Array.isArray(result)).toBe(true)
    })

    test('should return empty array when input is undefined', () => {
      const result = ensureArray(undefined)
      expect(result).toEqual([])
      expect(Array.isArray(result)).toBe(true)
    })

    test('should return empty array when input is not array', () => {
      expect(ensureArray('string')).toEqual([])
      expect(ensureArray(123)).toEqual([])
      expect(ensureArray({})).toEqual([])
      expect(ensureArray(true)).toEqual([])
    })

    test('should preserve array with objects', () => {
      const input = [{ id: 1, name: 'test' }, { id: 2, name: 'test2' }]
      const result = ensureArray(input)
      expect(result).toEqual(input)
      expect(result.length).toBe(2)
    })
  })

  describe('safeMap', () => {
    test('should map array correctly', () => {
      const input = [1, 2, 3]
      const result = safeMap(input, x => x * 2)
      expect(result).toEqual([2, 4, 6])
    })

    test('should return empty array when input is not array', () => {
      expect(safeMap(null, x => x)).toEqual([])
      expect(safeMap(undefined, x => x)).toEqual([])
      expect(safeMap('string', x => x)).toEqual([])
      expect(safeMap(123, x => x)).toEqual([])
    })

    test('should handle complex mapping', () => {
      const input = [{ id: 1, name: 'Ahmed' }, { id: 2, name: 'Fatima' }]
      const result = safeMap(input, item => ({ ...item, fullName: `Mr/Ms ${item.name}` }))
      
      expect(result).toEqual([
        { id: 1, name: 'Ahmed', fullName: 'Mr/Ms Ahmed' },
        { id: 2, name: 'Fatima', fullName: 'Mr/Ms Fatima' }
      ])
    })

    test('should handle mapping errors gracefully', () => {
      const input = [1, 2, 3]
      const result = safeMap(input, x => {
        if (x === 2) throw new Error('Test error')
        return x * 2
      })
      
      // Should continue mapping despite error
      expect(result.length).toBeLessThanOrEqual(input.length)
    })
  })

  describe('safeFilter', () => {
    test('should filter array correctly', () => {
      const input = [1, 2, 3, 4, 5]
      const result = safeFilter(input, x => x > 3)
      expect(result).toEqual([4, 5])
    })

    test('should return empty array when input is not array', () => {
      expect(safeFilter(null, x => true)).toEqual([])
      expect(safeFilter(undefined, x => true)).toEqual([])
      expect(safeFilter('string', x => true)).toEqual([])
    })

    test('should handle complex filtering', () => {
      const input = [
        { id: 1, name: 'Ahmed', city: 'Alger' },
        { id: 2, name: 'Fatima', city: 'Oran' },
        { id: 3, name: 'Mohamed', city: 'Alger' }
      ]
      
      const result = safeFilter(input, item => item.city === 'Alger')
      expect(result).toEqual([
        { id: 1, name: 'Ahmed', city: 'Alger' },
        { id: 3, name: 'Mohamed', city: 'Alger' }
      ])
    })

    test('should handle filter errors gracefully', () => {
      const input = [1, 2, 3]
      const result = safeFilter(input, x => {
        if (x === 2) throw new Error('Test error')
        return x > 1
      })
      
      // Should continue filtering despite error
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('safeFind', () => {
    test('should find element correctly', () => {
      const input = [1, 2, 3, 4, 5]
      const result = safeFind(input, x => x === 3)
      expect(result).toBe(3)
    })

    test('should return undefined when element not found', () => {
      const input = [1, 2, 3]
      const result = safeFind(input, x => x === 5)
      expect(result).toBeUndefined()
    })

    test('should return undefined when input is not array', () => {
      expect(safeFind(null, x => true)).toBeUndefined()
      expect(safeFind(undefined, x => true)).toBeUndefined()
      expect(safeFind('string', x => true)).toBeUndefined()
    })

    test('should handle complex finding', () => {
      const input = [
        { id: 1, name: 'Ahmed' },
        { id: 2, name: 'Fatima' },
        { id: 3, name: 'Mohamed' }
      ]
      
      const result = safeFind(input, item => item.name === 'Fatima')
      expect(result).toEqual({ id: 2, name: 'Fatima' })
    })
  })

  describe('safeTextRender', () => {
    test('should return text when valid string', () => {
      expect(safeTextRender('Hello World')).toBe('Hello World')
      expect(safeTextRender('Ahmed Benali')).toBe('Ahmed Benali')
    })

    test('should return fallback when input is null/undefined', () => {
      expect(safeTextRender(null, 'Fallback')).toBe('Fallback')
      expect(safeTextRender(undefined, 'Fallback')).toBe('Fallback')
    })

    test('should return default fallback when no fallback provided', () => {
      expect(safeTextRender(null)).toBe('')
      expect(safeTextRender(undefined)).toBe('')
    })

    test('should convert numbers to strings', () => {
      expect(safeTextRender(123)).toBe('123')
      expect(safeTextRender(0)).toBe('0')
    })

    test('should handle empty strings', () => {
      expect(safeTextRender('', 'Fallback')).toBe('Fallback')
      expect(safeTextRender('   ', 'Fallback')).toBe('Fallback') // Whitespace only
    })
  })

  describe('safeFormatDate', () => {
    test('should format valid date string', () => {
      const dateStr = '2025-06-22T10:30:00Z'
      const result = safeFormatDate(dateStr)
      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/) // DD/MM/YYYY format
    })

    test('should format Date object', () => {
      const date = new Date('2025-06-22')
      const result = safeFormatDate(date)
      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/)
    })

    test('should return fallback for invalid dates', () => {
      expect(safeFormatDate('invalid-date', 'Date invalide')).toBe('Date invalide')
      expect(safeFormatDate(null, 'Pas de date')).toBe('Pas de date')
      expect(safeFormatDate(undefined, 'Non renseigné')).toBe('Non renseigné')
    })

    test('should return default fallback when no fallback provided', () => {
      expect(safeFormatDate('invalid-date')).toBe('Date invalide')
      expect(safeFormatDate(null)).toBe('Date invalide')
    })
  })

  describe('safeFormatCurrency', () => {
    test('should format valid numbers as DZD currency', () => {
      expect(safeFormatCurrency(1000)).toMatch(/1[\s,.]000.*DA|DZD/)
      expect(safeFormatCurrency(0)).toMatch(/0.*DA|DZD/)
    })

    test('should handle decimal numbers', () => {
      const result = safeFormatCurrency(1234.56)
      expect(result).toMatch(/1[\s,.]234[.,]56.*DA|DZD/)
    })

    test('should return fallback for invalid numbers', () => {
      expect(safeFormatCurrency(null, 'Prix non renseigné')).toBe('Prix non renseigné')
      expect(safeFormatCurrency(undefined, 'N/A')).toBe('N/A')
      expect(safeFormatCurrency('invalid', 'Erreur')).toBe('Erreur')
    })

    test('should return default fallback when no fallback provided', () => {
      expect(safeFormatCurrency(null)).toBe('0,00 DA')
      expect(safeFormatCurrency(undefined)).toBe('0,00 DA')
    })

    test('should handle negative numbers', () => {
      const result = safeFormatCurrency(-500)
      expect(result).toMatch(/-500.*DA|DZD/)
    })
  })

  describe('Integration tests', () => {
    test('should work together in realistic scenario', () => {
      const mockApiResponse = {
        data: [
          { id: 1, name: 'Ahmed', amount: 1500.75, date: '2025-06-22' },
          { id: 2, name: null, amount: null, date: 'invalid' },
          { id: 3, name: 'Fatima', amount: 2000, date: '2025-06-21' }
        ]
      }

      // Simulate frontend processing with defensive programming
      const safeData = ensureArray(mockApiResponse.data)
      const processedData = safeMap(safeData, item => ({
        id: item.id,
        name: safeTextRender(item.name, 'Client sans nom'),
        amount: safeFormatCurrency(item.amount, 'Prix non renseigné'),
        date: safeFormatDate(item.date, 'Date invalide')
      }))

      const validClients = safeFilter(processedData, item => 
        item.name !== 'Client sans nom'
      )

      expect(processedData).toHaveLength(3)
      expect(validClients).toHaveLength(2)
      expect(processedData[1].name).toBe('Client sans nom')
      expect(processedData[1].amount).toBe('Prix non renseigné')
      expect(processedData[1].date).toBe('Date invalide')
    })

    test('should handle completely invalid API response', () => {
      const invalidResponse = null

      const safeData = ensureArray(invalidResponse)
      const processedData = safeMap(safeData, item => item)
      const filteredData = safeFilter(processedData, item => true)
      const foundItem = safeFind(processedData, item => item.id === 1)

      expect(safeData).toEqual([])
      expect(processedData).toEqual([])
      expect(filteredData).toEqual([])
      expect(foundItem).toBeUndefined()
    })
  })
})
