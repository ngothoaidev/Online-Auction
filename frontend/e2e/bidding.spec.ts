import { test, expect } from '@playwright/test'
import { API, tokenOf as login, freshLot } from './fixtures'

// Needs API (:3000) + Vite (:5173) against the seeded dev DB (demo users). Real browser, real API.
// Each test lists its own lot with an opening bid by demo_buyer1 (maximum 1.500.000 ₫), so state never leaks between specs.
async function lotWithBids(request) {
  const id = await freshLot(request, await login(request, 'demo_seller'), { openingBid: { token: await login(request, 'demo_buyer1'), amount: '1500000' } })
  return (await (await request.get(`${API}/auction/${id}`)).json())
}

test('guest sees the lot honestly and is told to sign in (no active bid form)', async ({ page, request }) => {
  const lot = await lotWithBids(request)
  await page.goto(`/auction/${lot.id}`)
  await expect(page.getByRole('heading', { level: 1, name: lot.title })).toBeVisible()
  await expect(page.getByText('Sign in to bid.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Review bid' })).toBeDisabled()
  await expect(page.getByText(/Verified Item/)).toHaveCount(0)
})

test('buyer: review -> cancel sends nothing; invalid amount is explained; outbid is not shown as a win; Escape closes the dialog', async ({ page, request }) => {
  const token = await login(request, 'demo_buyer2')
  await page.addInitScript((t) => localStorage.setItem('authToken', t), token)
  const lot = await lotWithBids(request)
  const posts = []
  page.on('request', (r) => { if (r.method() === 'POST' && r.url().includes('/bid')) posts.push(r) })

  await page.goto(`/auction/${lot.id}`)
  const field = page.getByLabel(/your maximum bid/i)
  await field.fill('1000')
  await page.getByRole('button', { name: 'Review bid' }).click()
  await expect(page.getByRole('alert')).toContainText('The minimum bid is')
  await expect(page.getByRole('dialog')).toHaveCount(0)

  const min = BigInt(lot.currentPrice) + BigInt(lot.stepPrice)
  await field.fill(String(min))
  await page.getByRole('button', { name: 'Review bid' }).click()
  const dialog = page.getByRole('dialog', { name: 'Review your bid' })
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Tab')
  expect(await page.evaluate(() => document.activeElement.closest('[role=dialog]') !== null)).toBeTruthy() // focus stays inside
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  expect(posts).toHaveLength(0)

  await page.getByRole('button', { name: 'Review bid' }).click()
  await page.getByRole('button', { name: 'Place bid' }).click()
  // either a win or an honest "outbid" depending on the leader's private maximum; never both, never silent
  const result = page.getByRole('dialog').filter({ hasText: /highest bidder|outbid|Maximum updated/ })
  await expect(result).toBeVisible()
  expect(posts).toHaveLength(1)
  expect(posts[0].headers()['idempotency-key']).toBeTruthy()
  const text = await result.innerText()
  if (/outbid/i.test(text)) expect(text).not.toMatch(/highest bidder/i)
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
