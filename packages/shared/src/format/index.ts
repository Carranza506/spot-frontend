const priceFormat = new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 });
const priceFormatWithCents = new Intl.NumberFormat('es-CR', {
  style: 'currency',
  currency: 'CRC',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Prices are in Costa Rican colones (CRC) per the contract; cents only when there are any. */
export function formatPrice(colones: number): string {
  return (Number.isInteger(colones) ? priceFormat : priceFormatWithCents).format(colones);
}
