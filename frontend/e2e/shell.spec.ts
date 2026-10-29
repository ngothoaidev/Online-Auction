import { test, expect } from '@playwright/test'
import { tokenOf } from './fixtures'

// Design audit F06: on phones and tablets the header offered no way to bids, saved lots, orders or selling.
const signedIn = async (browser, request, username, viewport) => {
  const ctx = await browser.newContext({ viewport })
  await ctx.addInitScript((t) => localStorage.setItem('authToken', t), await tokenOf(request, username))
  return ctx
}

for (const width of [320, 375]) {
  test(`phone ${width}px: header fits, search is one tap away, the menu reaches account tasks`, async ({ browser, request }) => {
    const ctx = await signedIn(browser, request, 'demo_seller', { width, height: 800 })
    const page = await ctx.newPage()
    await page.goto('/')
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), 'no sideways scroll').toBeLessThanOrEqual(0)

    await page.getByRole('button', { name: 'Search' }).click()
    const menu = page.getByRole('dialog', { name: 'Menu' })
    await expect(menu.getByRole('searchbox', { name: 'Search lots' })).toBeFocused()
    const account = menu.getByRole('navigation', { name: 'Account' })
    for (const name of ['My bids', 'Wins and orders', 'Saved lots', 'Create listing', 'My listings']) await expect(account.getByRole('link', { name })).toBeVisible()
    await account.getByRole('link', { name: 'Saved lots' }).click()
    await expect(page).toHaveURL(/\/profile\/demo_seller\?tab=favorites$/)
    await expect(menu).toHaveCount(0)
    await ctx.close()
  })
}

test('tablet 820px: the account (previously unreachable at this width) is in the menu', async ({ browser, request }) => {
  const ctx = await signedIn(browser, request, 'demo_buyer1', { width: 820, height: 1000 })
  const page = await ctx.newPage()
  await page.goto('/')
  await page.getByRole('button', { name: 'Open menu' }).click()
  const account = page.getByRole('dialog', { name: 'Menu' }).getByRole('navigation', { name: 'Account' })
  await expect(account.getByRole('link', { name: 'My bids' })).toBeVisible()
  await expect(account.getByRole('link', { name: 'Start selling' })).toHaveAttribute('href', '/become-seller')
  await ctx.close()
})

test('desktop: hovering then clicking Categories keeps the menu open', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  const button = page.getByRole('button', { name: 'Categories', exact: true })
  await button.hover()
  await expect(button).toHaveAttribute('aria-expanded', 'true')
  await button.click()
  await expect(button).toHaveAttribute('aria-expanded', 'true')
})
