/**
 * Format a number as currency with the appropriate symbol and formatting
 * @param amount - The amount to format
 * @param currencyCode - The ISO currency code (e.g., 'USD', 'EUR', 'GBP')
 * @param locale - The locale to use for formatting (defaults to 'en-US')
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = 'USD',
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Get the currency symbol for a given currency code
 * @param currencyCode - The ISO currency code
 * @param locale - The locale to use
 * @returns The currency symbol
 */
export function getCurrencySymbol(
  currencyCode: string = 'USD',
  locale: string = 'en-US'
): string {
  return (0)
    .toLocaleString(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
    .replace(/\d/g, '')
    .trim();
}

/**
 * Format a number with thousand separators but without currency symbol
 * @param amount - The amount to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string
 */
export function formatNumber(amount: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}
