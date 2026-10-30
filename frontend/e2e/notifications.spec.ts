import { test, expect } from '@playwright/test'
import { API, as, tokenOf, freshLot } from './fixtures'

// Needs the worker running (it dispatches outbox events into notifications). demo_buyer1 opens a lot, demo_buyer2 outbids
// them through the API, and demo_buyer1 finds the outbid notice behind the header bell.
test('outbid -> bell shows unread -> notification opens the lot and becomes read', async ({ page, request }) => {
  const buyer1 = await tokenOf(request, 'demo_buyer1')
  const buyer2 = await tokenOf(request, 'demo_buyer2')
  const lotId = await freshLot(request, await tokenOf(request, 'demo_seller'), { openingBid: { token: buyer1, amount: '1500000' } })
  const lot = await (await request.get(`${API}/auction/${lotId}`)).json()
  expect((await request.post(`${API}/auction/${lotId}/bid`, { headers: as(buyer2), data: { amount: '3000000' } })).ok()).toBeTruthy()

  // the worker turns the committed event into a notification within a few polls
  await expect.poll(async () => {
    const r = await (await request.get(`${API}/notifications`, { headers: as(buyer1) })).json()
    return r.items.some((n) => n.kind === 'outbid' && n.link === `/auction/${lotId}`)
  }, { timeout: 15_000 }).toBe(true)

  await page.addInitScript((t) => localStorage.setItem('authToken', t), buyer1)
  await page.goto('/')
  const bell = page.getByRole('link', { name: /^Notifications, \d+ unread$/ })
  await expect(bell).toBeVisible()
  await bell.click()
  await expect(page.getByRole('heading', { level: 1, name: 'Notifications' })).toBeVisible()

  const item = page.getByRole('button', { name: new RegExp(`Unread: You were outbid on "${lot.title}"`) })
  await expect(item).toBeVisible()
  await expect(item).not.toContainText('3.000.000') // the leader's maximum is private
  await item.click()
  await expect(page).toHaveURL(new RegExp(`/auction/${lotId}$`))

  await page.goto('/notifications')
  await expect(page.getByRole('button', { name: new RegExp(`^You were outbid on "${lot.title}"`) })).toBeVisible() // no longer "Unread:"
})
