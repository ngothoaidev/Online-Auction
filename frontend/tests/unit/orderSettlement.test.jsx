import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const getByAuctionId = vi.fn()
vi.mock('../../src/services/orderService', () => ({ default: { getByAuctionId: (...a) => getByAuctionId(...a), getMessages: vi.fn().mockResolvedValue({ messages: [] }) } }))
vi.mock('../../src/services/auctionService', () => ({ default: {} }))
vi.mock('../../src/contexts/AuthContext', () => ({ useAuth: () => ({ user: { userId: 1 } }) }))

import OrderCompletion from '../../src/pages/OrderCompletion/index.jsx'
import realOrderService from '../../src/services/orderService.js'

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
