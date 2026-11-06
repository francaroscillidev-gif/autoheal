import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('User Navigation & Form Interaction Smoke Test', async ({ page }) => {
  const htmlPath = path.resolve(__dirname, 'app.html');

  await page.goto(`file://${htmlPath}`);

  // Compila campo input: Via Roma 10

  await page.getByPlaceholder('Via Roma 10').fill('Test value');

  // Clicca bottone azione

  await page.getByTestId('checkout-submit').click();

  // Verifica asserzione di base
  await expect(page).toHaveTitle(/./);
});
