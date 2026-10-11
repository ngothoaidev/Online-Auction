import { test, expect } from '@playwright/test'

// Real browser + API: Buy Now creates the order, the buyer uploads a private proof and submits payment details,
// the seller then sees the proof through the protected endpoint. Consumes one seeded Buy Now lot per run.
const API = process.env.E2E_API_URL || 'http://localhost:3000'
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(200, 5)])

const tokenOf = async (request, identifier) => (await (await request.post(`${API}/auth/login`, { data: { identifier, password: 'Passw0rd!demo' } })).json()).token

test('buy now -> manual payment with a private proof upload -> seller can open the proof', async ({ browser, request }) => {
  const buyer = await tokenOf(request, 'demo_buyer2')
  const seller = await tokenOf(request, 'demo_seller')
  const lots = (await (await request.get(`${API}/search?status=active&sortBy=timeNewlyListed`, { headers: { Authorization: `Bearer ${buyer}` } })).json()).data
  const lot = lots.find((l) => l.buyNowPrice && l.status === 'active' && new Date(l.endTime) - Date.now() > 10 * 60 * 1000)
  test.skip(!lot, 'no active Buy Now lot left in the seed (re-run npm run db:seed on a fresh DB)')

  const bought = await request.post(`${API}/auction/${lot.id}/buy-now`, { headers: { Authorization: `Bearer ${buyer}`, 'Idempotency-Key': `e2e-buy-${Date.now()}` } })
  expect(bought.status(), await bought.text()).toBe(200)

  const ctx = await browser.newContext()
  await ctx.addInitScript((t) => localStorage.setItem('authToken', t), buyer)
  const page = await ctx.newPage()
  await page.goto(`/order/${lot.id}`)
  await expect(page.getByText('Manual payment.')).toBeVisible()
  await expect(page.getByText(/This site does not process or hold payments/)).toBeVisible()

  await page.getByRole('button', { name: 'Upload Payment Proof' }).click()
  const dialog = page.getByRole('dialog', { name: 'Upload Payment Proof' })
  await dialog.getByLabel('Choose image file').setInputFiles({ name: 'receipt.png', mimeType: 'image/png', buffer: PNG })
  await dialog.getByRole('button', { name: 'Use this image' }).click()
  await expect(dialog).toHaveCount(0)

  await page.getByPlaceholder('Enter your full shipping address...').fill('12 Nguyen Hue Street, District 1, Ho Chi Minh City')
  await page.getByPlaceholder('+84 xxx xxx xxx').fill('+84901234567')
  const paid = page.waitForResponse((r) => r.url().endsWith('/payment') && r.request().method() === 'POST')
  await page.getByRole('button', { name: 'Submit Payment Details' }).click()
  expect((await paid).status()).toBe(200)

  const order = await (await request.get(`${API}/order/auction/${lot.id}`, { headers: { Authorization: `Bearer ${buyer}` } })).json()
  expect(order.order.order.status).toBe('pending_confirmation')
  const proofPath = order.order.order.paymentProofUrl
  expect(proofPath).toMatch(/^\/order\/\d+\/proofs\//)
  expect((await request.get(`${API}${proofPath}`)).status()).toBe(401) // never public
  expect((await request.get(`${API}${proofPath}`, { headers: { Authorization: `Bearer ${seller}` } })).status()).toBe(200)
  await ctx.close()
})
