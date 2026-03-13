// Utilitaires monétaires centralisés pour éviter les divergences entre pages.

const LEGACY_CURRENCY_ALIASES: Record<string, string> = {
  // `DA` est un libellé métier courant, mais `Intl.NumberFormat` attend ISO 4217.
  DA: 'DZD',
}

export const normalizeCurrencyCode = (currency?: string | null) => {
  const normalizedCurrency = String(currency || '')
    .trim()
    .toUpperCase()

  if (!normalizedCurrency) {
    return 'DZD'
  }

  return LEGACY_CURRENCY_ALIASES[normalizedCurrency] || normalizedCurrency
}

export const formatCurrencyAmount = (value: number, currency?: string | null, locale = 'fr-DZ') => {
  const safeCurrency = normalizeCurrencyCode(currency)

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: safeCurrency,
      maximumFractionDigits: 0,
    }).format(value || 0)
  } catch {
    // Fallback défensif : si un code non pris en charge arrive encore côté UI,
    // on conserve un affichage valide au lieu de casser tout le dashboard.
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'DZD',
      maximumFractionDigits: 0,
    }).format(value || 0)
  }
}