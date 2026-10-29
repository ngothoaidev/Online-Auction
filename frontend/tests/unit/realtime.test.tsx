import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, renderHook, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const apiFetch = vi.fn()
vi.mock('../../src/services/apiClient.js', () => ({ API_URL: 'http://api', apiFetch: (...a) => apiFetch(...a), isAbort: (e) => e?.name === 'AbortError' }))
vi.mock('../../src/contexts/AuthContext.jsx', () => ({ useAuth: () => ({ user: null }) }))
vi.mock('../../src/contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }))
vi.mock('../../src/contexts/WatchlistContext.jsx', () => ({ useWatchlist: () => ({ has: () => false, toggle: vi.fn() }) }))
vi.mock('../../src/services/auctionService', () => ({ default: {} }))

import { useAuction } from '../../src/hooks/useAuction'
import BiddingSection from '../../src/pages/ProductDetail/BiddingSection'

class FakeEventSource {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSED = 2
  static all = []
  constructor(url) { this.url = url; this.readyState = 0; this.listeners = {}; FakeEventSource.all.push(this) }
  addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn) }
  close() { this.readyState = 2; this.closed = true }
  // test drivers
  open() { this.readyState = 1; return this.onopen?.() }
  push(data) { this.onmessage?.({ data: JSON.stringify(data) }) }
  reset() { (this.listeners.reset ?? []).forEach((fn) => fn({ data: '{}' })) }
  fail(readyState) { this.readyState = readyState; this.onerror?.() }
}
const last = () => FakeEventSource.all.at(-1)

const snapshot = (over = {}) => ({ id: 7, status: 'active', currentPrice: '1000', bidCount: 1, version: 3, endTime: '2030-01-01T00:00:00Z', serverTime: new Date().toISOString(), minimumNextBid: '1100', ...over })
const flush = () => act(() => vi.advanceTimersByTimeAsync(0))

beforeEach(() => {
  vi.useFakeTimers()
  FakeEventSource.all = []
  globalThis.EventSource = FakeEventSource
  apiFetch.mockReset()
  apiFetch.mockResolvedValue(snapshot())
})
afterEach(() => { vi.useRealTimers(); delete globalThis.EventSource })

async function mountHook() {
  const hook = renderHook(() => useAuction('7'))
  await flush()
  return hook
}

describe('useAuction live updates', () => {
  it('subscribes from the loaded version; a newer event shows at once and triggers one debounced refetch', async () => {
    const { result } = await mountHook()
    expect(last().url).toBe('http://api/auction/7/events?since=3')
    await act(async () => { await last().open() })
    expect(result.current.connection).toBe('live')

    apiFetch.mockResolvedValue(snapshot({ currentPrice: '1500', bidCount: 2, version: 4, minimumNextBid: '1600' }))
    act(() => { last().push({ type: 'auction.bid_placed', auctionId: 7, version: 4, currentPrice: '1500', bidCount: 2 }) })
    expect(result.current.data.currentPrice).toBe('1500')
    expect(apiFetch).toHaveBeenCalledTimes(1)
    await act(() => vi.advanceTimersByTimeAsync(300))
    expect(apiFetch).toHaveBeenCalledTimes(2)
    expect(result.current.data.minimumNextBid).toBe('1600')
  })

  it('drops duplicate, out-of-order and foreign events', async () => {
    const { result } = await mountHook()
    act(() => {
      last().push({ auctionId: 7, version: 3, currentPrice: '9' })      // duplicate of what we have
      last().push({ auctionId: 7, version: 2, currentPrice: '8' })      // older
      last().push({ auctionId: 99, version: 10, currentPrice: '7' })    // another lot
    })
    await act(() => vi.advanceTimersByTimeAsync(300))
    expect(result.current.data.currentPrice).toBe('1000')
    expect(apiFetch).toHaveBeenCalledTimes(1)
  })

  it('a late fetch response older than a pushed event never moves the page back', async () => {
    const { result } = await mountHook()
    let resolveOld
    apiFetch.mockImplementationOnce(() => new Promise((r) => { resolveOld = r }))
    act(() => { result.current.refresh() })
    act(() => { last().push({ auctionId: 7, version: 5, currentPrice: '2000' }) })
    apiFetch.mockResolvedValue(snapshot({ version: 5, currentPrice: '2000' }))
    await act(async () => { resolveOld(snapshot({ version: 4, currentPrice: '1500' })) })
    expect(result.current.data.currentPrice).toBe('2000')
  })

  it('server reset -> refetch', async () => {
    await mountHook()
    await act(async () => { last().reset() })
    expect(apiFetch).toHaveBeenCalledTimes(2)
  })

  it('stream refused (CLOSED): stale + 10s polling + backoff reconnect from the current version; refetch before live again', async () => {
    const { result } = await mountHook()
    const first = last()
    await act(async () => { await first.open() })
    act(() => { first.fail(FakeEventSource.CLOSED) })
    expect(result.current.connection).toBe('stale')
    expect(first.closed).toBe(true)

    await act(() => vi.advanceTimersByTimeAsync(1000))         // backoff 1s -> new connection
    const second = last()
    expect(second).not.toBe(first)
    expect(second.url).toBe('http://api/auction/7/events?since=3')
    act(() => { second.fail(FakeEventSource.CLOSED) })         // still down -> backoff 2s
    await act(() => vi.advanceTimersByTimeAsync(10_000))        // poll fallback fired meanwhile
    expect(apiFetch.mock.calls.length).toBeGreaterThanOrEqual(2)

    const calls = apiFetch.mock.calls.length
    const third = last()
    await act(async () => { await third.open() })
    expect(apiFetch.mock.calls.length).toBe(calls + 1)          // resync on recovery
    expect(result.current.connection).toBe('live')
    await act(() => vi.advanceTimersByTimeAsync(30_000))
    expect(apiFetch.mock.calls.length).toBe(calls + 1)          // polling stopped
  })

  it('browser auto-retry (CONNECTING) is left to EventSource; offline/online is reflected', async () => {
    const { result } = await mountHook()
    await act(async () => { await last().open() })
    const es = last()
    act(() => { es.fail(FakeEventSource.CONNECTING) })
    expect(result.current.connection).toBe('stale')
    await act(() => vi.advanceTimersByTimeAsync(5000))
    expect(last()).toBe(es)                                     // no manual reconnect while the browser retries
    await act(async () => { await es.open() })
    expect(result.current.connection).toBe('live')

    act(() => { window.dispatchEvent(new Event('offline')) })
    expect(result.current.connection).toBe('offline')
    act(() => { window.dispatchEvent(new Event('online')) })
    expect(last()).not.toBe(es)
    expect(result.current.connection).toBe('connecting')
  })

  it('clock offset comes from the server time of fresh responses', async () => {
    apiFetch.mockResolvedValue(snapshot({ serverTime: new Date(Date.now() + 90_000).toISOString() }))
    const { result } = await mountHook()
    expect(result.current.clockOffset).toBeGreaterThan(85_000)
    expect(result.current.clockOffset).toBeLessThan(95_000)
  })
})

describe('BiddingSection clock and connection', () => {
  const product = (over = {}) => ({
    id: 7, title: 'Lot', status: 'active', sellerName: 's', seller: { rating: null }, currentPrice: '1000', stepPrice: '100', minimumNextBid: '1100',
    bidCount: 1, endTime: new Date(Date.now() + 30_000).toISOString(), capabilities: { canBid: true, canBuyNow: false, reasons: {} }, ...over,
  })
  const mount = (props) => render(<MemoryRouter><BiddingSection product={product()} onChanged={vi.fn()} {...props} /></MemoryRouter>)

  it('uses the server clock: 30s left locally but the server is 60s ahead -> closed', () => {
    mount({ clockOffset: 60_000 })
    expect(screen.getByText('Bidding closed')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Review bid' })).toBeNull()
  })

  it('closes by itself when the deadline passes while watching', async () => {
    mount({ clockOffset: 0 })
    expect(screen.getByRole('button', { name: 'Review bid' })).toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(31_000))
    expect(screen.queryByRole('button', { name: 'Review bid' })).toBeNull()
  })

  it('says honestly when live updates are paused', () => {
    mount({ connection: 'stale' })
    expect(screen.getAllByRole('status').some((n) => /paused/i.test(n.textContent))).toBe(true)
  })
})
