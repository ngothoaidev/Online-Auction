import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { OrderView } from '../../src/types/api'

const createPaymentAttempt = vi.fn()
vi.mock('../../src/services/orderService', () => ({ default: { createPaymentAttempt: (...a) => createPaymentAttempt(...a) } }))

import StripePaymentPanel from '../../src/pages/OrderCompletion/StripePaymentPanel'

const order = { id: 3, auctionId: 7, finalPrice: '1500000', status: 'pending_payment' } as unknown as OrderView
const mount = (path = '/order/7') => render(
  <MemoryRouter initialEntries={[path]}><StripePaymentPanel order={order} payment={null} onChanged={vi.fn()} /></MemoryRouter>,
)

afterEach(() => { vi.unstubAllGlobals(); createPaymentAttempt.mockReset() })

describe('StripePaymentPanel', () => {
  it('needs the address and phone, then sends the buyer to the checkout URL from the server', async () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign })
    createPaymentAttempt.mockResolvedValue({ checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_x' })
    mount()
    expect(screen.getByText(/no real money moves/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Continue to Stripe checkout' }))
    expect(screen.getByText('Enter the delivery address')).toBeInTheDocument()
    expect(createPaymentAttempt).not.toHaveBeenCalled()

    await userEvent.type(screen.getByLabelText('Delivery address'), '1 Main St')
    await userEvent.type(screen.getByLabelText('Contact phone'), '0900000000')
    await userEvent.click(screen.getByRole('button', { name: 'Continue to Stripe checkout' }))
    expect(createPaymentAttempt).toHaveBeenCalledWith(3, { shippingAddress: '1 Main St', buyerPhone: '0900000000' })
    expect(assign).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/cs_test_x')
  })

  it('back from Stripe it waits for the confirmation instead of offering to pay again', () => {
    mount('/order/7?checkout=done')
    expect(screen.getByRole('status')).toHaveTextContent(/waiting for its confirmation/i)
    expect(screen.queryByRole('button', { name: 'Continue to Stripe checkout' })).toBeNull()
  })
})
