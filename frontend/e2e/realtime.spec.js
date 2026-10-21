import { test, expect } from '@playwright/test'

// Needs API (:3000) + Vite (:5173) against the seeded dev DB. Two real browser contexts, bids sent through the real API.
const API = process.env.E2E_API_URL || 'http://localhost:3000'

const login = async (request, identifier) => {
  const body = await (await request.post(`${API}/auth/login`, { data: { identifier, password: 'Passw0rd!demo' } })).json()
  return { token: body.token, id: body.user.userId }
}
const buyers = (request) => Promise.all([login(request, 'demo_buyer1'), login(request, 'demo_buyer2')])
const vnd = (digits) => `${BigInt(digits).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} ₫`

async function openLot(request) {
  const lots = await (await request.get(`${API}/auction/top?sortBy=mostBids`)).json()
  const lot = lots.find((l) => l.status === 'active' && l.bidCount > 0 && new Date(l.endTime) - Date.now() > 10 * 60_000)
  expect(lot, 'seed must contain an active lot with bids').toBeTruthy()
  return (await (await request.get(`${API}/auction/${lot.id}`)).json())
}

/** Bid as whoever is NOT leading: win or get outbid, the public price moves either way. */
async function outbidLeader(request, people, id) {
  const lot = await (await request.get(`${API}/auction/${id}`)).json()
  const who = people.find((p) => p.id !== lot.winnerId)
  const amount = (BigInt(lot.minimumNextBid) * 11n / 10n).toString()
  const res = await request.post(`${API}/auction/${id}/bid`, { headers: { Authorization: `Bearer ${who.token}` }, data: { amount } })
  expect(res.ok()).toBeTruthy()
  const r = await res.json()
  expect(r.currentPrice).not.toBe(lot.currentPrice)
  return r
}

test('two clients converge on the canonical price without reloading', async ({ browser, request }) => {
  const people = await buyers(request)
  const lot = await openLot(request)
  const pages = [await (await browser.newContext()).newPage(), await (await browser.newContext()).newPage()]
  for (const p of pages) {
    await p.goto(`/auction/${lot.id}`)
    await expect(p.getByRole('heading', { level: 1, name: lot.title })).toBeVisible()
  }

  for (let i = 0; i < 2; i++) {
    const sentAt = Date.now()
    const r = await outbidLeader(request, people, lot.id)
    for (const p of pages) await expect(p.getByText(vnd(r.currentPrice), { exact: true }).first()).toBeVisible({ timeout: 5000 })
    console.log(JSON.stringify({ metric: 'e2e_update_visible_ms', ms: Date.now() - sentAt }))
  }
  for (const p of pages) await p.context().close()
})

test('offline: honest label, then catch up on reconnect', async ({ page, request }) => {
  const people = await buyers(request)
  const lot = await openLot(request)
  await page.goto(`/auction/${lot.id}`)
  await expect(page.getByRole('heading', { level: 1, name: lot.title })).toBeVisible()

  await page.context().setOffline(true)
  await expect(page.getByText(/You are offline/)).toBeVisible()
  const r = await outbidLeader(request, people, lot.id) // happens while this client cannot hear about it
  await page.context().setOffline(false)
  await expect(page.getByText(vnd(r.currentPrice), { exact: true }).first()).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(/You are offline|Live updates paused/)).toHaveCount(0)
})
