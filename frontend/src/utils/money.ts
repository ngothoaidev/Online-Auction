// Exact money display. Amounts travel as digit strings (up to 15 digits); never go through Number/parseFloat
// for anything the user commits to. There is deliberately no compact (1.2M) formatter: it rounds money.

/** "1234567" -> "1.234.567 ₫"; null/undefined/garbage -> "—" (never "NaN ₫"). */
export function formatVnd(value: string | number | bigint | null | undefined) {
  if (value === null || value === undefined || value === '') return '—';
  const s = String(typeof value === 'bigint' ? value : value).trim().replace(/\.0+$/, '');
  if (!/^\d{1,15}$/.test(s)) return '—';
  return `${s.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} ₫`;
}

/** Parse what a person typed ("1.500.000", "1 500 000", "1500000") into a digit string, or null when it is not a whole positive amount. */
export function parseAmountInput(text: unknown) {
  // '.' ',' and spaces count as thousands separators only in proper groups of three (1.500.000); '12.5' is not an amount.
  let s = String(text ?? '').trim();
  if (/^\d{1,3}([.,\s]\d{3})+$/.test(s)) s = s.replace(/[.,\s]/g, '');
  return /^[1-9]\d{0,14}$/.test(s) ? s : null;
}

/** Big-safe comparison of two digit strings: -1 | 0 | 1. */
export function compareAmounts(a: string | number | bigint, b: string | number | bigint) {
  const x = BigInt(a);
  const y = BigInt(b);
  return x === y ? 0 : x > y ? 1 : -1;
}
