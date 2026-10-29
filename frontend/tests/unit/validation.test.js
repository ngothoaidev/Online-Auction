import { describe, it, expect } from 'vitest'
import { validateForm } from '../../src/utils/validation.js'
import { registerSchema, loginSchema } from '../../src/schemas/auth.schemas.js'

describe('validateForm (Zod 4)', () => {
  it('returns readable messages and per-field errors, never raw JSON', () => {
    const r = validateForm(registerSchema, { username: 'a', email: 'nope', password: 'abc', confirmPassword: 'x' })
    expect(r.success).toBe(false)
    expect(r.fieldErrors.username).toMatch(/at least 3/)
    expect(r.fieldErrors.email).toMatch(/email/i)
    expect(r.message).not.toMatch(/^\[|"code"|"path"/)
    expect(r.messages.length).toBeGreaterThan(2)
  })
  it('passes valid data through', () => {
    expect(validateForm(loginSchema, { identifier: 'alice', password: 'secret1' })).toEqual({ success: true, data: { identifier: 'alice', password: 'secret1' } })
  })
  it('reports a mismatch on the confirm field', () => {
    const r = validateForm(registerSchema, { username: 'alice', email: 'a@b.co', password: 'Passw0rd', confirmPassword: 'Passw0rd2' })
    expect(r.fieldErrors.confirmPassword).toBe('Passwords do not match')
  })
})

describe('review form schema', () => {
  it('accepts positive/negative and refuses anything else with a readable message', async () => {
    const { reviewFormSchema } = await import('../../src/schemas/order.schemas.js')
    expect(validateForm(reviewFormSchema, { rating: 1, comment: 'Great' }).success).toBe(true)
    expect(validateForm(reviewFormSchema, { rating: -1 }).success).toBe(true)
    for (const rating of [0, 2, undefined, '1']) {
      const r = validateForm(reviewFormSchema, { rating })
      expect(r.success).toBe(false)
      expect(r.fieldErrors.rating).toBe('Please select a rating')
    }
  })
})
