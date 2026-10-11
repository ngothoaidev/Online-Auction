import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { validateBid } from '../../src/utils/bid.js'

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
    expect(await screen.findByRole('dialog', { name: 'Purchase complete' })).toBeInTheDocument()
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
