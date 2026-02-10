import { Page } from '@playwright/test';

export async function loginAsFarmar(page: Page) {
  await page.goto('/prihlaseni');
  await page.fill('[data-testid="login-username"]', 'test_farmar');
  await page.fill('[data-testid="login-password"]', 'Test1234');
  await page.click('[data-testid="login-submit"]');
  await page.waitForURL('/moje-prodejna');
}
