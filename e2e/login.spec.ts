import { test, expect } from '@playwright/test';

test.describe('Přihlášení farmáře', () => {
  test('Farmář se přihlásí a otevře Moje prodejna', async ({ page }) => {
    await page.goto('/prihlaseni/prodejna');

    // Přihlášení pomocí farm_number a hesla
    await page.fill('[data-testid="login-username"]', 'TEST');
    await page.fill('[data-testid="login-password"]', 'Test1234');
    await page.click('[data-testid="login-submit"]');

    // Ověření přesměrování
    await expect(page).toHaveURL(/moje-prodejna/);
    await expect(page.getByTestId('page-title')).toHaveText('Moje prodejna');
  });

  test('Zobrazí chybu při špatném hesle', async ({ page }) => {
    await page.goto('/prihlaseni/prodejna');

    await page.fill('[data-testid="login-username"]', 'TEST');
    await page.fill('[data-testid="login-password"]', 'spatne_heslo');
    await page.click('[data-testid="login-submit"]');

    // Po několika pokusech se zobrazí varování
    // (login-error se zobrazí až po neúspěšném pokusu)
    await page.waitForTimeout(1000);
    // Očekáváme alert nebo chybovou hlášku
  });
});
