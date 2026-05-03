/** Formats a number as Czech price (comma decimal separator, 2 decimal places). */
export function formatKc(amount: number): string {
  return amount.toFixed(2).replace('.', ',');
}

/** Formats a quantity with Czech decimal separator, omitting trailing decimals for whole numbers. */
export function formatMnozstvi(mnozstvi: number): string {
  if (Number.isInteger(mnozstvi)) return String(mnozstvi);
  return mnozstvi.toString().replace('.', ',');
}

/** Returns the +/- step size for a given unit (kg/l → 0.5, g → 50, others → 1). */
export function getKrokJednotky(jednotka: string): number {
  switch ((jednotka ?? '').toLowerCase()) {
    case 'kg':
    case 'l':
      return 0.5;
    case 'g':
      return 50;
    default:
      return 1;
  }
}

/**
 * Formats price with unit label. For 'g' unit, displays price per 100g.
 * e.g. formatCenaJednotka(0.14, 'g') → "14,00 Kč / 100g"
 *      formatCenaJednotka(25, 'kg')  → "25,00 Kč / kg"
 */
export function formatCenaJednotka(cena: number, jednotka: string): string {
  if ((jednotka ?? '').toLowerCase() === 'g') {
    return `${formatKc(cena * 100)} Kč / 100g`;
  }
  return `${formatKc(cena)} Kč / ${jednotka}`;
}

/**
 * Conversion factor to multiply quantity when converting between units.
 * e.g. getKonverzeFaktor('g', 'kg') = 0.001  →  500g * 0.001 = 0.5 kg
 */
export function getKonverzeFaktor(objednanaJednotka: string, cenovaJednotka: string): number {
  const o = (objednanaJednotka ?? '').toLowerCase();
  const c = (cenovaJednotka ?? '').toLowerCase();
  if (o === c) return 1;
  if (o === 'g'  && c === 'kg') return 0.001;
  if (o === 'ml' && c === 'l')  return 0.001;
  if (o === 'kg' && c === 'g')  return 1000;
  if (o === 'l'  && c === 'ml') return 1000;
  return 1;
}
