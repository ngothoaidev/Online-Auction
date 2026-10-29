import { describe, it, expect } from 'vitest'
import { nextStep } from '../../src/pages/OrderCompletion/nextStep.js'

const turn = (status, extra = {}) => ({
  buyer: nextStep({ status, ...extra }, 'buyer').yourTurn,
  seller: nextStep({ status, ...extra }, 'seller').yourTurn,
})

describe('order next step', () => {
  it('in every in-progress state exactly one party is waited on, in state-machine order', () => {
    expect(turn('pending_payment')).toEqual({ buyer: true, seller: false })
    expect(turn('pending_confirmation')).toEqual({ buyer: false, seller: true }) // manual: seller checks proof and ships
    expect(turn('pending_delivery')).toEqual({ buyer: false, seller: true }) //     gateway paid: seller ships
    expect(turn('pending_receipt')).toEqual({ buyer: true, seller: false })
  })

  it('reviews: each side is asked until they have reviewed, then waits for the other', () => {
    expect(turn('pending_review')).toEqual({ buyer: true, seller: true })
    expect(turn('pending_review', { buyerReviewSubmitted: true })).toEqual({ buyer: false, seller: true })
    expect(nextStep({ status: 'pending_review', buyerReviewSubmitted: true }, 'buyer').title).toBe('Waiting for the other review')
  })

  it('finished states wait on nobody and explain themselves', () => {
    for (const status of ['completed', 'cancelled', 'payment_expired']) expect(turn(status)).toEqual({ buyer: false, seller: false })
    expect(nextStep({ status: 'cancelled', cancelReason: 'Buyer asked to cancel' }, 'buyer').detail).toBe('Reason: Buyer asked to cancel')
  })
})
