import { test, expect } from '@playwright/test'
import { API, tokenOf, freshLot } from './fixtures.js'

// buyer reports a lot from its page -> admin cancels it from Reports with a note -> the lot is cancelled and the decision
// is in the audit log. Uses its own lot.
test('report a listing -> admin cancels it with a note -> audited', async ({ browser, request }) => {
  const buyer = await tokenOf(request, 'demo_buyer1')
  const admin = await tokenOf(request, 'demo_admin')
  const lotId = await freshLot(request, await tokenOf(request, 'demo_seller'), { openingBid: { token: await tokenOf(request, 'demo_buyer2'), amount: '1500000' } })
  const lot = await (await request.get(`${API}/auction/${lotId}`)).json()

  const buyerCtx = await browser.newContext()
  await buyerCtx.addInitScript((t) => localStorage.setItem('authToken', t), buyer)
  const bp = await buyerCtx.newPage()
  await bp.goto(`/auction/${lotId}`)
  await bp.getByRole('button', { name: 'Report this listing' }).click()
  const dialog = bp.getByRole('dialog', { name: 'Report this listing' })
  await dialog.getByLabel('Counterfeit or replica').check()
  await dialog.getByLabel('Details (optional)').fill('Case back engraving does not match the model')
  await dialog.getByRole('button', { name: 'Send report' }).click()
  await expect(bp.getByText('Thanks. An admin will review this listing.')).toBeVisible()
  await buyerCtx.close()

  const adminCtx = await browser.newContext()
  await adminCtx.addInitScript((t) => localStorage.setItem('authToken', t), admin)
  const ap = await adminCtx.newPage()
  await ap.goto('/admin/reports')
  await expect(ap.getByRole('heading', { name: 'Listing reports' })).toBeVisible()
  await ap.getByRole('button', { name: `Cancel listing ${lot.title}` }).click()
  const confirm = ap.getByRole('dialog', { name: 'Cancel this listing?' })
  await expect(confirm.getByRole('button', { name: 'Cancel listing' })).toBeDisabled() // a note is required
  await confirm.getByLabel('Decision note').fill('Counterfeit confirmed from photos')
  await confirm.getByRole('button', { name: 'Cancel listing' }).click()
  await expect(ap.getByText('Listing cancelled and reports closed')).toBeVisible()

  expect((await (await request.get(`${API}/auction/${lotId}`)).json()).status).toBe('cancelled')
  await ap.goto('/admin/audit')
  const row = ap.getByRole('row').filter({ hasText: `listing #${lotId}` })
  await expect(row).toContainText('listing.cancel')
  await expect(row).toContainText('Counterfeit confirmed from photos')
  await expect(row).toContainText('status: active → cancelled')
  await adminCtx.close()
})
