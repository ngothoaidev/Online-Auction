import { describe, it, expect, vi } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { searchUrl, TAB_SEARCH_SORT } from '../../src/utils/searchUrl.js'

vi.mock('../../src/services/auctionService', () => ({ default: { getTopAuctions: vi.fn().mockResolvedValue([]) } }))
vi.mock('../../src/components/AuctionCard', () => ({ default: () => null }))
const logout = vi.fn()
const authState = { user: { role: 'admin' }, loading: false }
vi.mock('../../src/contexts/AuthContext.jsx', () => ({ useAuth: () => ({ ...authState, logout }) }))

vi.mock('../../src/pages/AdminDashboard/ProductList.jsx', () => ({ default: () => null }))
vi.mock('../../src/pages/AdminDashboard/UserList.jsx', () => ({ default: () => null }))
vi.mock('../../src/pages/AdminDashboard/UpgradeRequests.jsx', () => ({ default: () => null }))

import ProductTabs from '../../src/pages/HomePage/ProductTabs.jsx'
import MobileMenu from '../../src/components/Header/MobileMenu.jsx'
import ProtectedRoute from '../../src/components/ProtectedRoute.jsx'
import AdminDashboard from '../../src/pages/AdminDashboard/index.jsx'

const Where = () => { const l = useLocation(); return <div data-testid="where">{l.pathname + l.search}</div> }

describe('searchUrl', () => {
  it('encodes names with spaces, accents and ampersands', () => {
    expect(searchUrl({ category: 'Đồng hồ & Trang sức' })).toBe('/search?category=%C4%90%E1%BB%93ng+h%E1%BB%93+%26+Trang+s%E1%BB%A9c')
    expect(new URL(searchUrl({ category: 'A&B=C' }), 'http://x').searchParams.get('category')).toBe('A&B=C')
    expect(searchUrl()).toBe('/search')
  })
})

describe('Home "View All"', () => {
  it('links to /search with the sort of the active tab (never a sort label as category) and tab clicks do not crash', async () => {
    render(<MemoryRouter><ProductTabs /></MemoryRouter>)
    const link = await screen.findByRole('link', { name: /view all/i })
    expect(link.getAttribute('href')).toBe(`/search?sortBy=${TAB_SEARCH_SORT.endingSoon}`)
    await userEvent.click(screen.getByRole('button', { name: /most active/i }))
    expect((await screen.findByRole('link', { name: /view all/i })).getAttribute('href')).toBe('/search?sortBy=popularity')
    await userEvent.click(screen.getByRole('link', { name: /view all/i }))
  })
})

describe('Mobile category menu', () => {
  it('uses the /search route with an encoded category query', async () => {
    const categories = [{ id: 1, name: 'Art', subcategories: [{ id: 2, name: 'Tranh sơn dầu & màu nước' }] }]
    render(<MemoryRouter><MobileMenu open onClose={() => {}} user={null} categories={categories} logout={() => {}} /></MemoryRouter>)
    await userEvent.click(screen.getByRole('button', { name: 'Art subcategories' }))
    const href = screen.getByRole('link', { name: /Tranh sơn dầu/ }).getAttribute('href')
    expect(href.startsWith('/search?')).toBe(true)
    expect(new URL(href, 'http://x').searchParams.get('category')).toBe('Tranh sơn dầu & màu nước')
  })
})

describe('Admin logout', () => {
  it('clears the session through AuthContext and leaves the admin page', async () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Where />
        <Routes>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/login" element={<div>login page</div>} />
        </Routes>
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole('button', { name: /log out/i }))
    expect(logout).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('login page')).toBeInTheDocument()
    expect(screen.getByTestId('where').textContent).toBe('/login')
  })
})

describe('Back into /admin after logout', () => {
  it('is redirected to login and renders nothing from the admin page', async () => {
    authState.user = null
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route element={<ProtectedRoute requiredRole="admin" />}>
            <Route path="/admin" element={<div>admin secrets</div>} />
          </Route>
          <Route path="/login" element={<div>login page</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByText('login page')).toBeInTheDocument()
    expect(screen.queryByText('admin secrets')).toBeNull()
    authState.user = { role: 'admin' }
  })
})

describe('useNav().go', () => {
  it('passes router options through, so notices like "check your email" reach the login page', async () => {
    const { useNav } = await import('../../src/hooks/useNavigate.js')
    const Go = () => { const nav = useNav(); return <button onClick={() => nav.go('/login', { state: { message: 'Check your email' } })}>go</button> }
    const Notice = () => <p>{useLocation().state?.message ?? 'no notice'}</p>
    render(<MemoryRouter initialEntries={['/register']}><Routes><Route path="/register" element={<Go />} /><Route path="/login" element={<Notice />} /></Routes></MemoryRouter>)
    await userEvent.click(screen.getByRole('button', { name: 'go' }))
    expect(screen.getByText('Check your email')).toBeInTheDocument()
  })
})

describe('account navigation (design audit F06: phones had no way to bids, saved lots, orders or selling)', () => {
  it('the same role-aware destinations are offered everywhere', async () => {
    const { accountLinks } = await import('../../src/components/Header/accountLinks.js')
    const labels = (role) => accountLinks({ username: 'an', role }).map((l) => l.label)
    expect(labels('buyer')).toEqual(['Notifications', 'My bids', 'Wins and orders', 'Saved lots', 'Start selling', 'My profile'])
    expect(labels('seller')).toEqual(expect.arrayContaining(['Create listing', 'My listings', 'Sold']))
    expect(labels('seller')).not.toContain('Start selling')
    expect(labels('admin')).toContain('Admin dashboard')
    expect(accountLinks(null)).toEqual([])
    expect(accountLinks({ username: 'an', role: 'buyer' }).find((l) => l.label === 'My bids').to).toBe('/profile/an?tab=active-bids')
  })

  it('the mobile menu lists them for a signed-in user and not for a guest', () => {
    const { unmount } = render(<MemoryRouter><MobileMenu open onClose={() => {}} user={{ username: 'sel', role: 'seller' }} categories={[]} logout={() => {}} /></MemoryRouter>)
    const account = screen.getByRole('navigation', { name: 'Account' })
    expect(within(account).getByRole('link', { name: 'My bids' })).toHaveAttribute('href', '/profile/sel?tab=active-bids')
    expect(within(account).getByRole('link', { name: 'Create listing' })).toHaveAttribute('href', '/create-auction')
    unmount()
    render(<MemoryRouter><MobileMenu open onClose={() => {}} user={null} categories={[]} logout={() => {}} /></MemoryRouter>)
    expect(screen.queryByRole('navigation', { name: 'Account' })).toBeNull()
  })
})

describe('desktop Categories button', () => {
  it('a click right after hovering keeps the menu open; the next click closes it; keyboard toggles as before', async () => {
    const { default: CategoryDropper } = await import('../../src/components/Header/CategoryDropper.jsx')
    render(<MemoryRouter><CategoryDropper categories={[{ id: 1, name: 'Watches', subcategories: [] }]} /></MemoryRouter>)
    const button = screen.getByRole('button', { name: /categories/i })
    fireEvent.mouseEnter(button.parentElement)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'false')
    fireEvent.mouseLeave(button.parentElement)
    button.focus()
    await userEvent.keyboard('{Enter}')
    expect(button).toHaveAttribute('aria-expanded', 'true')
  })
})
