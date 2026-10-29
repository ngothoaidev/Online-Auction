import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { tokenOf } from './fixtures.js'

// Every control has an accessible name: the axe rules the design audit (F17) found failing on these pages.
const NAME_RULES = ['label', 'button-name', 'select-name']
const scan = async (page) => (await new AxeBuilder({ page }).withRules(NAME_RULES).analyze()).violations
  .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)

const signedIn = async (browser, request, username) => {
  const ctx = await browser.newContext()
  await ctx.addInitScript((t) => localStorage.setItem('authToken', t), await tokenOf(request, username))
  return ctx
}

test('auth code entry: verify-account and forgot-password OTP have named controls', async ({ page, browser, request }) => {
  await page.goto('/forgot-password')
  expect(await scan(page)).toEqual([])
  await page.getByLabel('Email address').fill('buyer2@example.test')
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByLabel('Verification code')).toBeFocused()
  expect(await scan(page)).toEqual([])

  const ctx = await signedIn(browser, request, 'demo_buyer1')
  const verify = await ctx.newPage()
  await verify.goto('/verify-account')
  await expect(verify.getByRole('heading', { level: 1, name: /verify your account/i })).toBeVisible()
  await verify.getByLabel('Verification code').fill('12 34 56') // pasted with spaces: digits are kept
  await expect(verify.getByLabel('Verification code')).toHaveValue('123456')
  expect(await scan(verify)).toEqual([])
  await ctx.close()
})

test('header category menu, own profile, seller forms and admin users have named controls', async ({ browser, request }) => {
  const seller = await signedIn(browser, request, 'demo_seller')
  const page = await seller.newPage()
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await page.getByRole('button', { name: /categories/i }).focus() // keyboard: a mouse click lands after hover already opened it
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: /subcategories/ }).first()).toBeVisible()
  expect(await scan(page)).toEqual([])

  await page.goto('/profile/demo_seller')
  await expect(page.getByRole('button', { name: 'Change profile picture' })).toBeVisible()
  expect(await scan(page)).toEqual([])

  await page.goto('/create-auction')
  await expect(page.getByRole('textbox', { name: 'Description' })).toBeVisible()
  expect(await scan(page)).toEqual([])
  await seller.close()

  const buyer = await signedIn(browser, request, 'demo_buyer2')
  const bp = await buyer.newPage()
  await bp.goto('/become-seller')
  await bp.waitForLoadState('networkidle')
  expect(await scan(bp)).toEqual([])
  await buyer.close()

  const admin = await signedIn(browser, request, 'demo_admin')
  const ap = await admin.newPage()
  for (const path of ['/admin/users', '/admin/upgrades', '/admin/categories']) {
    await ap.goto(path)
    await ap.waitForLoadState('networkidle')
    expect(await scan(ap), path).toEqual([])
  }
  await admin.close()
})

// Theme follows the app toggle, not the OS: the browser below is OS-light while the app is set to dark (and vice versa).
for (const [appTheme, osTheme] of [['light', 'dark'], ['dark', 'light']]) {
  test(`reviews directory has readable contrast in app ${appTheme} mode (OS ${osTheme})`, async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: osTheme })
    await ctx.addInitScript((t) => localStorage.setItem('theme', t), appTheme)
    const page = await ctx.newPage()
    await page.goto('/reviews')
    await expect(page.locator('.reviews-header h1')).toBeVisible()
    const contrast = (await new AxeBuilder({ page }).withRules(['color-contrast']).analyze()).violations
      .flatMap((v) => v.nodes.map((n) => n.target.join(' ')))
    expect(contrast).toEqual([])
    await ctx.close()
  })
}

test('route CSS does not leak: after the profile page, admin selects keep their own styling', async ({ browser, request }) => {
  const admin = await signedIn(browser, request, 'demo_admin')
  const page = await admin.newPage()
  await page.goto('/profile/demo_admin') // loads the filter bar stylesheet
  await expect(page.locator('.filter-bar-glass')).toBeVisible()
  await page.evaluate(() => { history.pushState({}, '', '/admin/users'); dispatchEvent(new PopStateEvent('popstate')) }) // in-app navigation keeps loaded CSS
  const role = page.getByRole('combobox', { name: 'Filter by role' })
  await expect(role).toBeVisible()
  expect(await role.evaluate((el) => getComputedStyle(el).paddingLeft)).toBe('40px') // its own pl-10, not the old global `select` rule
  await admin.close()
})
