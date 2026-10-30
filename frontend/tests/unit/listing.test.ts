import { describe, it, expect } from 'vitest'
import { validateListing } from '../../src/utils/listing'

const NOW = new Date('2026-03-01T10:00:00Z').getTime()
const img = (n) => Array.from({ length: n }, (_, i) => ({ file: i }))
const base = { title: 'Lot', categoryId: '3', startingPrice: '1.000.000', stepPrice: '50000', buyNowPrice: '', endTime: '2026-03-03T10:00', images: img(3) }

describe('validateListing', () => {
  it('accepts a complete form and normalises money and time', () => {
    const r = validateListing(base, NOW)
    expect(r.ok).toBe(true)
    expect(r.value).toMatchObject({ startingPrice: '1000000', stepPrice: '50000', buyNowPrice: null })
    expect(r.value.endTime).toMatch(/Z$/) // absolute instant, not a timezone-less local string
  })
  it('enforces 3-10 photos', () => {
    expect(validateListing({ ...base, images: img(2) }, NOW).errors.images).toMatch(/at least 3/)
    expect(validateListing({ ...base, images: img(11) }, NOW).errors.images).toMatch(/at most 10/)
  })
  it('rejects decimals, zero and junk prices; buy now must exceed the start', () => {
    for (const startingPrice of ['0', '10.5', 'abc', '']) expect(validateListing({ ...base, startingPrice }, NOW).errors.startingPrice).toBeTruthy()
    expect(validateListing({ ...base, buyNowPrice: '1000000' }, NOW).errors.buyNowPrice).toMatch(/higher/)
    expect(validateListing({ ...base, buyNowPrice: '1000001' }, NOW).ok).toBe(true)
  })
  it('requires at least one hour of runtime', () => {
    expect(validateListing({ ...base, endTime: '2026-03-01T10:30' }, NOW).errors.endTime).toMatch(/1 hour/)
    expect(validateListing({ ...base, endTime: '' }, NOW).errors.endTime).toBeTruthy()
  })
  it('requires title and category', () => {
    const r = validateListing({ ...base, title: '  ', categoryId: '' }, NOW)
    expect(Object.keys(r.errors)).toEqual(expect.arrayContaining(['title', 'categoryId']))
  })
})
