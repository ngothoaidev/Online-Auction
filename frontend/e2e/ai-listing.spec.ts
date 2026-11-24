import { test, expect } from '@playwright/test';
import { API, tokenOf } from './fixtures';
// Real decoded PNG, not only a magic-byte fixture: the AI path fully decodes every image.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAIAAAAC64paAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAJklEQVQ4jWPooAAwjGomDTCQqB4FjGomETCQqgEZjGomEQxcgAEAaMV9nwPsfNkAAAAASUVORK5CYII=', 'base64');

test.skip(process.env.AI_E2E !== '1', 'Requires an explicitly enabled non-production fake AI backend.');
test('seller generates, reviews, applies, undoes and publishes without changing auction rules', async ({ page, request }) => {
  const token = await tokenOf(request, 'demo_seller');
  await page.addInitScript(t => localStorage.setItem('authToken', t), token);
  await page.goto('/create-auction');
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Add photo' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add a photo' });
    await dialog.getByLabel('Choose image file').setInputFiles({ name: `item${i}.png`, mimeType: 'image/png', buffer: PNG });
    await dialog.getByRole('button', { name: 'Use this image' }).click();
    await expect(dialog).toHaveCount(0);
  }
  await page.getByLabel('Seller notes').fill('Used item, scratches reported. No accessories.');
  await page.getByLabel('Draft language').selectOption('vi');
  await page.getByRole('button', { name: 'Generate draft' }).click();
  await expect(page.getByText('Vật phẩm do người bán cung cấp', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'Apply title' }).click();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Vật phẩm do người bán cung cấp');
  await page.getByRole('button', { name: 'Undo title' }).click();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'Apply title' }).click();
  await page.getByRole('button', { name: 'Apply description' }).click();
  // Empty TipTap HTML can be non-empty markup; replacement is still explicitly confirmed.
  const replace = page.getByRole('button', { name: 'Replace content' });
  if (await replace.isVisible()) await replace.click();
  await expect(page.getByRole('textbox', { name: 'Description' })).toContainText('Theo người bán');
  await page.getByRole('button', { name: 'Apply category' }).click();
  await page.getByLabel(/Starting price/).fill('1000000');
  await page.getByLabel(/Bid step/).fill('50000');
  await page.getByLabel('Ends at').fill(new Date(Date.now() + 3 * 3600000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16));
  const created = page.waitForResponse(r => r.url() === `${API}/auction` && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Publish listing' }).click();
  const response = await created;
  expect(response.status()).toBe(201);
  const { auction } = await response.json();
  expect(String(auction.startingPrice)).toBe('1000000');
  expect(String(auction.stepPrice)).toBe('50000');
  await expect(page).toHaveURL('/');
});

test('AI unavailable does not remove or lock the manual listing form', async ({ page, request }) => {
  const token = await tokenOf(request, 'demo_seller');
  await page.addInitScript(t => localStorage.setItem('authToken', t), token);
  await page.route('**/ai/listing-capabilities', route => route.fulfill({ json: { enabled: false, reason: 'AI_DISABLED', dailyRemaining: 0 } }));
  await page.goto('/create-auction');
  await page.getByLabel('Title', { exact: true }).fill('Manual item');
  await expect(page.getByRole('button', { name: 'Generate draft' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Publish listing' })).toBeEnabled();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Manual item');
});
