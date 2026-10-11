import { parseAmountInput, compareAmounts, formatVnd } from './money.js';

/**
 * Validate what the person typed against the SERVER's minimum (first bid and later bids use the same rule:
 * `minimumNextBid` comes from the API). Returns { ok:true, amount } or { ok:false, error }.
 */
export function validateBid(text, minimumNextBid) {
  if (String(text ?? '').trim() === '') return { ok: false, error: 'Enter your maximum bid' };
  const amount = parseAmountInput(text);
  if (!amount) return { ok: false, error: 'Use a whole amount in ₫, up to 15 digits' };
  if (minimumNextBid && compareAmounts(amount, minimumNextBid) < 0) {
    return { ok: false, error: `The minimum bid is ${formatVnd(minimumNextBid)}` };
  }
  return { ok: true, amount };
}

/** Human message for a capability reason code from the API. */
export const REASON_TEXT = {
  AUTH_REQUIRED: 'Sign in to bid.',
  EMAIL_NOT_VERIFIED: 'Verify your email to bid.',
  ACCOUNT_BANNED: 'Your account cannot bid.',
  ROLE_NOT_ALLOWED: 'This account type cannot bid.',
  OWN_LISTING: 'You cannot bid on your own listing.',
  BIDDER_DISQUALIFIED: 'The seller removed you from this auction.',
  RATING_TOO_LOW: 'Your rating is below the 80% needed to bid.',
  NEWBIES_NOT_ALLOWED: 'This seller only accepts bidders who already have reviews.',
  AUCTION_ENDED: 'Bidding has closed.',
  AUCTION_NOT_ACTIVE: 'This auction is no longer open.',
  NO_BUY_NOW: '',
  PRICE_REACHED: 'Buy Now is no longer available because the price has reached it.',
};
