/**
 * Currency and numeric formatters adhering strictly to integer minor units (paise).
 * Rule: 1 INR = 100 paise. Floating point math is strictly forbidden.
 */

export function formatPaise(amountMinor: number, currency: string = 'INR'): string {
  if (currency.toUpperCase() !== 'INR') {
    const main = (amountMinor / 100).toFixed(2);
    return `${currency.toUpperCase()} ${main}`;
  }

  const isNegative = amountMinor < 0;
  const absMinor = Math.abs(Math.round(amountMinor));
  const rupees = Math.floor(absMinor / 100);
  const paise = absMinor % 100;
  const paiseStr = paise.toString().padStart(2, '0');

  // Format rupees according to Indian numbering system (Lakhs, Crores)
  const rupeesStr = rupees.toString();
  let formattedRupees = '';

  if (rupeesStr.length <= 3) {
    formattedRupees = rupeesStr;
  } else {
    const lastThree = rupeesStr.slice(-3);
    const rest = rupeesStr.slice(0, -3);
    const formattedRest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    formattedRupees = `${formattedRest},${lastThree}`;
  }

  const sign = isNegative ? '-' : '';
  return `${sign}₹${formattedRupees}.${paiseStr}`;
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-IN').format(num);
}

export function formatRate(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

export function truncateHash(hash: string, chars: number = 8): string {
  if (!hash) return '';
  if (hash.length <= chars * 2) return hash;
  return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
}
