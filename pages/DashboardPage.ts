import { type Locator, type Page, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly homeButton: Locator;
  readonly eventsButton: Locator;
  readonly bookingsButton: Locator;
  readonly userEmailDisplay: Locator;

  constructor(page: Page) {
    this.page = page;
    this.homeButton = page.getByTestId('nav-home');
    this.eventsButton = page.getByTestId('nav-events');
    this.bookingsButton = page.getByTestId('nav-bookings');
    this.userEmailDisplay = page.getByTestId('user-email-display');
  }

  async visit(): Promise<void> {
    await this.page.goto('/');
  }

  async isUserLoggedIn(expectedEmail: string): Promise<void> {
    await expect(this.userEmailDisplay).toHaveText(expectedEmail);
  }

  async navigateToHome(): Promise<void> {
    await this.homeButton.click();
    await expect(this.page).toHaveURL('/');
  }

  async navigateToEvents(): Promise<void> {
    await this.eventsButton.click();
    await expect(this.page).toHaveURL('/events');
  }

  async navigateToBookings(): Promise<void> {
    await this.bookingsButton.click();
    await expect(this.page).toHaveURL('/bookings');
  }
}
