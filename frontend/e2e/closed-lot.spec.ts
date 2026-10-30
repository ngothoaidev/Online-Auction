import { test, expect } from '@playwright/test'
import { API, as, tokenOf, freshBuyNowLot } from './fixtures'

// Design audit F05: after a lot closes, the winner and the seller must find their way back to the order from the lot
// page and from their profile, without relying on a dialog or a notification. Other people only see the public result.
test('closed lot: winner and seller get a link to the order (lot page and profile); others see the public result only', async ({ browser, request }) => {
  const buyer = await tokenOf(request, 'demo_buyer2')
  const seller = await tokenOf(request, 'demo_seller')
  const other = await tokenOf(request, 'demo_buyer1')
  const id = await freshBuyNowLot(request, seller, { buyNowPrice: '2345678' })
  const bought = await request.post(`${API}/auction/${id}/buy-now`, { headers: { ...as(buyer), 'Idempotency-Key': `e2e-closed-${Date.now()}` } })
  expect(bought.status(), await bought.text()).toBe(200)

  const as_ = async (token) => {
    const ctx = await browser.newContext()
    await ctx.addInitScript((t) => localStorage.setItem('authToken', t), token)
    return { ctx, page: await ctx.newPage() }
  }

  const winner = await as_(buyer)
  await winner.page.goto(`/auction/${id}`)
  await expect(winner.page.getByText('You won this lot for 2.345.678 ₫')).toBeVisible()
  await winner.page.getByRole('link', { name: 'View order and pay' }).click()
  await expect(winner.page).toHaveURL(new RegExp(`/order/${id}$`))
  await expect(winner.page.getByRole('heading', { level: 1, name: 'Pay the seller' })).toBeVisible()

  await winner.page.goto('/profile/demo_buyer2?tab=won-auctions')
  const card = winner.page.getByRole('article').filter({ hasText: 'E2E lot' }).first()
  await expect(card.getByRole('link', { name: /view order/i })).toHaveAttribute('href', /\/order\/\d+$/)
  await winner.ctx.close()

  const owner = await as_(seller)
  await owner.page.goto(`/auction/${id}`)
  await expect(owner.page.getByText('Bought now to @demo_buyer2 for 2.345.678 ₫')).toBeVisible()
  await expect(owner.page.getByRole('link', { name: 'View order' })).toHaveAttribute('href', `/order/${id}`)
  await owner.ctx.close()

  const stranger = await as_(other)
  await stranger.page.goto(`/auction/${id}`)
  await expect(stranger.page.getByText('Bought now for 2.345.678 ₫')).toBeVisible()
  await expect(stranger.page.getByRole('link', { name: /view order/i })).toHaveCount(0)
  await stranger.ctx.close()
})
