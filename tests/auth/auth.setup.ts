import { test as setup } from '@playwright/test';

const authFile = 'auth.json';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');

  await page.context().storageState({ path: authFile });
});
