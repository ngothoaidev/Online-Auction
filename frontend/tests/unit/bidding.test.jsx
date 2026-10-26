import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { validateBid } from '../../src/utils/bid.js'
import { formatTimeLeft } from '../../src/utils/format.js'

const placeBid = vi.fn()
const buyNow = vi.fn()
vi.mock('../../src/services/auctionService', () => ({ default: { placeBid: (...a) => placeBid(...a), buyNow: (...a) => buyNow(...a), getBidHistory: vi.fn().mockResolvedValue([]), rejectBid: vi.fn() } }))
vi.mock('../../src/contexts/AuthContext', () => ({ useAuth: () => ({ user: { userId: 5, id: 5, username: 'me' } }) }))
vi.mock('../../src/contexts/WatchlistContext.jsx', () => ({ useWatchlist: () => ({ has: () => false, pending: () => false, toggle: vi.fn().mockResolvedValue() }) }))

import BiddingSection from '../../src/pages/ProductDetail/BiddingSection.jsx'

const product = (over = {}) => ({
  id: 7, title: 'Omega Seamaster', status: 'active', sellerName: 'demo_seller', sellerId: 1, seller: { rating: null, ratingCount: 0 },
  currentPrice: '1000000', stepPrice: '100000', minimumNextBid: '1100000', bidCount: 1, buyNowPrice: '5000000',
  endTime: new Date(Date.now() + 3600e3).toISOString(), serverTime: new Date().toISOString(),
  capabilities: { canBid: true, canBuyNow: true, reasons: {} }, ...over,
})
const apiError = (status, message, code) => Object.assign(new Error(message), { status, code })
const mount = (p = product(), props = {}) => render(<MemoryRouter><BiddingSection product={p} onChanged={props.onChanged ?? vi.fn()} /></MemoryRouter>)
const typeAndReview = async (value) => {
  await userEvent.type(screen.getByLabelText(/your maximum bid/i), value)
  await userEvent.click(screen.getByRole('button', { name: 'Review bid' }))
}

beforeEach(() => { placeBid.mockReset(); buyNow.mockReset() })

describe('validateBid', () => {
  it('uses the server minimum for every bid and exact digit strings', () => {
    expect(validateBid('1.100.000', '1100000')).toEqual({ ok: true, amount: '1100000' })
    expect(validateBid('1099999', '1100000').ok).toBe(false)
    expect(validateBid('', '1100000').error).toMatch(/enter/i)
    expect(validateBid('12.5', '1').ok).toBe(false)
    expect(validateBid('999999999999999', '999999999999998')).toEqual({ ok: true, amount: '999999999999999' })
  })
})

describe('bid review flow', () => {
  it('cancelling the review sends nothing', async () => {
    mount()
    await typeAndReview('1500000')
    const dialog = screen.getByRole('dialog', { name: 'Review your bid' })
    expect(within(dialog).getByText('1.500.000 ₫')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(placeBid).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('invalid amounts never open the dialog and show the server minimum', async () => {
    mount()
    await typeAndReview('1000')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('alert')).toHaveTextContent('1.100.000 ₫')
    expect(placeBid).not.toHaveBeenCalled()
  })

  it('confirm sends ONE request with a key; the button is disabled while pending so double clicks cannot repeat it', async () => {
    let finish
    placeBid.mockImplementation(() => new Promise((r) => { finish = r }))
    mount()
    await typeAndReview('1500000')
    const confirm = screen.getByRole('button', { name: 'Place bid' })
    await userEvent.dblClick(confirm)
    expect(placeBid).toHaveBeenCalledTimes(1)
    expect(placeBid.mock.calls[0][1]).toBe('1500000')
    expect(placeBid.mock.calls[0][2]).toMatch(/.{8,}/)
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-busy', 'true')
    finish({ outcome: 'success', currentPrice: '1000000' })
    expect(await screen.findByRole('dialog', { name: 'You are the highest bidder' })).toHaveTextContent(/recorded/i)
  })

  it('an accepted-but-outbid answer is never presented as a win', async () => {
    placeBid.mockResolvedValue({ outcome: 'outbid', currentPrice: '1600000' })
    mount()
    await typeAndReview('1500000')
    await userEvent.click(screen.getByRole('button', { name: 'Place bid' }))
    const dialog = await screen.findByRole('dialog', { name: 'You were outbid' })
    expect(dialog).toHaveTextContent('1.600.000 ₫')
    expect(dialog.textContent).not.toMatch(/highest bidder/i)
  })

  it('a lost response keeps the key: Retry reuses the SAME Idempotency-Key', async () => {
    placeBid.mockRejectedValueOnce(new Error('Failed to fetch')).mockResolvedValueOnce({ outcome: 'success', currentPrice: '1000000' })
    mount()
    await typeAndReview('1500000')
    await userEvent.click(screen.getByRole('button', { name: 'Place bid' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/not place the order twice|may or may not/i)
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(placeBid).toHaveBeenCalledTimes(2))
    expect(placeBid.mock.calls[1][2]).toBe(placeBid.mock.calls[0][2])
  })

  it('a refusal is final for that intent, is explained, and asks the page to refresh the canonical state', async () => {
    const onChanged = vi.fn()
    placeBid.mockRejectedValue(apiError(409, 'Auction has ended', 'AUCTION_ENDED'))
    mount(product(), { onChanged })
    await typeAndReview('1500000')
    await userEvent.click(screen.getByRole('button', { name: 'Place bid' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Auction has ended')
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull()
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(null))
  })

  it('reopening after a cancel is a new intent with a new key', async () => {
    placeBid.mockResolvedValue({ outcome: 'success', currentPrice: '1000000' })
    mount()
    await typeAndReview('1500000')
    await userEvent.click(screen.getByRole('button', { name: 'Place bid' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Done' }))
    await typeAndReview('1700000')
    await userEvent.click(screen.getByRole('button', { name: 'Place bid' }))
    await waitFor(() => expect(placeBid).toHaveBeenCalledTimes(2))
    expect(placeBid.mock.calls[1][2]).not.toBe(placeBid.mock.calls[0][2])
  })
})

describe('capabilities and honest content', () => {
  it('ineligible bidders get the reason and no active form; no fake "Verified Item" / 100% claims', () => {
    mount(product({ capabilities: { canBid: false, canBuyNow: false, reasons: { bid: 'RATING_TOO_LOW', buyNow: 'RATING_TOO_LOW' } } }))
    expect(screen.getByText(/below the 80%/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Review bid' })).toBeDisabled()
    expect(document.body.textContent).not.toMatch(/Verified Item|100%/)
    expect(screen.getByText(/No reviews yet/)).toBeInTheDocument()
  })

  it('Buy Now is offered only when the server says so, and reviewing it is also a confirm step', async () => {
    buyNow.mockResolvedValue({ finalPrice: '5000000', auctionId: 7 })
    mount()
    await userEvent.click(screen.getByRole('button', { name: /buy now for 5.000.000/i }))
    const dialog = screen.getByRole('dialog', { name: 'Review purchase' })
    expect(buyNow).not.toHaveBeenCalled()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Buy now' }))
    expect(await screen.findByRole('dialog', { name: 'Order created' })).toBeInTheDocument()
    expect(buyNow.mock.calls[0][1]).toMatch(/.{8,}/)
  })

  it('Buy Now is disabled with the reason when the price reached it; closed lots show no bid form', () => {
    const { unmount } = mount(product({ capabilities: { canBid: true, canBuyNow: false, reasons: { buyNow: 'PRICE_REACHED' } } }))
    expect(screen.getByRole('button', { name: /buy now for/i })).toBeDisabled()
    expect(screen.getByText(/price has reached it/i)).toBeInTheDocument()
    unmount()
    mount(product({ status: 'ended' }))
    expect(screen.queryByRole('button', { name: 'Review bid' })).toBeNull()
    expect(screen.getByText('Closed', { selector: 'span' })).toBeInTheDocument()
  })

  it('the exact full amount is shown, not a rounded K/M figure', () => {
    mount(product({ currentPrice: '123456789', minimumNextBid: '123556789' }))
    expect(screen.getByText('123.456.789 ₫')).toBeInTheDocument()
    expect(screen.getByText('123.556.789 ₫')).toBeInTheDocument()
  })
})

describe('private viewer state (after reload the bidder still knows where they stand)', () => {
  it('a leader sees their maximum and cannot submit the public minimum (it is below their own maximum)', async () => {
    mount(product({ currentPrice: '1000000', minimumNextBid: '1100000', viewer: { status: 'leading', yourMaximum: '2000000', minimumBid: '2000001' } }))
    expect(screen.getByText('You are the highest bidder')).toBeInTheDocument()
    expect(screen.getByText('To raise your maximum')).toBeInTheDocument()
    expect(screen.getByText('2.000.000 ₫')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/new maximum bid/i), '1100000')
    await userEvent.click(screen.getByRole('button', { name: 'Review bid' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('alert')).toHaveTextContent('2.000.001 ₫')
    expect(placeBid).not.toHaveBeenCalled()
  })

  it('an outbid bidder sees it, with their old maximum, and the floor from the server', () => {
    mount(product({ currentPrice: '1200000', minimumNextBid: '1300000', viewer: { status: 'outbid', yourMaximum: '1100000', minimumBid: '1300000' } }))
    expect(screen.getByText('You have been outbid')).toBeInTheDocument()
    expect(screen.getByText('1.100.000 ₫')).toBeInTheDocument()
    expect(screen.getByLabelText(/your maximum bid/i)).toBeInTheDocument()
  })

  it('no viewer state (guest, seller, closed) shows no private banner', () => {
    mount(product({ viewer: null }))
    expect(screen.queryByText(/highest bidder|been outbid/i)).toBeNull()
  })
})

describe('closed lot result (winner and seller can always get back to the order)', () => {
  const closed = (over) => product({ status: 'ended', endTime: new Date(Date.now() - 60e3).toISOString(), currentPrice: '1234567', settledAt: new Date().toISOString(), winnerId: 9, winnerName: 'bob', ...over })
  const orderLink = () => screen.queryByRole('link', { name: /view order/i })

  it('the winner gets the exact price and a link to pay', () => {
    mount(closed({ winnerId: 5 }))
    expect(screen.getByText('You won this lot for 1.234.567 ₫')).toBeInTheDocument()
    expect(orderLink()).toHaveAttribute('href', '/order/7')
    expect(screen.queryByLabelText(/maximum bid/i)).toBeNull()
  })
  it('the seller gets the buyer and a link to the order', () => {
    mount(closed({ sellerId: 5, closeReason: 'buy_now' }))
    expect(screen.getByText('Bought now to @bob for 1.234.567 ₫')).toBeInTheDocument()
    expect(orderLink()).toHaveAttribute('href', '/order/7')
  })
  it('anyone else sees the public result and no order link', () => {
    mount(closed())
    expect(screen.getByText('Sold for 1.234.567 ₫')).toBeInTheDocument()
    expect(orderLink()).toBeNull()
  })
  it('before settlement nobody is told they won, even the last leader', () => {
    mount(closed({ winnerId: 5, settledAt: null }))
    expect(screen.getByText('Bidding has closed')).toBeInTheDocument()
    expect(screen.queryByText(/you won/i)).toBeNull()
    expect(orderLink()).toBeNull()
  })
  it('no winner and cancelled lots say so', () => {
    const { unmount } = mount(closed({ winnerId: null, bidCount: 0 }))
    expect(screen.getByText('Ended without a sale')).toBeInTheDocument()
    unmount()
    mount(closed({ status: 'cancelled' }))
    expect(screen.getByText('This listing was cancelled')).toBeInTheDocument()
  })
})

describe('what a commitment covers, and when it ends', () => {
  it('bid review names the amount as item price and says shipping is not included', async () => {
    mount()
    await typeAndReview('1500000')
    const dialog = screen.getByRole('dialog', { name: 'Review your bid' })
    expect(within(dialog).getByText('Your maximum (item price)')).toBeInTheDocument()
    expect(within(dialog).getByText('Not included, arranged with the seller')).toBeInTheDocument()
    expect(within(dialog).getByText(/does not hold money/)).toBeInTheDocument()
  })

  it('a leader whose maximum is above Buy Now is told buying ends the auction below it', async () => {
    mount(product({ buyNowPrice: '5000000', viewer: { status: 'leading', yourMaximum: '8000000', minimumBid: '8000001' } }))
    await userEvent.click(screen.getByRole('button', { name: /buy now for/i }))
    const dialog = screen.getByRole('dialog', { name: 'Review purchase' })
    expect(within(dialog).getByText(/below your maximum of 8\.000\.000 ₫/)).toBeInTheDocument()
  })

  it('shows the absolute deadline, the auto-extend rule, and announces an extension when the deadline moves', () => {
    const end = new Date(Date.now() + 3 * 60e3).toISOString()
    const { rerender } = mount(product({ endTime: end, autoExtend: true }))
    expect(screen.getByText(/^Ends \d{1,2} \w{3} \d{4}/)).toBeInTheDocument()
    expect(screen.getByText(/adds 5 minutes to the deadline/)).toBeInTheDocument()
    expect(screen.queryByText(/Deadline extended/)).toBeNull()
    rerender(<MemoryRouter><BiddingSection product={product({ endTime: new Date(Date.parse(end) + 5 * 60e3).toISOString(), autoExtend: true })} onChanged={vi.fn()} /></MemoryRouter>)
    expect(screen.getByText(/^Deadline extended to/)).toBeInTheDocument()
  })
})

describe('formatTimeLeft', () => {
  it('shows seconds in the final 5 minutes only when asked (the bid panel ticks every second, cards do not)', () => {
    const now = Date.parse('2026-10-23T10:00:00Z')
    const end = new Date(now + (3 * 60 + 7) * 1000)
    expect(formatTimeLeft(end, now, { seconds: true }).timeLeft).toBe('3m 7s')
    expect(formatTimeLeft(new Date(now + 42e3), now, { seconds: true }).timeLeft).toBe('42s')
    expect(formatTimeLeft(end, now).timeLeft).toBe('3m')
    expect(formatTimeLeft(new Date(now + 20 * 60e3), now, { seconds: true }).timeLeft).toBe('20m')
  })
})
