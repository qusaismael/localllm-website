const { test, expect } = require('@playwright/test');

test('the setup page renders and loads the NDJSON parser', async ({ page }) => {
  const response = await page.goto('/');
  expect(response.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  expect(await page.evaluate(() => typeof parseNdjson)).toBe('function');
});
