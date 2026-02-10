import { test, expect } from '@playwright/test';

test.describe('Přihlášení farmáře', () => {
  test('Farmář se přihlásí a otevře Moje prodejna', async ({ page }) => {
    await page.goto('/prihlaseni');

    await page.fill('[data-testid="login-username"]', 'test_farmar');
    await page.fill('[data-testid="login-password"]', 'Test1234');
    await page.click('[data-testid="login-submit"]');

    await expect(page).toHaveURL('/moje-prodejna');
    await expect(page.getByTestId('page-title')).toHaveText('Moje prodejna');
  });

  test('Zobrazí chybu při špatném hesle', async ({ page }) => {
    await page.goto('/prihlaseni');

    await page.fill('[data-testid="login-username"]', 'test_farmar');
    await page.fill('[data-testid="login-password"]', 'spatne_heslo');
    await page.click('[data-testid="login-submit"]');

    await expect(page.getByTestId('login-error')).toBeVisible();
  });
});
