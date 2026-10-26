import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { formatVnd, parseAmountInput, compareAmounts } from '../../src/utils/money.js'

const apiFetch = vi.fn()
vi.mock('../../src/services/apiClient.js', () => ({ apiFetch: (...a) => apiFetch(...a), isAbort: (e) => e?.name === 'AbortError', ApiError: class extends Error {} }))
let authUser = { userId: 1, id: 1, username: 'me' }
vi.mock('../../src/contexts/AuthContext', () => ({ useAuth: () => ({ user: authUser }) }))
vi.mock('../../src/contexts/AuthContext.jsx', () => ({ useAuth: () => ({ user: authUser }) }))

import { WatchlistProvider, useWatchlist } from '../../src/contexts/WatchlistContext.jsx'
import AuctionCard from '../../src/components/AuctionCard'
import SearchPage from '../../src/pages/SearchPage'

const lot = (over = {}) => ({ id: 7, title: 'Omega Seamaster', image: '/seed/lot-1.svg', category: 'Watches', currentPrice: '18000000', buyNowPrice: null, bidCount: 0, endTime: new Date(Date.now() + 3600e3).toISOString(), seller: { username: 'demo_seller', rating: null, ratingCount: 0 }, ...over })

beforeEach(() => { apiFetch.mockReset(); authUser = { userId: 1, id: 1, username: 'me' } })

describe('money display', () => {
  it('formats exact digits, never NaN', () => {
    expect(formatVnd('18000000')).toBe('18.000.000 ₫')
    expect(formatVnd('999999999999999')).toBe('999.999.999.999.999 ₫')
    expect(formatVnd('1000.00')).toBe('1.000 ₫')
    for (const bad of [null, undefined, '', 'abc', NaN, '-5', '1.5', '1000000000000000']) expect(formatVnd(bad)).toBe('—')
  })
  it('parses typed amounts and compares without floats', () => {
    expect(parseAmountInput('1.500.000')).toBe('1500000')
    expect(parseAmountInput('1 500 000')).toBe('1500000')
    expect(parseAmountInput('0')).toBeNull()
    expect(parseAmountInput('12.5x')).toBeNull()
    expect(compareAmounts('999999999999999', '999999999999998')).toBe(1)
  })
})

function Probe({ id }) {
  const w = useWatchlist()
  return <div><span data-testid="has">{String(w.has(id))}</span><span data-testid="busy">{String(w.pending(id))}</span><button onClick={() => w.toggle(id).catch(() => {})}>toggle</button></div>
}

describe('WatchlistContext', () => {
  it('hydrates from the server and writes desired state with PUT', async () => {
    apiFetch.mockImplementation(async (path, opts = {}) => (opts.method === 'PUT' ? { favorited: opts.body.favorited } : { auctionIds: [7] }))
    render(<WatchlistProvider><Probe id={7} /></WatchlistProvider>)
    await waitFor(() => expect(screen.getByTestId('has').textContent).toBe('true'))
    await userEvent.click(screen.getByText('toggle'))
    expect(screen.getByTestId('has').textContent).toBe('false')
    expect(apiFetch).toHaveBeenCalledWith('/users/favorites/7', expect.objectContaining({ method: 'PUT', body: { favorited: false } }))
  })

  it('rolls back when the write fails', async () => {
    apiFetch.mockImplementation(async (path, opts = {}) => { if (opts.method === 'PUT') throw new Error('boom'); return { auctionIds: [] } })
    render(<WatchlistProvider><Probe id={7} /></WatchlistProvider>)
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1))
    await userEvent.click(screen.getByText('toggle'))
    await waitFor(() => expect(screen.getByTestId('has').textContent).toBe('false'))
  })

  it('serialises rapid clicks per lot: writes are sent one after another and end on the last intent', async () => {
    const order = []
    let release
    apiFetch.mockImplementation(async (path, opts = {}) => {
      if (opts.method !== 'PUT') return { auctionIds: [] }
      order.push(`start:${opts.body.favorited}`)
      await new Promise((r) => { release = r })
      order.push(`end:${opts.body.favorited}`)
      return {}
    })
    render(<WatchlistProvider><Probe id={7} /></WatchlistProvider>)
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1))
    await userEvent.click(screen.getByText('toggle'))
    await userEvent.click(screen.getByText('toggle'))
    expect(order).toEqual(['start:true'])
    await act(async () => { release() })
    await waitFor(() => expect(order).toContain('start:false'))
    await act(async () => { release() })
    expect(order).toEqual(['start:true', 'end:true', 'start:false', 'end:false'])
    expect(screen.getByTestId('has').textContent).toBe('false')
  })

  it('forgets everything on logout', async () => {
    apiFetch.mockResolvedValue({ auctionIds: [7] })
    const { rerender } = render(<WatchlistProvider><Probe id={7} /></WatchlistProvider>)
    await waitFor(() => expect(screen.getByTestId('has').textContent).toBe('true'))
    authUser = null
    rerender(<WatchlistProvider><Probe id={7} /></WatchlistProvider>)
    await waitFor(() => expect(screen.getByTestId('has').textContent).toBe('false'))
  })
})

describe('AuctionCard', () => {
  const renderCard = (p, variant) => render(<MemoryRouter><WatchlistProvider><AuctionCard product={p} variant={variant} /></WatchlistProvider></MemoryRouter>)

  it('on the profile Wins / Sold tabs the card links back to the order; elsewhere it does not', async () => {
    apiFetch.mockResolvedValue({ auctionIds: [] })
    const { unmount } = renderCard(lot(), 'won')
    expect(screen.getByRole('link', { name: 'View order for Omega Seamaster' })).toHaveAttribute('href', '/order/7')
    unmount()
    renderCard(lot())
    expect(screen.queryByRole('link', { name: /view order/i })).toBeNull()
  })

  it('is an article with real links and a sibling favourite button; lots without bids show the starting price, not NaN', async () => {
    apiFetch.mockResolvedValue({ auctionIds: [] })
    renderCard(lot())
    expect(screen.getByRole('article')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Omega Seamaster' })).toHaveAttribute('href', '/auction/7')
    const heart = screen.getByRole('button', { name: /save omega seamaster/i })
    expect(heart).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('Starting price')).toBeInTheDocument()
    expect(screen.getByText('18.000.000 ₫')).toBeInTheDocument()
    expect(screen.getByText(/No reviews yet/)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/NaN|100%/)
    expect(screen.getByText('Not offered')).toBeInTheDocument()
  })

  it('shows the current bid and the real seller percentage; the heart reflects and updates the watchlist', async () => {
    apiFetch.mockImplementation(async (path, opts = {}) => (opts.method === 'PUT' ? {} : { auctionIds: [7] }))
    renderCard(lot({ bidCount: 3, bids: { amount: '19500000' }, seller: { username: 's', rating: 75, ratingCount: 4 }, buyNowPrice: '40000000' }))
    expect(screen.getByText('Current bid')).toBeInTheDocument()
    expect(screen.getByText('19.500.000 ₫')).toBeInTheDocument()
    expect(screen.getByText(/75% positive/)).toBeInTheDocument()
    expect(screen.getByText('3 bids')).toBeInTheDocument()
    const heart = await screen.findByRole('button', { name: /remove omega seamaster/i })
    expect(heart).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(heart)
    expect(await screen.findByRole('button', { name: /save omega seamaster/i })).toHaveAttribute('aria-pressed', 'false')
  })

  it('asks guests to sign in instead of failing silently', async () => {
    authUser = null
    renderCard(lot())
    await userEvent.click(screen.getByRole('button', { name: /save omega/i }))
    expect(screen.getByRole('status')).toHaveTextContent(/sign in/i)
    expect(apiFetch).not.toHaveBeenCalledWith(expect.stringContaining('/users/favorites/'), expect.anything())
  })
})

const Where = () => { const l = useLocation(); return <div data-testid="loc">{l.pathname + l.search}</div> }
const renderSearch = (url) => render(<MemoryRouter initialEntries={[url]}><Where /><Routes><Route path="/search" element={<SearchPage />} /></Routes></MemoryRouter>)
const page = (items, totalPages = 1) => ({ data: items, metadata: { totalPages, totalItems: items.length } })

describe('SearchPage', () => {
  it('shows loading, results with a count, and sends the auth-aware request for the URL state', async () => {
    apiFetch.mockImplementation(async (path) => (path.startsWith('/categories') ? [] : page([lot()])))
    renderSearch('/search?q=omega&category=Watches')
    expect(screen.getByText('Loading lots')).toBeInTheDocument()
    expect(await screen.findByText('1 lot')).toBeInTheDocument()
    expect(apiFetch).toHaveBeenCalledWith('/search?q=omega&category=Watches', expect.objectContaining({ signal: expect.anything() }))
  })

  it('empty and error states are explicit; retry refetches', async () => {
    let fail = true
    apiFetch.mockImplementation(async (path) => { if (path.startsWith('/categories')) return []; if (fail) throw new Error('down'); return page([]) })
    renderSearch('/search?q=zzz')
    expect(await screen.findByText('Search failed')).toBeInTheDocument()
    fail = false
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('No lots match')).toBeInTheDocument()
  })

  it('applying a filter writes the URL and resets paging to page 1', async () => {
    apiFetch.mockImplementation(async (path) => (path.startsWith('/categories') ? [{ id: 1, name: 'Watches', subcategories: [{ id: 2, name: 'Vintage Watches' }] }] : page([lot()], 5)))
    renderSearch('/search?q=omega&page=4')
    await screen.findByText('1 lot')
    const side = screen.getByRole('complementary', { name: 'Filters' })
    const { within } = await import('@testing-library/react')
    await userEvent.selectOptions(within(side).getByLabelText('Category'), 'Vintage Watches')
    await userEvent.type(within(side).getByLabelText('Min price (₫)'), '1000000')
    await userEvent.click(within(side).getByRole('button', { name: 'Apply' }))
    await waitFor(() => expect(screen.getByTestId('loc').textContent).toBe('/search?q=omega&category=Vintage+Watches&minPrice=1000000'))
  })

  it('rejects non-numeric prices before they reach the URL', async () => {
    apiFetch.mockImplementation(async (path) => (path.startsWith('/categories') ? [] : page([lot()])))
    renderSearch('/search')
    await screen.findByText('1 lot')
    const side = screen.getByRole('complementary', { name: 'Filters' })
    const { within } = await import('@testing-library/react')
    await userEvent.type(within(side).getByLabelText('Max price (₫)'), '12abc')
    expect(within(side).getByRole('alert')).toHaveTextContent(/whole numbers/i)
    expect(within(side).getByRole('button', { name: 'Apply' })).toBeDisabled()
  })

  it('ignores a stale response: an older request that resolves late cannot overwrite the newer one', async () => {
    const pending = {}
    apiFetch.mockImplementation((path) => {
      if (path.startsWith('/categories')) return Promise.resolve([])
      return new Promise((resolve) => { pending[path] = resolve }) // deliberately ignores abort: worst case
    })
    function GoB() { const nav = useNavigate(); return <button onClick={() => nav('/search?q=b')}>go b</button> }
    render(<MemoryRouter initialEntries={['/search?q=a']}><GoB /><Routes><Route path="/search" element={<SearchPage />} /></Routes></MemoryRouter>)
    await waitFor(() => expect(pending['/search?q=a']).toBeTypeOf('function'))
    await userEvent.click(screen.getByText('go b'))
    await waitFor(() => expect(pending['/search?q=b']).toBeTypeOf('function'))
    await act(async () => { pending['/search?q=b'](page([lot({ id: 2, title: 'Newer result' })])) })
    expect(await screen.findByText('Newer result')).toBeInTheDocument()
    await act(async () => { pending['/search?q=a'](page([lot({ id: 1, title: 'Older result' })])) })
    expect(screen.queryByText('Older result')).toBeNull()
    expect(screen.getByText('Newer result')).toBeInTheDocument()
  })
})
