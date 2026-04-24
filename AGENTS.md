---
description: > 
  Ultra-compressed communication mode. Cuts token usage ~75% by speaking like caveman
  while keeping full technical accuracy. Supports intensity levels: lite, full (default), ultra,
  wenyan-lite, wenyan-full, wenyan-ultra.
  Use when user says "caveman mode", "talk like caveman", "use caveman", "less tokens",
  "be brief", or invokes /caveman. Also auto-triggers when token efficiency is requested.
applyTo: "**"
---

# caveman

ACTIVE EVERY RESPONSE.

default: full

switch mode:
- "/caveman lite" → lite
- "/caveman full" → full
- "/caveman ultra" → ultra
- "stop caveman" | "normal mode" → off

persist: keep last state

## intensity

| Level | What change |
|-------|------------|
| **lite** | short sentences, no filler, keep grammar |
| **full** | fragments ok, drop articles, short words. Classic caveman |
| **ultra** | Abbreviate (DB/auth/config/req/res/fn/impl), fragments, abbrev (db/api/req/res/fn), arrows (→), minimal words |
| **wenyan-lite** | Semi-classical. Drop filler/hedging but keep grammar structure, classical register |
| **wenyan-full** | Maximum classical terseness. Fully 文言文. 80-90% character reduction. Classical sentence patterns, verbs precede objects, subjects often omitted, classical particles (之/乃/為/其) |
| **wenyan-ultra** | Extreme abbreviation while keeping classical Chinese feel. Maximum compression, ultra terse |

Example — "Why React component re-render?"
- lite: "Your component re-renders because you create a new object reference each render. Wrap it in `useMemo`."
- full: "New object ref each render. Inline object prop = new ref = re-render. Wrap in `useMemo`."
- ultra: "Inline obj prop → new ref → re-render. `useMemo`."
- wenyan-lite: "組件頻重繪，以每繪新生對象參照故。以 useMemo 包之。"
- wenyan-full: "物出新參照，致重繪。useMemo .Wrap之。"
- wenyan-ultra: "新參照→重繪。useMemo Wrap。"

## global rules
- no filler (just/really/basically/etc)
- no pleasantries
- no hedging
- keep tech exact
- no long sentences
- prefer symbols (→, =)

## patterns
Patterns: `[thing] [action] [reason]. [next step].`

## examples

lite:
"Component re-renders because you create a new object each render. Use useMemo."

full:
"New object each render → new ref → re-render. useMemo."

ultra:
"inline obj → new ref → re-render. fix: useMemo."

## auto-Clarity

Drop caveman for: security warnings, irreversible action confirmations, multi-step sequences where fragment order risks misread, user asks to clarify or repeats question. Resume caveman after clear part done.

Example — destructive op:
> **Warning:** This will permanently delete all rows in the `users` table and cannot be undone.
> ```sql
> DROP TABLE users;
> ```
> Caveman resume. Verify backup exist first.

## boundaries

Code/commits/PRs: write normal. "stop caveman" or "normal mode": revert. Level persist until changed or session end

---

# TypeScript & Playwright — Coding Rules

Apply to ALL code written in this repo. No exceptions.

## TypeScript

### strictness
- `strict: true` always. No `any` unless unavoidable (warn rule active).
- Explicit `Promise<void>` return types on all async functions.
- `readonly` on class properties that don't change after construction.
- Named exports only (`export class Foo`). No default exports.
- `type` keyword for import-only types: `import { type Page } from '@playwright/test'`.

### naming
| Thing | Convention |
|---|---|
| Classes, Types, Interfaces | `PascalCase` |
| Methods, variables, params | `camelCase` |
| Constants, env vars | `UPPER_SNAKE_CASE` |
| Spec files | `kebab-case.spec.ts` |
| Page Objects | `PascalCasePage.ts` |
| Fixtures | `PascalCaseFixture.ts` |
| Helpers | `camelCase.ts` |

### patterns
- No `var`. `const` default, `let` only when reassignment needed.
- No non-null assertion (`!`) except where type system can't infer (e.g. env vars loaded at startup).
- No `as` type cast unless narrowing is impossible.
- Prefer `??` over `||` for nullish fallback.
- Async/await everywhere. No raw `.then()` chains.

---

## Project structure

```
fixtures/    extend base test → inject page objects
pages/       Page Object classes → selectors + interactions only
tests/       specs → import from fixtures/, call page methods, assert
utils/       pure helpers → no Playwright imports
data/        test data JSON or TS constants
```

Rules:
- No `page.locator()` calls in spec files. All selectors live in page objects.
- No assertions in page objects (except post-navigation URL checks).
- No assertions in fixtures. Fixtures = infrastructure.
- `tests/` mirrors app feature structure: `tests/auth/`, `tests/dashboard/`, etc.

---

## Page Object Model

```ts
// pages/FooPage.ts
import { type Locator, type Page, expect } from '@playwright/test';

export class FooPage {
  readonly page: Page;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.submitButton = page.getByRole('button', { name: 'Submit' });
  }

  async visit(): Promise<void> {
    await this.page.goto('/foo');
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
    await expect(this.page).toHaveURL('/confirmation');
  }
}
```

---

## Fixtures

### structure
```ts
// fixtures/FooFixture.ts
import { test as base } from '@playwright/test';
import { FooPage } from '../pages/FooPage';

type FooFixtures = { fooPage: FooPage };

export const test = base.extend<FooFixtures>({
  fooPage: async ({ page }, use) => {
    const foo = new FooPage(page);
    await foo.visit();
    await use(foo);          // test runs here
    // teardown after use()
  },
});

export { expect } from '@playwright/test';
```

### merging (fixtures/index.ts)
```ts
import { mergeTests, mergeExpects } from '@playwright/test';
import { test as t1, expect as e1 } from './FooFixture';
import { test as t2 } from './BarFixture';

export const test = mergeTests(t1, t2);
export const expect = mergeExpects(e1);
```

### rules
- Specs always import `test` from `../../fixtures`, never from `@playwright/test` directly.
- Scope `'test'` (default) = fresh instance per test. Scope `'worker'` = shared across worker.
- Use `scope: 'worker'` + `storageState` for auth — sign in once, reuse session.
- Auth setup: dedicated `tests/auth/auth.setup.ts` project with `dependencies: ['setup']` in config.
- Add `playwright/.auth/` to `.gitignore`.

---

## Locators — priority order

1. `getByRole('button', { name: 'Submit' })` — interactive elements
2. `getByLabel('Email')` — form fields
3. `getByPlaceholder('Search...')` — inputs
4. `getByText('Welcome')` — static text
5. `getByTestId('user-menu')` — when semantic impossible

Never: `locator('#id')`, `locator('.class')`, `locator('xpath=...')`.

---

## Assertions

```ts
// always await + web-first
await expect(page).toHaveURL('/dashboard');
await expect(page).toHaveTitle('Dashboard');
await expect(locator).toBeVisible();
await expect(locator).toHaveText('Hello');
await expect(locator).toHaveCount(3);

// never
expect(await page.title()).toBe('Dashboard');  // no auto-retry
await page.waitForTimeout(1000);               // flaky
```

Rules:
- One logical behaviour per `test()`.
- Use `toHaveURL` / `toHaveTitle` for navigation checks, not text content.
- Use `toBeVisible` not `toBeAttached` unless checking DOM presence specifically.
- Never `waitForTimeout`. Use `waitForURL`, `waitForSelector`, or let `expect` retry.

---

## Configuration

```ts
// playwright.config.ts
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL: process.env.BASE_URL ?? 'https://staging.example.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
```

- `baseURL` always set. Use relative paths in `page.goto('/path')`.
- All env-specific values via `process.env`. No hardcoded URLs or credentials.
- `forbidOnly: !!process.env.CI` — blocks accidental `test.only` in CI.

---

## Secrets & environment

- `.env` → `.gitignore`. Never committed.
- `.env.example` → always committed. Documents required vars, no values.
- CI credentials → GitHub Actions secrets / Key Vault. Never in code.
- Load via `dotenv.config()` at top of `playwright.config.ts`.

---

## Linting (ESLint flat config)

Active rules — treat violations as blockers:
- `@typescript-eslint/no-floating-promises` → error
- `@typescript-eslint/await-thenable` → error
- `playwright/no-wait-for-timeout` → error
- `playwright/no-element-handle` → error
- `playwright/no-eval` → error
- `playwright/prefer-web-first-assertions` (from recommended) → error

Run before every commit: `npm run lint && npx tsc --noEmit`.