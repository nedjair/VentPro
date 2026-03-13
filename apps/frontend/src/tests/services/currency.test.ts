import { describe, expect, it } from 'vitest'
import { formatCurrencyAmount, normalizeCurrencyCode } from '@/lib/currency'

describe('currency utils', () => {
  it('normalizes the Algerian dinar legacy alias to an ISO currency code', () => {
    expect(normalizeCurrencyCode('DA')).toBe('DZD')
    expect(normalizeCurrencyCode(' da ')).toBe('DZD')
  })

  it('formats legacy DA values without throwing by falling back to DZD', () => {
    expect(formatCurrencyAmount(1500, 'DA')).toBe(formatCurrencyAmount(1500, 'DZD'))
  })

  it('keeps the UI stable when an invalid currency code reaches the formatter', () => {
    expect(formatCurrencyAmount(1500, 'INVALID')).toBe(formatCurrencyAmount(1500, 'DZD'))
  })
})