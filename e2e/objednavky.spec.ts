import { test, expect } from '@playwright/test';
import { loginAsFarmar } from './helpers/login';

test.describe('Objednávky farmáře', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsFarmar(page);
  });

  test('Farmář rozbalí objednávku a vidí položky', async ({ page }) => {
    // Klikni na první objednávku
    const orderCard = page.getByTestId('order-card').first();

    // Pokud existuje objednávka
    if (await orderCard.isVisible()) {
      await orderCard.click();
      await expect(page.getByTestId('order-items')).toBeVisible();
    }
  });

  test('Farmář označí položku jako připravenou', async ({ page }) => {
    const orderCard = page.getByTestId('order-card').first();

    if (await orderCard.isVisible()) {
      await orderCard.click();

      const prepareBtn = page.getByTestId('item-prepare-btn').first();
      await prepareBtn.click();

      await expect(prepareBtn).toHaveAttribute('data-active', 'true');
    }
  });

  test('Farmář označí položku jako nedostupnou', async ({ page }) => {
    const orderCard = page.getByTestId('order-card').first();

    if (await orderCard.isVisible()) {
      await orderCard.click();

      const unavailableBtn = page.getByTestId('item-unavailable-btn').first();
      await unavailableBtn.click();

      await expect(unavailableBtn).toHaveAttribute('data-active', 'true');
    }
  });

  test('Farmář otevře detail objednávky', async ({ page }) => {
    const orderCard = page.getByTestId('order-card').first();

    if (await orderCard.isVisible()) {
      await orderCard.click();
      await page.click('[data-testid="order-detail-btn"]');

      await expect(page).toHaveURL(/\/moje-prodejna\/detail-objednavky/);
    }
  });
});
