import { test, expect } from '@playwright/test'
import { API, PNG, as, tokenOf, freshBuyNowLot } from './fixtures'

// Real browser + API: Buy Now creates the order, the buyer uploads a private proof and submits payment details,
// the seller then sees the proof through the protected endpoint. Lists its own lot, so it never runs out of seed data.
test('buy now -> manual payment with a private proof upload -> seller can open the proof', async ({ browser, request }) => {
  const buyer = await tokenOf(request, 'demo_buyer2')
  const seller = await tokenOf(request, 'demo_seller')
  const lot = { id: await freshBuyNowLot(request, seller) }

  const bought = await request.post(`${API}/auction/${lot.id}/buy-now`, { headers: { ...as(buyer), 'Idempotency-Key': `e2e-buy-${Date.now()}` } })
  expect(bought.status(), await bought.text()).toBe(200)

  const ctx = await browser.newContext()
  await ctx.addInitScript((t) => localStorage.setItem('authToken', t), buyer)
  const page = await ctx.newPage()
  await page.goto(`/order/${lot.id}`)
  await expect(page.getByRole('heading', { level: 1, name: 'Pay the seller' })).toBeVisible()
  await expect(page.getByText(/This site does not process or hold payments/)).toBeVisible()

  // one channel at a time: nothing to fill in until the buyer picks how they pay
  await expect(page.getByRole('button', { name: 'Upload Payment Proof' })).toHaveCount(0)
  await page.getByRole('radio', { name: /pay the seller directly/i }).check()
  await expect(page.getByRole('region', { name: 'Pay with the mock gateway' })).toHaveCount(0)
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
