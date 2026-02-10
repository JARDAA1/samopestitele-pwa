import { Page } from '@playwright/test';

export async function loginAsFarmar(page: Page) {
  // Navigace na přihlašovací stránku pro prodejnu
  await page.goto('/prihlaseni/prodejna');

  // Vyplnit přihlašovací údaje
  // farm_number: TEST, heslo: Test1234
  await page.fill('[data-testid="login-username"]', 'TEST');
  await page.fill('[data-testid="login-password"]', 'Test1234');
  await page.click('[data-testid="login-submit"]');

  // Počkat na přesměrování do Moje prodejna
  await page.waitForURL('**/moje-prodejna', { timeout: 10000 });
}
