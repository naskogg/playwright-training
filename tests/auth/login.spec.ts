import { test, expect } from '@playwright/test';
import { LoginPage } from '@pages/LoginPage';
import { VALID_USER } from '@utils/users';

test.describe('Login — negative cases', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.visit();
  });

  test('shows error for wrong password', async () => {
    await loginPage.login(VALID_USER.username, 'wrong-password');
    await expect(loginPage.errorMessage).toBeVisible();
  });

  test('shows error for wrong email', async () => {
    await loginPage.login('notauser@example.com', VALID_USER.password);
    await expect(loginPage.errorMessage).toBeVisible();
  });

  test('shows error for empty email', async () => {
    await loginPage.login('', VALID_USER.password);
    await expect(loginPage.errorMessage).toBeVisible();
  });

  test('shows error for empty password', async () => {
    await loginPage.login(VALID_USER.username, '');
    await expect(loginPage.errorMessage).toBeVisible();
  });

  test('shows error for empty email and password', async () => {
    await loginPage.login('', '');
    await expect(loginPage.errorMessage).toBeVisible();
  });
});
