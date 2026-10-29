// Exact money: positive whole VND, at most 15 digits, handled as BigInt. Never parseFloat/Number for amounts.
export const MAX_MONEY = 999_999_999_999_999n;

export class MoneyError extends Error {}

/** number | digit-string | bigint -> BigInt, or throws MoneyError. Rejects 0, negatives, fractions, NaN/Infinity, exponents, >15 digits. */
export function parseMoney(input) {
  let s;
  if (typeof input === "bigint") s = input.toString();
  else if (typeof input === "number") {
    if (!Number.isSafeInteger(input)) throw new MoneyError("Amount must be a whole number");
    s = String(input);
  } else if (typeof input === "string") s = input.trim();
  else throw new MoneyError("Amount is required");
  if (!/^[1-9]\d{0,14}$/.test(s)) throw new MoneyError("Amount must be a positive whole number of at most 15 digits");
  return BigInt(s);
}

/** DB numeric(15,0) / API string -> BigInt (0 allowed here: DB values are already validated; null stays null). */
export const fromDb = (v) => (v === null || v === undefined ? null : BigInt(String(v).split(".")[0]));
/** BigInt -> the digit string used in API JSON and DB parameters. */
export const toStr = (b) => (b === null || b === undefined ? null : b.toString());

export const max = (a, b) => (a > b ? a : b);
export const min = (a, b) => (a < b ? a : b);

/** vi-VN style grouping on the exact digits (no float rounding), for messages only. */
export const formatVnd = (b) => BigInt(b).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
