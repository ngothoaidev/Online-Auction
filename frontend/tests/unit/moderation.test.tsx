import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const apiFetch = vi.fn()
vi.mock('../../src/services/apiClient', () => ({ apiFetch: (...a) => apiFetch(...a) }))

import { FeedbackProvider, useFeedback } from '../../src/components/ui/Feedback'
import ReportListing from '../../src/pages/ProductDetail/ReportListing'
import Reports from '../../src/pages/AdminDashboard/Reports'

beforeEach(() => { apiFetch.mockReset() }) // braces: a returned function would run as a cleanup hook

function AskReason({ onResult, required = true }) {
  const { confirm } = useFeedback()
  return <button onClick={async () => onResult(await confirm({ title: 'Ban this user?', confirmLabel: 'Ban user', reason: { label: 'Reason', required } }))}>ask</button>
}

describe('confirm with a reason', () => {
  it('a required reason blocks confirmation until typed, then resolves { reason }', async () => {
    const onResult = vi.fn()
    render(<FeedbackProvider><AskReason onResult={onResult} /></FeedbackProvider>)
    await userEvent.click(screen.getByText('ask'))
    const dialog = screen.getByRole('dialog', { name: 'Ban this user?' })
    expect(within(dialog).getByRole('button', { name: 'Ban user' })).toBeDisabled()
    await userEvent.type(within(dialog).getByLabelText('Reason'), '  shill bidding  ')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Ban user' }))
    expect(onResult).toHaveBeenCalledWith({ reason: 'shill bidding' })
  })

  it('cancel resolves false; an optional reason may stay empty', async () => {
    const onResult = vi.fn()
    render(<FeedbackProvider><AskReason onResult={onResult} required={false} /></FeedbackProvider>)
    await userEvent.click(screen.getByText('ask'))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onResult).toHaveBeenLastCalledWith(false)
    await userEvent.click(screen.getByText('ask'))
    expect(screen.getByLabelText('Reason (optional)')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Ban user' }))
    expect(onResult).toHaveBeenLastCalledWith({ reason: '' })
  })
})

describe('ReportListing', () => {
  it('requires a reason (and details for "Something else"), then sends one report', async () => {
    apiFetch.mockResolvedValue({ report: { id: 1 } })
    render(<ReportListing auctionId={7} />)
    await userEvent.click(screen.getByRole('button', { name: 'Report this listing' }))
    const dialog = screen.getByRole('dialog', { name: 'Report this listing' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send report' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Choose a reason')
    await userEvent.click(within(dialog).getByLabelText('Something else'))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send report' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Describe the problem')
    expect(apiFetch).not.toHaveBeenCalled()

    await userEvent.click(within(dialog).getByLabelText('Counterfeit or replica'))
    await userEvent.type(within(dialog).getByLabelText('Details (optional)'), 'Logo font is wrong')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send report' }))
    expect(apiFetch).toHaveBeenCalledWith('/auction/7/reports', expect.objectContaining({ method: 'POST', body: { reason: 'counterfeit', details: 'Logo font is wrong' } }))
    expect(await screen.findByText('Thanks. An admin will review this listing.')).toBeInTheDocument()
  })

  it('an existing open report is acknowledged, not shown as an error', async () => {
    apiFetch.mockRejectedValue(Object.assign(new Error('dup'), { code: 'ALREADY_REPORTED' }))
    render(<ReportListing auctionId={7} />)
    await userEvent.click(screen.getByRole('button', { name: 'Report this listing' }))
    await userEvent.click(screen.getByLabelText('Misleading description or photos'))
    await userEvent.click(screen.getByRole('button', { name: 'Send report' }))
    expect(await screen.findByText(/already reported/)).toBeInTheDocument()
  })
})

describe('admin Reports page', () => {
  const report = { id: 3, auctionId: 9, reason: 'prohibited', details: 'ivory', status: 'open', reporter: 'buyer1', lotTitle: 'Carved tusk', lotStatus: 'active', lotBidCount: 2, seller: 'seller', createdAt: new Date().toISOString() }

  it('cancelling a listing needs a note and sends one keyed request; nothing is sent on cancel', async () => {
    apiFetch.mockImplementation(async (path) => (path.startsWith('/admin/reports?') ? { items: [report] } : { message: 'Listing cancelled and reports closed' }))
    render(<MemoryRouter><FeedbackProvider><Reports /></FeedbackProvider></MemoryRouter>)
    await screen.findAllByText('Carved tusk') // role queries over the whole table are slow in jsdom: wait for the row first
    await userEvent.click(screen.getByRole('button', { name: 'Cancel listing Carved tusk' }))
    let dialog = screen.getByRole('dialog', { name: 'Cancel this listing?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(apiFetch.mock.calls.filter(([p]) => p.includes('/resolve'))).toHaveLength(0)

    await userEvent.click(screen.getByRole('button', { name: 'Cancel listing Carved tusk' }))
    dialog = screen.getByRole('dialog', { name: 'Cancel this listing?' })
    expect(within(dialog).getByRole('button', { name: 'Cancel listing' })).toBeDisabled()
    await userEvent.type(within(dialog).getByLabelText('Decision note'), 'ivory is prohibited')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel listing' }))
    const resolve = apiFetch.mock.calls.filter(([p]) => p === '/admin/reports/3/resolve')
    expect(resolve).toHaveLength(1)
    expect(resolve[0][1].body).toEqual({ action: 'cancel_listing', note: 'ivory is prohibited' })
    expect(resolve[0][1].headers['Idempotency-Key']).toBeTruthy()
    expect(await screen.findByText('Listing cancelled and reports closed')).toBeInTheDocument()
  })
})
