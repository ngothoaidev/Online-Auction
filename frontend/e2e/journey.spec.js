import { test, expect } from '@playwright/test'
import { API, PNG, as, tokenOf, freshLot } from './fixtures.js'

// The cross-module golden path, end to end in real browsers with the real worker running:
// list -> bid in the UI -> the lot closes and the WORKER settles it (nobody watching) -> mock payment -> seller ships ->
// buyer confirms receipt -> both review -> completed. Each step is the UI a person would use; only the listing itself
// and the rival's opening bid are created through the API.
test('list -> bid -> worker settles -> pay -> ship -> receive -> both review -> completed', async ({ browser, request }) => {
  test.setTimeout(150_000)
  const seller = await tokenOf(request, 'demo_seller')
  const buyer = await tokenOf(request, 'demo_buyer1')
  const lotId = await freshLot(request, seller, { endInMs: 30_000, openingBid: { token: await tokenOf(request, 'demo_buyer2'), amount: '1200000' } })
  const sellerBefore = await (await request.get(`${API}/users/profile?username=demo_seller`)).json()

  const buyerCtx = await browser.newContext()
  await buyerCtx.addInitScript((t) => localStorage.setItem('authToken', t), buyer)
  const bp = await buyerCtx.newPage()

  // bid through the review dialog
  await bp.goto(`/auction/${lotId}`)
  await bp.getByLabel(/your maximum bid/i).fill('2000000')
  await bp.getByRole('button', { name: 'Review bid' }).click()
  await bp.getByRole('dialog', { name: 'Review your bid' }).getByRole('button', { name: 'Place bid' }).click()
  await expect(bp.getByRole('dialog').getByText('You are the highest bidder')).toBeVisible()
  await bp.getByRole('button', { name: 'Done' }).click()

  // close + settle happen with nobody on the page: the worker creates the order
  await bp.goto('/')
  await expect.poll(async () => (await request.get(`${API}/order/auction/${lotId}`, { headers: as(buyer) })).status(), { timeout: 60_000, intervals: [2000] }).toBe(200)

  // pay through the mock gateway
  await bp.goto(`/order/${lotId}`)
  await bp.getByRole('radio', { name: /mock gateway/i }).check()
  const pay = bp.getByRole('region', { name: 'Pay with the mock gateway' })
  await pay.getByLabel('Delivery address').fill('12 Nguyen Hue, District 1, Ho Chi Minh City')
  await pay.getByLabel('Contact phone').fill('+84901234567')
  await pay.getByRole('button', { name: 'Start mock payment' }).click()
  await pay.getByRole('button', { name: 'Simulate successful payment' }).click()
  await expect(bp.getByRole('heading', { name: 'Payment Recorded' })).toBeVisible()

  // seller ships
  const sellerCtx = await browser.newContext()
  await sellerCtx.addInitScript((t) => localStorage.setItem('authToken', t), seller)
  const sp = await sellerCtx.newPage()
  await sp.goto(`/order/${lotId}`)
  await sp.getByRole('button', { name: 'Upload Shipping Invoice' }).click()
  const upload = sp.getByRole('dialog', { name: 'Upload Shipping Invoice' })
  await upload.getByLabel('Choose image file').setInputFiles({ name: 'invoice.png', mimeType: 'image/png', buffer: PNG })
  await upload.getByRole('button', { name: 'Use this image' }).click()
  await expect(upload).toHaveCount(0)
  await sp.getByPlaceholder('Enter tracking number...').fill('VNPOST-778899')
  await sp.getByRole('button', { name: 'Send Shipping Info' }).click()
  await expect(sp.getByText('Waiting for the buyer to confirm receipt of the item.')).toBeVisible()

  // buyer confirms receipt (accessible confirm dialog, not window.confirm) and reviews
  await bp.reload()
  await bp.getByRole('button', { name: 'I Have Received the Item' }).click()
  await bp.getByRole('dialog', { name: 'Confirm receipt?' }).getByRole('button', { name: 'I received it' }).click()
  await expect(bp.getByRole('heading', { name: 'Leave a Review' })).toBeVisible()
  const positive = bp.getByRole('group', { name: 'Rate the seller' }).getByRole('button', { name: 'Positive' })
  await positive.click()
  await expect(positive).toHaveAttribute('aria-pressed', 'true')
  await bp.getByLabel('Comment (Optional)').fill('Exactly as described, well packed.')
  await bp.getByRole('button', { name: 'Submit Review' }).click()
  await expect(bp.getByRole('button', { name: 'Submit Review' })).toHaveCount(0)

  // seller reviews -> completed
  await sp.reload()
  await sp.getByRole('group', { name: 'Rate the buyer' }).getByRole('button', { name: 'Positive' }).click()
  await sp.getByRole('button', { name: 'Submit Review' }).click()
  await expect(sp.getByRole('heading', { name: 'Transaction Completed' })).toBeVisible()

  const order = (await (await request.get(`${API}/order/auction/${lotId}`, { headers: as(buyer) })).json()).order.order
  expect(order.status).toBe('completed')
  expect(order.paymentMode).toBe('mock')
  const sellerAfter = await (await request.get(`${API}/users/profile?username=demo_seller`)).json()
  expect(sellerAfter.rating.positive).toBe(sellerBefore.rating.positive + 1)
  await buyerCtx.close()
  await sellerCtx.close()
})
