import { expect } from '@playwright/test'

// Shared E2E helpers: real API calls against the seeded dev DB (demo users, password Passw0rd!demo).
export const API = process.env.E2E_API_URL || 'http://localhost:3000'
// a real (1x1) PNG: passes the server's content check AND renders, so screenshots of E2E lots are not broken images
export const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
export const as = (token) => ({ Authorization: `Bearer ${token}` })
export const tokenOf = async (request, identifier) =>
  (await (await request.post(`${API}/auth/login`, { data: { identifier, password: 'Passw0rd!demo' } })).json()).token

/** A brand-new Buy Now lot listed by `seller` through the API, so specs never depend on (or use up) seeded lots. */
export async function freshBuyNowLot(request, seller, { buyNowPrice = '2500000' } = {}) {
  return freshLot(request, seller, { buyNowPrice })
}

/** A new lot (1.000.000 ₫ start, 100.000 ₫ step, no auto-extend), optionally with an opening proxy bid so it already has a leader. */
export async function freshLot(request, seller, { buyNowPrice = '', openingBid, endInMs = 86_400_000 }: { buyNowPrice?: string; openingBid?: { token: string; amount: string }; endInMs?: number } = {}) {
  const categories = await (await request.get(`${API}/categories`)).json()
  const form = new FormData()
  const fields = {
    title: `E2E lot ${Date.now()}`, description: '<p>e2e</p>', categoryId: String(categories[0].subcategories[0].id),
    startingPrice: '1000000', stepPrice: '100000', buyNowPrice, endTime: new Date(Date.now() + endInMs).toISOString(),
  }
  for (const [k, v] of Object.entries(fields)) form.append(k, v)
  for (let i = 0; i < 3; i++) form.append('images', new Blob([PNG], { type: 'image/png' }), `lot${i}.png`)
  const res = await request.post(`${API}/auction`, { headers: as(seller), multipart: form })
  expect(res.status(), await res.text()).toBe(201)
  const id = (await res.json()).auction.id
  if (openingBid) {
    const bid = await request.post(`${API}/auction/${id}/bid`, { headers: as(openingBid.token), data: { amount: openingBid.amount } })
    expect(bid.status(), await bid.text()).toBe(200)
  }
  return id
}
