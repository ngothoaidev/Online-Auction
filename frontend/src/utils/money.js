// Exact money display. Amounts travel as digit strings (up to 15 digits); never go through Number/parseFloat
// for anything the user commits to. Compact K/M/B formatting in utils/format.js is catalog-only and lossy.

/** "1234567" -> "1.234.567 ₫"; null/undefined/garbage -> "—" (never "NaN ₫"). */
export function formatVnd(value) {
  if (value === null || value === undefined || value === '') return '—';
  const s = String(typeof value === 'bigint' ? value : value).trim().replace(/\.0+$/, '');
  if (!/^\d{1,15}$/.test(s)) return '—';
  return `${s.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} ₫`;
}

/** Parse what a person typed ("1.500.000", "1 500 000", "1500000") into a digit string, or null when it is not a whole positive amount. */
export function parseAmountInput(text) {
  const s = String(text ?? '').replace(/[\s.,_]/g, '');
  return /^[1-9]\d{0,14}$/.test(s) ? s : null;
}

/** Big-safe comparison of two digit strings: -1 | 0 | 1. */
export function compareAmounts(a, b) {
  const x = BigInt(a);
  const y = BigInt(b);
  return x === y ? 0 : x > y ? 1 : -1;
}
