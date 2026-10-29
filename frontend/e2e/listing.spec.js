import { test, expect } from '@playwright/test'

// Real browser + real API (no cloud credentials needed: the API stores photos locally in dev).
const API = process.env.E2E_API_URL || 'http://localhost:3000'
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(200, 9)])

test('seller creates a listing end to end: inline errors first, then 3 photos, review, publish', async ({ page, request }) => {
  const login = await request.post(`${API}/auth/login`, { data: { identifier: 'demo_seller', password: 'Passw0rd!demo' } })
  const { token } = await login.json()
  await page.addInitScript((t) => localStorage.setItem('authToken', t), token)

  await page.goto('/create-auction')
  await page.getByRole('button', { name: 'Publish listing' }).click()
  const alert = page.locator('#listing-errors')
  await expect(alert).toContainText('Please fix')
  await expect(alert).toContainText('Add at least 3 photos')
  await expect(page.getByLabel('Title')).toBeVisible()

  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Add photo' }).click()
    const dialog = page.getByRole('dialog', { name: 'Add a photo' })
    await dialog.getByLabel('Choose image file').setInputFiles({ name: `p${i}.png`, mimeType: 'image/png', buffer: PNG })
    await dialog.getByRole('button', { name: 'Use this image' }).click()
    await expect(dialog).toHaveCount(0)
  }
  await expect(page.getByRole('button', { name: /Remove photo/ })).toHaveCount(3)

  const title = `E2E lot ${Date.now()}`
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Category').selectOption({ index: 1 })
  await page.getByLabel(/Starting price/).fill('1.000.000')
  await page.getByLabel(/Bid step/).fill('50000')
  await page.getByLabel('Ends at').fill(new Date(Date.now() + 3 * 3600 * 1000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16))
  await expect(page.getByText('Review before publishing')).toBeVisible()
  await expect(page.getByText('1.000.000 ₫')).toBeVisible()

  await page.getByRole('button', { name: 'Publish listing' }).click()
  await page.waitForURL('**/')
  const lots = await (await request.get(`${API}/auction/top?sortBy=newest&limit=5`)).json()
  expect(lots.map((l) => l.title)).toContain(title)
})
