import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import { AUTH_FILE } from './utils/constants';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.BASE_URL,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'auth-setup',
      testMatch: 'tests/auth/auth.setup.ts',
    },
    {
      name: 'chromium-no-auth',
      testMatch: 'tests/auth/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium',
      testIgnore: 'tests/auth/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'], storageState: AUTH_FILE },
      dependencies: ['auth-setup'],
    },

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
});
