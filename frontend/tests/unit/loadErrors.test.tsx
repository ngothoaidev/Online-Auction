import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FeedbackProvider } from '../../src/components/ui/Feedback'

// Stable object: components list `user` in effect deps, like the real AuthContext value.
const auth = { user: { userId: 5, id: 5, username: 'me' } }
vi.mock('../../src/contexts/AuthContext', () => ({ useAuth: () => auth }))

import BidHistory from '../../src/pages/ProductDetail/BidHistory'
import Description from '../../src/pages/ProductDetail/Description'
import { WatchlistProvider, useWatchlist } from '../../src/contexts/WatchlistContext'

const respond = (status, body) => ({ ok: status < 400, status, text: async () => JSON.stringify(body), json: async () => body })
afterEach(() => { vi.unstubAllGlobals(); localStorage.removeItem('authToken') })

describe('a failed read is an error, never "empty"', () => {
  it('bid history 503 says it could not load (not "No bids yet") and retry recovers', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(respond(503, { message: 'down' }))
      .mockResolvedValueOnce(respond(200, [{ id: 1, bidderId: 9, amount: '1500000', bidTime: new Date().toISOString(), bidder: { username: 'x' } }]))
    vi.stubGlobal('fetch', fetchMock)
    render(<BidHistory productId={1} sellerId={2} />)

    expect(await screen.findByText('Bid history could not be loaded')).toBeInTheDocument()
    expect(screen.queryByText('No bids yet')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('1.500.000 ₫')).toBeInTheDocument()
  })

  it('description that failed to load offers no Edit to its owner (saving would overwrite the real text)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(503, {})))
    render(<FeedbackProvider><Description productId={1} isOwner /></FeedbackProvider>)

    expect(await screen.findByText('The description could not be loaded')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /edit/i })).toBeNull()
  })

  it('watchlist that failed to load keeps hearts pending instead of showing them as unsaved', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(503, {})))
    localStorage.setItem('authToken', 'test-token')
    const Probe = () => { const w = useWatchlist(); return <span>{w.pending(7) ? 'pending' : 'usable'}</span> }
    render(<WatchlistProvider><Probe /></WatchlistProvider>)

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(screen.getByText('pending')).toBeInTheDocument()
  })
})
