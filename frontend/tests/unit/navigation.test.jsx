import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { searchUrl, TAB_SEARCH_SORT } from '../../src/utils/searchUrl.js'

vi.mock('../../src/services/auctionService', () => ({ default: { getTopAuctions: vi.fn().mockResolvedValue([]) } }))
vi.mock('../../src/components/AuctionCard', () => ({ default: () => null }))
const logout = vi.fn()
const authState = { user: { role: 'admin' }, loading: false }
vi.mock('../../src/contexts/AuthContext.jsx', () => ({ useAuth: () => ({ ...authState, logout }) }))
vi.mock('../../src/pages/AdminDashboard/CategoryList.jsx', () => ({ default: () => <div>categories</div> }))
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
    render(<MemoryRouter><MobileMenu user={null} setIsMobileMenuOpen={() => {}} categories={categories} logout={() => {}} /></MemoryRouter>)
    await userEvent.click(screen.getByRole('button', { name: 'Art' }))
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
    await userEvent.click(screen.getByRole('button', { name: /logout/i }))
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
