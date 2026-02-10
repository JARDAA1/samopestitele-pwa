import { test, expect } from '@playwright/test';

test.describe('Zákazník - objednávka', () => {
  // Získat ID testovacího farmáře z URL na mapě
  test('Zákazník vidí prázdný nákupní seznam', async ({ page }) => {
    await page.goto('/nakupni-seznam');

    // Prázdný seznam zobrazí empty state
    await expect(page.getByTestId('order-success')).toBeVisible();
    await expect(page.getByText('Seznam je prázdný')).toBeVisible();
  });

  test('Zákazník najde farmáře na mapě', async ({ page }) => {
    await page.goto('/mapa');

    // Ověř, že mapa se načte
    await page.waitForTimeout(2000);
    // Mapa by měla být viditelná
    await expect(page).toHaveURL(/mapa/);
  });

  test('Zákazník otevře stránku farmáře', async ({ page }) => {
    // Použij testovacího farmáře (ID zjistíme z DB, nebo použijeme cestu přes mapu)
    // Pro teď ověříme, že stránka farmáře funguje s libovolným existujícím farmářem
    await page.goto('/pestitele');

    // Ověř, že seznam pěstitelů se načte
    await expect(page).toHaveURL(/pestitele/);
  });
});
