import { describe, it, expect } from 'vitest'
import { formatCurrency } from '../../src/utils/format.js'

// Characterization of the current compact catalog formatter. It is lossy by design and must not be used
// for committed amounts (exact formatter arrives with T15).
describe('formatCurrency (catalog, lossy)', () => {
  it.each([
    [500, '500.0 ₫'],
    [1500, '1.5K ₫'],
    [2500000, '2.5M ₫'],
    [3000000000, '3.0B ₫'],
  ])('%s -> %s', (input, expected) => {
    expect(formatCurrency(input)).toBe(expected)
  })
})
