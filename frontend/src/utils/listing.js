import { parseAmountInput, compareAmounts } from './money.js';

/**
 * Client-side mirror of the server's create-listing rules (the server stays the authority):
 * 3-10 photos, whole positive amounts (digit strings), buy-now above the starting price, end time at least 1 hour away.
 * Returns { ok, errors: {field: message}, value } where `value` has exact money strings and a UTC ISO end time.
 */
export function validateListing(form, now = Date.now()) {
  const errors = {};
  const title = form.title.trim();
  if (!title) errors.title = 'Enter a title';
  else if (title.length > 255) errors.title = 'Keep the title under 255 characters';
  if (!form.categoryId) errors.categoryId = 'Choose a category';

  const startingPrice = parseAmountInput(form.startingPrice);
  const stepPrice = parseAmountInput(form.stepPrice);
  if (!startingPrice) errors.startingPrice = 'Enter a whole amount in ₫ (no decimals)';
  if (!stepPrice) errors.stepPrice = 'Enter a whole amount in ₫ (no decimals)';
  let buyNowPrice = null;
  if (String(form.buyNowPrice ?? '').trim() !== '') {
    buyNowPrice = parseAmountInput(form.buyNowPrice);
    if (!buyNowPrice) errors.buyNowPrice = 'Enter a whole amount in ₫ (no decimals)';
    else if (startingPrice && compareAmounts(buyNowPrice, startingPrice) <= 0) errors.buyNowPrice = 'Buy Now must be higher than the starting price';
  }

  let endTime = null;
  const t = form.endTime ? new Date(form.endTime) : null; // datetime-local is the viewer's local time: convert to an absolute instant
  if (!t || Number.isNaN(t.getTime())) errors.endTime = 'Choose when the auction ends';
  else if (t.getTime() < now + 60 * 60 * 1000) errors.endTime = 'The auction must run for at least 1 hour';
  else endTime = t.toISOString();

  const n = form.images.length;
  if (n < 3) errors.images = `Add at least 3 photos (${n} added)`;
  else if (n > 10) errors.images = 'Use at most 10 photos';

  return { ok: Object.keys(errors).length === 0, errors, value: { title, startingPrice, stepPrice, buyNowPrice, endTime } };
}
