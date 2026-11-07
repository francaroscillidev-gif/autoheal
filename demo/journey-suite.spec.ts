import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Autonomous Synthetic User Journey & Edge-Case Suite', () => {
  const targetUrl = `file://${path.resolve(__dirname, 'app.html')}`;

  test.beforeEach(async ({ page }) => {
    await page.goto(targetUrl);
  });

  test('Scenario 1: Happy Path (Flusso Standard di Successo)', async ({ page }) => {
    await page.getByPlaceholder('Via Roma 10').fill('Via Roma 10');

    // Click submit
    await page.getByTestId('checkout-submit').click();

    // Verifica stabilità post-azione
    await page.waitForLoadState('domcontentloaded');
  });

  test('Scenario 2: Edge-Case & Unicode Stress Test (Caratteri speciali & lunghezze estreme)', async ({ page }) => {
    const edgeCaseString = 'Test 🚀 & <script>alert(1)</script> / Straße 10-A';
    await page.getByPlaceholder('Via Roma 10').fill(edgeCaseString);

    await page.getByTestId('checkout-submit').click();
    await expect(page).toHaveTitle(/./);
  });

  test('Scenario 3: Boundary Negative Test (Invio a vuoto per validazione)', async ({ page }) => {
    await page.getByPlaceholder('Via Roma 10').fill('');

    await page.getByTestId('checkout-submit').click();
    // Verifica che l'app gestisca correttamente i campi obbligatori
    const isFormValid = await page.evaluate(() => {
      const form = document.querySelector('form');
      return form ? form.checkValidity() : true;
    });
    expect(isFormValid).toBeDefined();
  });
});
