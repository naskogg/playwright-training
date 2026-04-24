# Playwright Test Framework — TypeScript Best Practices

A reference guide for structuring, naming, and writing maintainable Playwright tests in TypeScript.

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Naming Conventions](#naming-conventions)
3. [Page Object Model (POM)](#page-object-model-pom)
4. [Fixtures](#fixtures)
5. [Configuration](#configuration)
6. [Locator Strategy](#locator-strategy)
7. [Assertions](#assertions)
8. [Environment & Secrets](#environment--secrets)
9. [CI/CD Considerations](#cicd-considerations)
10. [Code Quality](#code-quality)
11. [Running Tests](#running-tests)

---

## Project Structure

Organize files by concern. Keep tests thin; put reusable logic in pages, fixtures, and helpers.

```
playwright-training/
├── fixtures/               # Custom test fixtures (extend base `test`)
│   ├── index.ts            # Re-exports all fixtures as a single `test` object
│   └── SignInFixture.ts
├── pages/                  # Page Object classes (one file per page/component)
│   └── DashboardPage.ts
├── tests/                  # Test specs, mirroring app feature areas
│   ├── auth/
│   │   └── sign-in.spec.ts
│   └── dashboard/
│       └── dashboard.spec.ts
├── utils/                  # Shared helpers (date formatters, API clients, etc.)
├── data/                   # Static test data / JSON fixtures
├── .env.example            # Template for required environment variables
├── playwright.config.ts
├── tsconfig.json
└── package.json
```

### Key Rules

- **One concern per folder.** Pages live in `pages/`, fixtures in `fixtures/`, specs in `tests/`.
- **Mirror app structure in `tests/`.** Group specs by feature area so failures are easy to locate.
- **No test logic in page objects.** Page objects navigate and interact; assertions belong in tests.
- **No page object logic in spec files.** Specs call page object methods; raw `page.locator()` calls do not belong in specs.

---

## Naming Conventions

| Artifact | Convention | Example |
|---|---|---|
| Spec files | `kebab-case.spec.ts` | `sign-in.spec.ts` |
| Page Object files | `PascalCasePage.ts` | `DashboardPage.ts` |
| Fixture files | `PascalCaseFixture.ts` | `SignInFixture.ts` |
| Helper/utility files | `camelCase.ts` | `apiClient.ts` |
| Test data files | `camelCase.json` | `validUser.json` |
| Classes | `PascalCase` | `DashboardPage` |
| Methods & properties | `camelCase` | `navigateToHome()`, `homeButton` |
| `test()` descriptions | Sentence case, describe the behaviour | `'shows an error when password is wrong'` |
| `test.describe()` blocks | Feature or page name | `'Sign In'`, `'Dashboard'` |
| Environment variables | `SCREAMING_SNAKE_CASE` | `BASE_URL`, `ADMIN_PASSWORD` |

---

## Page Object Model (POM)

Encapsulate all selectors and interactions for a page in a dedicated class.

```ts
// pages/DashboardPage.ts
import { type Locator, type Page, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly homeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // Prefer data-testid selectors — they survive CSS/text refactors
    this.homeButton = page.getByTestId('nav-home');
  }

  async visit() {
    await this.page.goto('/');
  }

  async navigateToHome() {
    await this.homeButton.click();
    await expect(this.page).toHaveURL('/');
  }
}
```

### POM Guidelines

- **Export the class** — always use `export class`, not a default export, to support named imports.
- **Declare locators as `readonly` properties** — initialised in the constructor, never reassigned.
- **Keep navigation logic in page objects** — `goto`, `click`, `fill` belong here.
- **Keep assertions in tests** — except for post-action state checks that are part of the action itself (e.g. waiting for a URL change after navigation).
- **One class per logical page or major component.** Split large pages into component classes if needed.

---

## Fixtures

Playwright fixtures are the primary mechanism for sharing setup, teardown, and dependencies between tests. They extend the built-in `test` object so that anything declared as a fixture becomes an auto-injected parameter in every test function.

### Why use fixtures instead of `beforeEach`?

| `beforeEach` | Fixtures |
|---|---|
| Imperative — runs top-to-bottom | Declarative — only runs when a test requests it |
| Shared state requires module-level variables | Each test gets its own isolated instance |
| Teardown in `afterEach` is easy to forget | Teardown is co-located with setup, after `use()` |
| Hard to compose across multiple files | Fixtures chain naturally via merging |

### Anatomy of a fixture

```ts
// fixtures/SignInFixture.ts
import { test as base } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage';

// 1. Declare the shape of your custom fixtures as a type
type MyFixtures = {
  dashboardPage: DashboardPage;
};

// 2. Extend the base `test` object
export const test = base.extend<MyFixtures>({
  // 3. Each key is a fixture function: ({ built-ins }, use) => Promise<void>
  dashboardPage: async ({ page }, use) => {
    // SETUP — runs before the test body
    const dashboard = new DashboardPage(page);
    await dashboard.visit();

    // HANDOFF — passes the value into the test; execution pauses here until the test finishes
    await use(dashboard);

    // TEARDOWN — runs after the test body, even if the test fails
    // e.g. await dashboard.logout();
  },
});

// 4. Always re-export `expect` so test files only need one import
export { expect } from '@playwright/test';
```

### Merging multiple fixture files

As the suite grows, split fixtures by feature area and merge them into a single entry point:

```ts
// fixtures/index.ts
import { mergeTests, mergeExpects } from '@playwright/test';
import { test as signInTest, expect as signInExpect } from './SignInFixture';
import { test as checkoutTest } from './CheckoutFixture';

// Produces a single `test` object that has all fixtures available
export const test = mergeTests(signInTest, checkoutTest);
export const expect = mergeExpects(signInExpect);
```

Every spec file then imports from this single index — no matter how many fixture files exist:

```ts
// tests/dashboard/dashboard.spec.ts
import { test, expect } from '../../fixtures';

test('shows the home button', async ({ dashboardPage }) => {
  await expect(dashboardPage.homeButton).toBeVisible();
});
```

### Worker-scoped fixtures (authentication)

By default, each fixture runs once per test (`scope: 'test'`). For expensive operations like browser-based sign-in, use `scope: 'worker'` to share the result across all tests in the same worker process.

The recommended pattern is to save authenticated storage state to disk once, then load it as the browser context for every test:

**Step 1 — Create a setup project that generates auth state:**

```ts
// tests/auth/auth.setup.ts
import { test as setup } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.ADMIN_EMAIL!);
  await page.getByLabel('Password').fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/dashboard');

  // Persist cookies + localStorage so other tests can reuse this session
  await page.context().storageState({ path: authFile });
});
```

**Step 2 — Load the saved state in `playwright.config.ts`:**

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  projects: [
    // Run auth setup first, before any test project
    { name: 'setup', testMatch: '**/auth.setup.ts' },

    {
      name: 'chromium',
      use: {
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});
```

This means sign-in happens once per worker, and every test starts with an already-authenticated browser context.

### Fixture Guidelines

- **Always import `test` from your fixtures index**, not directly from `@playwright/test`, in spec files. This ensures all custom fixtures are available.
- **Keep fixture files focused.** One feature area per file (`SignInFixture.ts`, `CheckoutFixture.ts`). Merge in `fixtures/index.ts`.
- **Co-locate teardown with setup** — write cleanup code after `await use(...)` rather than in a separate `afterEach`.
- **Use `scope: 'worker'` for authentication state** — avoids repeated sign-in across tests in the same worker.
- **Never put assertions in fixtures** — fixtures are infrastructure; assertions belong in tests.
- **Add `.auth/` to `.gitignore`** — the saved storage state file contains session tokens.

---

## Configuration

`playwright.config.ts` is the single source of truth for test behaviour.

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,      // Fail CI if test.only is committed
  retries: process.env.CI ? 2 : 0,  // Retry flaky tests in CI only
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL: process.env.BASE_URL ?? 'https://staging.example.com',
    trace: 'on-first-retry',         // Capture traces on failure
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
  ],
});
```

### Configuration Guidelines

- **Set `baseURL`** and use relative paths (`'/'`, `'/dashboard'`) in `page.goto()`.
- **Use `process.env` for all environment-specific values** — never hardcode URLs or credentials.
- **Enable `fullyParallel: true`** — tests must be independent to run in parallel.
- **Set `forbidOnly: !!process.env.CI`** — prevents accidental `test.only` from blocking the suite.
- **Use `'on-first-retry'` for traces** — balances debuggability with disk usage.

---

## Locator Strategy

Prefer locators that reflect how users perceive the UI. Playwright's built-in locators are auto-retrying and composable.

| Priority | Method | When to use |
|---|---|---|
| 1 | `getByRole()` | Interactive elements (buttons, links, inputs) |
| 2 | `getByLabel()` | Form fields associated with a label |
| 3 | `getByPlaceholder()` | Inputs with placeholder text |
| 4 | `getByText()` | Static visible text |
| 5 | `getByTestId()` | When semantic selectors are impractical |
| Avoid | `locator('css=...')` / `locator('xpath=...')` | Fragile, implementation-coupled |

```ts
// Preferred
page.getByRole('button', { name: 'Submit' });
page.getByLabel('Email address');
page.getByTestId('user-menu');

// Avoid
page.locator('#submit-btn');
page.locator('//button[contains(@class, "btn-primary")]');
```

---

## Assertions

Use Playwright's web-first `expect` assertions — they automatically wait and retry.

```ts
// Auto-retrying (preferred)
await expect(page).toHaveTitle('Dashboard');
await expect(page).toHaveURL('/dashboard');
await expect(locator).toBeVisible();
await expect(locator).toHaveText('Welcome back');
await expect(locator).toHaveCount(5);

// Avoid synchronous assertions on async state
expect(await page.title()).toBe('Dashboard'); // no auto-retry
```

### Assertion Guidelines

- **One logical concept per `test()`** — a test that checks multiple unrelated things is harder to debug.
- **Use `toHaveURL` / `toHaveTitle` over checking text content** when validating navigation.
- **Use `toBeVisible` not `toBeAttached`** unless you specifically need to check DOM presence without visibility.
- **Avoid `waitForTimeout`** — it creates flakiness. Use `waitForSelector`, `waitForURL`, or let `expect` retry.

---

## Environment & Secrets

```
# .env.example  (committed — shows required variables without values)
BASE_URL=
ADMIN_EMAIL=
ADMIN_PASSWORD=

# .env  (NOT committed — contains real values)
BASE_URL=https://staging.example.com
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secret
```

Load with [dotenv](https://github.com/motdotla/dotenv):

```ts
// playwright.config.ts
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });
```

### Security Rules

- **Never commit `.env`** — add it to `.gitignore`.
- **Always commit `.env.example`** — documents required variables for other developers.
- **Use CI secrets** (GitHub Actions `secrets`, Azure Key Vault, etc.) for production credentials.
- **Never hardcode credentials** in test files, page objects, or config.

---

## CI/CD Considerations

```yaml
# .github/workflows/playwright.yml (example)
- name: Install dependencies
  run: npm ci

- name: Install browsers
  run: npx playwright install --with-deps

- name: Run tests
  run: npx playwright test
  env:
    BASE_URL: ${{ secrets.STAGING_URL }}
    ADMIN_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}

- name: Upload report
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
```

- **Cache `~/.cache/ms-playwright`** between runs to speed up browser installation.
- **Use `reporter: 'github'`** in CI for inline annotation of failures in PRs.
- **Set `retries: 2` in CI** to handle environment flakiness without hiding real bugs.
- **Upload the HTML report as an artifact** — it includes traces, screenshots, and video on failure.

---

## Code Quality

This project uses ESLint, `eslint-plugin-playwright`, and Prettier.

```jsonc
// package.json scripts
"lint":         "eslint . --ext .ts",
"lint:fix":     "eslint . --ext .ts --fix",
"format":       "prettier --check .",
"format:write": "prettier --write .",
"pretest":      "tsc --noEmit && eslint tests/**"
```

### Recommended ESLint Rules (via `eslint-plugin-playwright`)

| Rule | Why |
|---|---|
| `playwright/no-focused-test` | Prevents committing `test.only` |
| `playwright/no-skipped-test` | Flags forgotten `test.skip` |
| `playwright/no-wait-for-timeout` | Discourages arbitrary waits |
| `playwright/prefer-web-first-assertions` | Enforces auto-retrying assertions |
| `playwright/no-page-pause` | Catches debug `page.pause()` calls |

---

## Running Tests

```bash
# Run all tests
npx playwright test

# Run a specific file
npx playwright test tests/auth/sign-in.spec.ts

# Run tests matching a name pattern
npx playwright test --grep "shows an error"

# Run in headed mode (see the browser)
npx playwright test --headed

# Run in UI mode (interactive, with time-travel debugging)
npx playwright test --ui

# Run only in Chromium
npx playwright test --project=chromium

# Show the HTML report from the last run
npx playwright show-report
```

---

## Quick Reference

```
fixtures/       Custom test fixtures  →  extend base `test`, inject page objects
pages/          Page Object classes   →  selectors + interactions, no assertions
tests/          Spec files            →  import from fixtures/, call page methods
utils/          Shared helpers        →  pure functions, no Playwright imports
data/           Test data             →  JSON or TS constants
```
