import { test, expect } from '@playwright/test';
import { loginAsFarmar } from './helpers/login';

test.describe('Moje prodejna', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsFarmar(page);
  });

  test('Zobrazí seznam objednávek', async ({ page }) => {
    await expect(page.getByTestId('page-title')).toHaveText('Moje prodejna');
    await expect(page.getByTestId('orders-section')).toBeVisible();
  });

  test('Farmář otevře Moje produkty', async ({ page }) => {
    await page.click('[data-testid="nav-produkty"]');
    await expect(page).toHaveURL('/moje-prodejna/seznam-produktu');
  });

  test('Farmář otevře Můj profil', async ({ page }) => {
    await page.click('[data-testid="nav-profil"]');
    await expect(page).toHaveURL('/muj-profil');
  });

  test('Farmář otevře dokončené objednávky', async ({ page }) => {
    await page.click('[data-testid="nav-dokoncene"]');
    await expect(page).toHaveURL('/moje-prodejna/dokoncene-objednavky');
  });
});
