/**
 * Test simple pour vérifier que Jest fonctionne
 */

describe('Simple Tests', () => {
  test('should pass basic test', () => {
    expect(1 + 1).toBe(2)
  })

  test('should validate array operations', () => {
    const arr = [1, 2, 3]
    expect(arr.length).toBe(3)
    expect(arr.includes(2)).toBe(true)
  })

  test('should validate defensive programming patterns', () => {
    // Test de la fonction ensureArray
    const ensureArray = (value: unknown): any[] => {
      if (Array.isArray(value)) {
        return value
      }
      return []
    }

    expect(ensureArray([1, 2, 3])).toEqual([1, 2, 3])
    expect(ensureArray(null)).toEqual([])
    expect(ensureArray(undefined)).toEqual([])
    expect(ensureArray('string')).toEqual([])
  })

  test('should validate pagination logic', () => {
    const validatePagination = (page: number, limit: number) => {
      const safePage = Math.max(1, isNaN(page) ? 1 : page)
      const safeLimit = Math.max(1, isNaN(limit) ? 10 : limit)
      const skip = Math.max(0, (safePage - 1) * safeLimit)
      
      return { page: safePage, limit: safeLimit, skip }
    }

    // Tests avec valeurs valides
    expect(validatePagination(1, 10)).toEqual({ page: 1, limit: 10, skip: 0 })
    expect(validatePagination(2, 5)).toEqual({ page: 2, limit: 5, skip: 5 })

    // Tests avec valeurs invalides (protection NaN)
    expect(validatePagination(NaN, NaN)).toEqual({ page: 1, limit: 10, skip: 0 })
    expect(validatePagination(-1, -5)).toEqual({ page: 1, limit: 10, skip: 0 })
  })
})
