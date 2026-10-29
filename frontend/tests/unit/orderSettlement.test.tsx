import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const getByAuctionId = vi.fn()
vi.mock('../../src/services/orderService', () => ({ default: { getByAuctionId: (...a) => getByAuctionId(...a), getMessages: vi.fn().mockResolvedValue({ messages: [] }), markMessagesRead: vi.fn().mockResolvedValue() } }))
vi.mock('../../src/services/auctionService', () => ({ default: {} }))
vi.mock('../../src/contexts/AuthContext', () => ({ useAuth: () => ({ user: { userId: 1 } }) }))

import OrderCompletion from '../../src/pages/OrderCompletion/index'
import realOrderService from '../../src/services/orderService'

const mount = () => render(
  <MemoryRouter initialEntries={['/order/7']}>
    <Routes><Route path="/order/:auctionId" element={<OrderCompletion />} /></Routes>
  </MemoryRouter>,
)

describe('OrderCompletion while settlement is pending', () => {
  beforeEach(() => { vi.useFakeTimers(); getByAuctionId.mockReset() })
  afterEach(() => { vi.useRealTimers() })

  it('shows a progress state, polls after retryAfter, and gives up politely with a manual retry', async () => {
    getByAuctionId.mockResolvedValue({ status: 'settlement_pending', retryAfter: 5 })
    mount()
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(screen.getByText('Finalising the auction')).toBeInTheDocument()
    expect(getByAuctionId).toHaveBeenCalledTimes(1)

    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(getByAuctionId).toHaveBeenCalledTimes(2)

    for (let i = 0; i < 30; i++) await act(async () => { await vi.advanceTimersByTimeAsync(5000) }) // each poll re-renders and re-arms the timer
    expect(screen.getByText('Settlement is taking longer than usual')).toBeInTheDocument()
    const calls = getByAuctionId.mock.calls.length
    await act(async () => { await vi.advanceTimersByTimeAsync(60000) })
    expect(getByAuctionId.mock.calls.length).toBe(calls) // polling stopped
    expect(screen.getByRole('button', { name: /check again/i })).toBeInTheDocument()
  })

  it('shows the API error (e.g. no valid winner) instead of spinning', async () => {
    getByAuctionId.mockRejectedValue(new Error('No order found - auction ended without a valid winner'))
    mount()
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(screen.getByText(/ended without a valid winner/)).toBeInTheDocument()
  })
})

describe('OrderCompletion summary', () => {
  it('shows the exact final price, not a rounded 1.2M', async () => {
    Element.prototype.scrollIntoView ??= () => {}
    getByAuctionId.mockReset().mockResolvedValue({ order: {
      order: { id: 3, auctionId: 7, buyerId: 1, sellerId: 2, finalPrice: '1234567', status: 'pending_payment', paymentMode: 'manual' },
      auction: { id: 7, title: 'Lot', image: null }, buyer: { username: 'b' }, seller: { username: 's' },
    } })
    mount()
    expect((await screen.findAllByText('1.234.567 ₫')).length).toBeGreaterThan(0) // header and item summary
    expect(screen.queryByText(/1\.2M/)).toBeNull()
  })

  it('seller "Cancel Order" opens a real dialog that Escape closes', async () => {
    Element.prototype.scrollIntoView ??= () => {}
    getByAuctionId.mockReset().mockResolvedValue({ order: {
      order: { id: 3, auctionId: 7, buyerId: 2, sellerId: 1, finalPrice: '1000', status: 'pending_payment', paymentMode: 'manual' },
      auction: { id: 7, title: 'Lot', image: null }, buyer: { username: 'b' }, seller: { username: 's' },
    } })
    mount()
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel Order' }))
    const dialog = screen.getByRole('dialog', { name: 'Cancel order' })
    expect(document.activeElement).toBe(screen.getByLabelText(/reason for cancellation/i))
    expect(dialog.contains(document.activeElement)).toBe(true)
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('order page leads with the next step (design audit F03/F20)', () => {
  const buyerOrder = (over = {}) => ({ order: {
    order: { id: 3, auctionId: 7, buyerId: 1, sellerId: 2, finalPrice: '1234567', status: 'pending_payment', paymentDueAt: '2026-10-25T10:00:00Z', ...over },
    auction: { id: 7, title: 'Lot', image: null }, buyer: { username: 'b' }, seller: { username: 's' },
  }, payment: { mode: 'manual', available: ['manual', 'mock'], attempts: [] } }) // what the API sends for a new order

  it('header: whose turn, the exact item price and the deadline; no photo shows a labelled placeholder, not a broken image', async () => {
    getByAuctionId.mockReset().mockResolvedValue(buyerOrder())
    mount()
    expect(await screen.findByRole('heading', { level: 1, name: 'Pay the seller' })).toBeInTheDocument()
    expect(screen.getByText('Your turn')).toBeInTheDocument()
    expect(screen.getAllByText('1.234.567 ₫').length).toBeGreaterThan(0)
    expect(screen.getByText('Pay before')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Lot: no photo' })).toBeInTheDocument()
    expect(document.querySelector('img:not([src])')).toBeNull()
  })

  it('opening the page never scrolls the page itself (the chat used to pull it down)', async () => {
    const pageScroll = vi.fn()
    Element.prototype.scrollIntoView = pageScroll
    getByAuctionId.mockReset().mockResolvedValue(buyerOrder())
    mount()
    await screen.findByRole('heading', { level: 1, name: 'Pay the seller' })
    await act(async () => {})
    expect(pageScroll).not.toHaveBeenCalled()
  })

  it('two payment channels: nothing to fill in until the buyer picks one, then only that form', async () => {
    getByAuctionId.mockReset().mockResolvedValue(buyerOrder())
    mount()
    await screen.findByRole('heading', { level: 1, name: 'Pay the seller' })
    expect(screen.queryByRole('button', { name: 'Submit Payment Details' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Pay with the mock gateway' })).toBeNull()
    await userEvent.click(screen.getByRole('radio', { name: /pay the seller directly/i }))
    expect(screen.getByRole('button', { name: 'Submit Payment Details' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Pay with the mock gateway' })).toBeNull()
  })

  it('a locked mode shows only its own form, with no choice', async () => {
    getByAuctionId.mockReset().mockResolvedValue({ ...buyerOrder(), payment: { mode: 'mock', available: ['manual', 'mock'], attempts: [] } })
    mount()
    expect(await screen.findByRole('region', { name: 'Pay with the mock gateway' })).toBeInTheDocument()
    expect(screen.queryByRole('radio')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Submit Payment Details' })).toBeNull()
  })

  it('steps are named for what happens: the seller ships at step 2 in both payment paths', async () => {
    getByAuctionId.mockReset().mockResolvedValue(buyerOrder({ status: 'pending_delivery' }))
    mount()
    expect(await screen.findByRole('heading', { level: 1, name: 'Paid. Waiting for the seller to ship' })).toBeInTheDocument()
    for (const label of ['Payment', 'Shipping', 'Receipt', 'Reviews']) expect(screen.getByText(label)).toBeInTheDocument()
    expect(screen.queryByText('Confirmation')).toBeNull()
  })
})

describe('orderService.getByAuctionId', () => {
  it('calls the read-only /order/auction/:id endpoint', async () => {
    vi.useRealTimers()
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'settlement_pending', retryAfter: 5 }) })
    vi.stubGlobal('fetch', fetchMock)
    const actual = await vi.importActual('../../src/services/orderService.js')
    const out = await actual.default.getByAuctionId(7)
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/order\/auction\/7$/)
    expect(out.status).toBe('settlement_pending')
    vi.unstubAllGlobals()
    void realOrderService
  })
})
