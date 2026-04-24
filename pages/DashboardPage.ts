import { type Locator, type Page, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly homeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.homeButton = page.getByTestId('nav-home');
  }

  async visit(): Promise<void> {
    await this.page.goto('/');
  }

  async navigateToHome(): Promise<void> {
    await this.homeButton.click();
    await expect(this.page).toHaveURL('/');
  }
}
