import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const createPaymentAttempt = vi.fn()
const simulateMockPayment = vi.fn()
vi.mock('../../src/services/orderService', () => ({ default: { createPaymentAttempt: (...a) => createPaymentAttempt(...a), simulateMockPayment: (...a) => simulateMockPayment(...a) } }))

import MockPaymentPanel from '../../src/pages/OrderCompletion/MockPaymentPanel.jsx'

const order = { id: 9, finalPrice: '12500000', shippingAddress: '', buyerPhone: '' }
const attempt = (over = {}) => ({ id: 'a1', reference: 'mock_abc', amount: '12500000', currency: 'VND', status: 'created', ...over })
const mount = (payment = { mode: 'manual', available: ['manual', 'mock'], attempts: [] }, onChanged = vi.fn().mockResolvedValue()) =>
  ({ onChanged, ...render(<MockPaymentPanel order={order} payment={payment} onChanged={onChanged} />) })

beforeEach(() => { createPaymentAttempt.mockReset(); simulateMockPayment.mockReset() })

describe('MockPaymentPanel', () => {
  it('says plainly that no real money moves and shows the server amount exactly', () => {
    mount()
    expect(screen.getByText('no real money moves')).toBeInTheDocument()
    expect(screen.getByText('12.500.000 ₫')).toBeInTheDocument()
  })

  it('missing address/phone are explained inline and nothing is sent', async () => {
    mount()
    await userEvent.click(screen.getByRole('button', { name: 'Start mock payment' }))
    expect(createPaymentAttempt).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Delivery address')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getAllByRole('alert').map((n) => n.textContent)).toEqual(['Enter the delivery address', 'Enter a contact phone number'])
  })

  it('starting sends one request even on a double click, then reloads the order', async () => {
    let finish
    createPaymentAttempt.mockImplementation(() => new Promise((r) => { finish = r }))
    const { onChanged } = mount()
    await userEvent.type(screen.getByLabelText('Delivery address'), '1 Main St')
    await userEvent.type(screen.getByLabelText('Contact phone'), '0123456789')
    const button = screen.getByRole('button', { name: 'Start mock payment' })
    await userEvent.dblClick(button)
    expect(createPaymentAttempt).toHaveBeenCalledTimes(1)
    expect(createPaymentAttempt).toHaveBeenCalledWith(9, { shippingAddress: '1 Main St', buyerPhone: '0123456789' })
    finish({ attempt: attempt() })
    await screen.findByText('Mock checkout opened.')
    expect(onChanged).toHaveBeenCalled()
  })

  it('an open attempt offers success / failure / lost confirmation with honest outcomes', async () => {
    mount({ mode: 'mock', available: ['manual', 'mock'], attempts: [attempt()] })
    expect(screen.getByText('mock_abc')).toBeInTheDocument()

    simulateMockPayment.mockResolvedValueOnce({ delivered: true, outcome: 'applied' })
    await userEvent.click(screen.getByRole('button', { name: 'Simulate successful payment' }))
    expect(simulateMockPayment).toHaveBeenLastCalledWith('mock_abc', 'succeeded', true)
    expect(await screen.findByRole('status')).toHaveTextContent('Payment recorded. The seller can now ship.')

    simulateMockPayment.mockResolvedValueOnce({ delivered: true, outcome: 'failed_recorded' })
    await userEvent.click(screen.getByRole('button', { name: 'Simulate failed payment' }))
    expect(await screen.findByText(/Nothing was charged/)).toBeInTheDocument()

    simulateMockPayment.mockResolvedValueOnce({ delivered: false })
    await userEvent.click(screen.getByRole('button', { name: 'Simulate a lost confirmation' }))
    expect(simulateMockPayment).toHaveBeenLastCalledWith('mock_abc', 'succeeded', false)
    expect(await screen.findByText(/reconciliation will record it/)).toBeInTheDocument()

    simulateMockPayment.mockResolvedValueOnce({ delivered: true, outcome: 'exception:late_payment_order_payment_expired' })
    await userEvent.click(screen.getByRole('button', { name: 'Simulate successful payment' }))
    expect(await screen.findByText(/needs a manual review/)).toBeInTheDocument()
  })

  it('failed and exception attempts are reported, never shown as paid', () => {
    const { unmount } = mount({ mode: 'mock', available: ['manual', 'mock'], attempts: [attempt({ status: 'failed' })] })
    expect(screen.getByText(/last attempt failed/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start mock payment' })).toBeInTheDocument()
    unmount()
    mount({ mode: 'mock', available: ['manual', 'mock'], attempts: [attempt({ status: 'exception', exceptionReason: 'amount_mismatch' })] })
    expect(screen.getByText(/did not match this order/)).toBeInTheDocument()
  })
})
