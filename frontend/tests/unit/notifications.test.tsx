import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const apiFetch = vi.fn()
vi.mock('../../src/services/apiClient', () => ({ apiFetch: (...a) => apiFetch(...a) }))

import NotificationsLink from '../../src/components/Header/NotificationsLink'
import Notifications from '../../src/pages/Notifications/index'

const items = [
  { id: 2, kind: 'outbid', title: 'You were outbid on "Brass sextant"', body: 'The current price is 3.100 ₫.', link: '/auction/5', createdAt: new Date().toISOString(), read: false },
  { id: 1, kind: 'shipped', title: '"Clock" has shipped', body: 'Confirm receipt once it arrives.', link: '/order/4', createdAt: new Date().toISOString(), read: true },
]
const route = (path) => apiFetch.mock.calls.filter(([p]) => p === path)

beforeEach(() => {
  apiFetch.mockReset()
  apiFetch.mockImplementation(async (path) => {
    if (path === '/notifications/unread-count') return { unread: 3 }
    if (path === '/notifications') return { items, unread: 1 }
    return { unread: 0 }
  })
})

describe('NotificationsLink', () => {
  it('puts the unread count in the accessible name and refreshes after a local read', async () => {
    render(<MemoryRouter initialEntries={['/notifications']}><NotificationsLink /><Notifications /></MemoryRouter>)
    expect(await screen.findByRole('link', { name: 'Notifications, 3 unread' })).toHaveAttribute('href', '/notifications')
    const markAll = await screen.findByRole('button', { name: 'Mark all as read' })
    apiFetch.mockImplementation(async (path) => (path === '/notifications' ? { items, unread: 0 } : { unread: 0 }))
    await userEvent.click(markAll)
    expect(await screen.findByRole('link', { name: 'Notifications' })).toBeInTheDocument()
  })
})

describe('Notifications page', () => {
  const mount = () => render(
    <MemoryRouter initialEntries={['/notifications']}>
      <Routes>
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/auction/:id" element={<p>lot page</p>} />
      </Routes>
    </MemoryRouter>,
  )

  it('lists newest first and says "Unread" in text, not only with colour', async () => {
    mount()
    const buttons = await screen.findAllByRole('button', { name: /outbid|shipped/ })
    expect(buttons[0]).toHaveTextContent('Unread: You were outbid')
    expect(buttons[1]).not.toHaveTextContent('Unread')
    expect(screen.getByRole('status')).toHaveTextContent('1 unread')
  })

  it('opening an unread notification marks it read and follows its link', async () => {
    mount()
    await userEvent.click(await screen.findByRole('button', { name: /outbid/ }))
    expect(route('/notifications/2/read')).toHaveLength(1)
    expect(await screen.findByText('lot page')).toBeInTheDocument()
  })

  it('mark all as read, empty and error states', async () => {
    const { unmount } = mount()
    await userEvent.click(await screen.findByRole('button', { name: 'Mark all as read' }))
    expect(route('/notifications/read-all')).toHaveLength(1)
    unmount()

    apiFetch.mockImplementation(async () => ({ items: [], unread: 0 }))
    const empty = mount()
    expect(await screen.findByText('No notifications yet')).toBeInTheDocument()
    empty.unmount()

    apiFetch.mockImplementation(async () => { throw new Error('offline') })
    mount()
    expect(await screen.findByText('Notifications could not be loaded')).toBeInTheDocument()
    apiFetch.mockImplementation(async () => ({ items, unread: 1 }))
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(screen.getAllByRole('button', { name: /outbid|shipped/ })).toHaveLength(2))
  })
})
