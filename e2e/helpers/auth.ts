import { expect, type Page } from '@playwright/test';

import type { LocalUser } from './api';

export async function signInUser(page: Page, user: LocalUser): Promise<void> {
  await page.goto('/');
  await page.locator('#access-email').fill(user.email);
  await page.locator('#access-password').fill(user.password);
  await page.locator('.access-submit').click();
  await expect(page).toHaveURL(/\/home/, { timeout: 15_000 });
}

export async function signInAdmin(page: Page, user: LocalUser): Promise<void> {
  await page.goto(process.env.E2E_ADMIN_URL ?? 'http://localhost:7102');
  await page.locator('#admin-email').fill(user.email);
  await page.locator('#admin-password').fill(user.password);
  await page.locator('.admin-access-submit').click();
  await expect(page.locator('[data-admin-view="overview"]')).toBeVisible();
}
