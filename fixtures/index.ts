import { mergeTests, mergeExpects } from '@playwright/test';
import { test as signInTest, expect as signInExpect } from '@fixtures/SignInFixture';

export const test = mergeTests(signInTest);
export const expect = mergeExpects(signInExpect);
