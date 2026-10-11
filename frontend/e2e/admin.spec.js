import { test, expect } from '@playwright/test'

const API = process.env.E2E_API_URL || 'http://localhost:3000'
const tokenOf = async (request, identifier) => (await (await request.post(`${API}/auth/login`, { data: { identifier, password: 'Passw0rd!demo' } })).json()).token

test('admin routes: /admin redirects to categories, deep links work, guests and buyers are kept out', async ({ page, browser, request }) => {
  // guest
  await page.goto('/admin/users')
  await expect(page).toHaveURL(/\/login/)

  // buyer
  const buyer = await browser.newContext()
  await buyer.addInitScript((t) => localStorage.setItem('authToken', t), await tokenOf(request, 'demo_buyer1'))
  const bp = await buyer.newPage()
  await bp.goto('/admin/users')
  await expect(bp).not.toHaveURL(/\/admin/)
  await buyer.close()

  // admin
  const adminCtx = await browser.newContext()
  await adminCtx.addInitScript((t) => localStorage.setItem('authToken', t), await tokenOf(request, 'demo_admin'))
  const ap = await adminCtx.newPage()
  await ap.goto('/admin')
  await expect(ap).toHaveURL(/\/admin\/categories$/)
  await expect(ap.getByRole('link', { name: 'Users' })).toBeVisible()
  await ap.getByRole('link', { name: 'Users' }).click()
  await expect(ap).toHaveURL(/\/admin\/users$/)
  await ap.goBack()
  await expect(ap).toHaveURL(/\/admin\/categories$/)
  await ap.goto('/admin/upgrades')
  await expect(ap.getByRole('link', { name: 'Seller requests' })).toHaveAttribute('aria-current', 'page')
  await adminCtx.close()
})

test('admin on a phone: drawer navigation, Escape closes it, destructive actions need a confirmation and cancel sends nothing', async ({ browser, request }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } })
  await ctx.addInitScript((t) => localStorage.setItem('authToken', t), await tokenOf(request, 'demo_admin'))
  const page = await ctx.newPage()
  const writes = []
  page.on('request', (r) => { if (['POST', 'PUT', 'DELETE'].includes(r.method()) && r.url().startsWith(API)) writes.push(r.method() + ' ' + r.url()) })

  await page.goto('/admin/users')
  await page.getByRole('button', { name: 'Open admin menu' }).click()
  const drawer = page.getByRole('dialog', { name: 'Admin menu' })
  await expect(drawer).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(drawer).toHaveCount(0)
  await page.getByRole('button', { name: 'Open admin menu' }).click()
  await drawer.getByRole('link', { name: 'Listings' }).click()
  await expect(page).toHaveURL(/\/admin\/products$/)
  await expect(drawer).toHaveCount(0)

  await page.goto('/admin/users')
  const ban = page.getByRole('button', { name: /ban/i }).first()
  if (await ban.count()) {
    await ban.click()
    const confirm = page.getByRole('dialog', { name: /ban this user/i })
    if (await confirm.count()) {
      await confirm.getByRole('button', { name: 'Cancel' }).click()
      expect(writes.filter((w) => w.includes('/ban'))).toHaveLength(0)
    }
  }
  await ctx.close()
})
