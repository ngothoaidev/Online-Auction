import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FeedbackProvider } from '../../src/components/ui/Feedback.jsx'
import ProductList from '../../src/pages/AdminDashboard/ProductList.jsx'

// Shape returned by GET /search (backend serializers catalogAuction): category is a string, seller is an object.
const lot = {
  id: 9, title: 'Used iPhone 13', status: 'active', currentPrice: '22100000', startingPrice: '1000000',
  endTime: new Date(Date.now() + 3600e3).toISOString(), image: 'https://img.test/phone.jpg',
  category: 'Phones', seller: { username: 'demo_seller', rating: null, ratingCount: 0 },
}

afterEach(() => vi.unstubAllGlobals())

describe('admin product table', () => {
  it('reads the catalog DTO and shows exact VND, never dollars', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url) => ({
      ok: true,
      json: async () => (String(url).includes('/categories') ? [] : { data: [lot], metadata: { totalPages: 1, totalItems: 1 } }),
    })))
    render(<FeedbackProvider><ProductList /></FeedbackProvider>)

    expect(await screen.findByText('22.100.000 ₫')).toBeInTheDocument()
    expect(screen.getByText('Phones')).toBeInTheDocument()
    expect(screen.getByText('demo_seller')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Used iPhone 13' })).toHaveAttribute('src', lot.image)
    expect(screen.queryByText(/\$/)).toBeNull()
    expect(screen.queryByRole('button', { name: /export/i })).toBeNull()
  })
})
