import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('completa il checkout del carrello con successo', async ({ page }) => {
  const htmlPath = path.resolve(__dirname, 'app.html');
  await page.goto(`file://${htmlPath}`);

  // Compila l'indirizzo
  await page.locator('#address').fill('Via Dante 42');

  // Test fragile: usa una vecchia classe CSS '.old-btn-submit' che lo sviluppatore frontend ha rimosso
  await page.getByTestId('checkout-submit').click();

  // Verifica la conferma
  await expect(page.locator('#confirmation')).toBeVisible();
});
