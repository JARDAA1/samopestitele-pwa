import { test, expect } from '@playwright/test';

test.describe('Zákazník - objednávka', () => {
  test('Zákazník přidá produkt do nákupního seznamu', async ({ page }) => {
    // Otevři stránku farmáře
    await page.goto('/farmar/1');

    // Přidej produkt
    await page.click('[data-testid="add-product"]');
    await page.fill('[data-testid="quantity-input"]', '2');
    await page.click('[data-testid="confirm-add-product"]');

    // Ověř, že produkt je v seznamu
    await expect(page.getByTestId('cart-badge')).toBeVisible();
  });

  test('Zákazník odešle objednávku', async ({ page }) => {
    // Otevři nákupní seznam
    await page.goto('/nakupni-seznam');

    // Pokud je něco v košíku
    const sendBtn = page.getByTestId('send-order');
    if (await sendBtn.isEnabled()) {
      await sendBtn.click();
      await expect(page.getByTestId('order-success')).toBeVisible();
    }
  });

  test('Zákazník vyplní telefon před odesláním', async ({ page }) => {
    await page.goto('/nakupni-seznam');

    await page.fill('[data-testid="customer-phone"]', '777123456');
    await expect(page.getByTestId('customer-phone')).toHaveValue('777123456');
  });
});
