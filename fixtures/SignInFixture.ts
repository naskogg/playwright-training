import { test as base } from '@playwright/test';
import { LoginPage } from '@pages/LoginPage';

export const AUTH_FILE = 'playwright/.auth/auth.json';

type WorkerFixtures = {
  signIn: void;
};

export const test = base.extend<{}, WorkerFixtures>({
  signIn: [
    async ({ browser }, use) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      const loginPage = new LoginPage(page);
      await loginPage.visit();
      await loginPage.login(process.env.USERNAME!, process.env.PASSWORD!);

      await context.storageState({ path: AUTH_FILE });
      await context.close();

      await use();
    },
    { scope: 'worker' },
  ],
});

export { expect } from '@playwright/test';
