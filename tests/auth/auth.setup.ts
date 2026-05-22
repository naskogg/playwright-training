import { test as setup } from '@playwright/test';
import { LoginPage } from '@pages/LoginPage';
import { AUTH_FILE } from '@utils/constants';
import { VALID_USER } from '@utils/users';

setup('authenticate', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.visit();
  await loginPage.login(VALID_USER.username, VALID_USER.password);
  await page.context().storageState({ path: AUTH_FILE });
});
