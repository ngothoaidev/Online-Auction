import { test, expect } from '@playwright/test'
import { API, PNG, as, tokenOf, freshBuyNowLot } from './fixtures.js'

// Real browser + API + worker-free path: the seller lists a Buy Now lot through the API, the buyer buys it, pays through the
// MOCK gateway in the UI (no real money), and the seller ships from the UI. Self-contained: does not use up seeded lots.
test('buy now -> mock gateway payment in the UI -> seller ships -> buyer waits for receipt', async ({ browser, request }) => {
  const buyer = await tokenOf(request, 'demo_buyer2')
  const seller = await tokenOf(request, 'demo_seller')
  const lotId = await freshBuyNowLot(request, seller)
  const bought = await request.post(`${API}/auction/${lotId}/buy-now`, { headers: { ...as(buyer), 'Idempotency-Key': `e2e-mock-${Date.now()}` } })
  expect(bought.status(), await bought.text()).toBe(200)

  const buyerCtx = await browser.newContext()
  await buyerCtx.addInitScript((t) => localStorage.setItem('authToken', t), buyer)
  const page = await buyerCtx.newPage()
  await page.goto(`/order/${lotId}`)
  const panel = page.getByRole('region', { name: 'Pay with the mock gateway' })
  await expect(panel.getByText('no real money moves')).toBeVisible()
  await expect(panel.getByText('2.500.000 ₫')).toBeVisible()

  await panel.getByRole('button', { name: 'Start mock payment' }).click()
  await expect(panel.getByText('Enter the delivery address')).toBeVisible() // inline, nothing sent
  await panel.getByLabel('Delivery address').fill('12 Nguyen Hue Street, District 1, Ho Chi Minh City')
  await panel.getByLabel('Contact phone').fill('+84901234567')
  await panel.getByRole('button', { name: 'Start mock payment' }).click()
  await expect(page.getByText(/Mock gateway \(demo\)\./)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Submit Payment Details' })).toHaveCount(0) // one payment mode per order

  await panel.getByRole('button', { name: 'Simulate successful payment' }).click()
  await expect(page.getByRole('heading', { name: 'Payment Recorded' })).toBeVisible()

  const sellerCtx = await browser.newContext()
  await sellerCtx.addInitScript((t) => localStorage.setItem('authToken', t), seller)
  const sp = await sellerCtx.newPage()
  const dialogs = []
  sp.on('dialog', (d) => { dialogs.push(d.message()); d.dismiss() })
  await sp.goto(`/order/${lotId}`)
  await expect(sp.getByRole('heading', { name: 'Payment Recorded: Ship the Item' })).toBeVisible()
  await expect(sp.getByText(/recorded by the mock gateway/)).toBeVisible()
  await sp.getByRole('button', { name: 'Upload Shipping Invoice' }).click()
  const dialog = sp.getByRole('dialog', { name: 'Upload Shipping Invoice' })
  await dialog.getByLabel('Choose image file').setInputFiles({ name: 'invoice.png', mimeType: 'image/png', buffer: PNG })
  await dialog.getByRole('button', { name: 'Use this image' }).click()
  await sp.getByPlaceholder('Enter tracking number...').fill('VN-123456') // typed while the upload may still be in flight
  await sp.getByRole('button', { name: 'Send Shipping Info' }).click()
  await expect(sp.getByText('Waiting for the buyer to confirm receipt of the item.'), `native dialogs: ${dialogs.join(' | ')}`).toBeVisible()

  await page.reload()
  await expect(page.getByRole('button', { name: 'I Have Received the Item' })).toBeVisible()
  await buyerCtx.close()
  await sellerCtx.close()
})
