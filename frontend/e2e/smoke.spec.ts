import { test, expect } from '@playwright/test'

test('home page renders the brand', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('body')).toContainText(/aurum/i)
})
