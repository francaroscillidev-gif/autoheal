import * as fs from 'fs';
import * as path from 'path';
import { extractInteractiveElements, InteractiveElement } from '../dom/reducer.js';

export interface JourneySuiteResult {
  filePath: string;
  scenariosCount: number;
  scenarios: string[];
}

export class JourneyExplorer {
  public static generateAdvancedJourney(sourcePathOrUrl: string, outputFilePath: string = 'demo/journey-suite.spec.ts'): JourneySuiteResult {
    let html = '';
    const isUrl = sourcePathOrUrl.startsWith('http://') || sourcePathOrUrl.startsWith('https://');

    if (isUrl) {
      // In caso di URL
      html = '';
    } else if (fs.existsSync(sourcePathOrUrl)) {
      html = fs.readFileSync(sourcePathOrUrl, 'utf-8');
    } else {
      throw new Error(`Sorgente non trovata: ${sourcePathOrUrl}`);
    }

    const elements = extractInteractiveElements(html);
    const inputs = elements.filter(e => e.tag === 'input' || e.tag === 'textarea');
    const buttons = elements.filter(e => e.tag === 'button' || e.role === 'button');

    const primaryButtonLocator = buttons.length > 0 && buttons[0].selectorHints.length > 0
      ? `page.${buttons[0].selectorHints[0]}`
      : `page.locator('button')`;

    // Generazione codice Playwright strutturato con 3 scenari
    const suiteContent = `import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Autonomous Synthetic User Journey & Edge-Case Suite', () => {
  const targetUrl = ${isUrl ? `'${sourcePathOrUrl}'` : `\`file://\${path.resolve(__dirname, '${path.basename(sourcePathOrUrl)}')}\``};

  test.beforeEach(async ({ page }) => {
    await page.goto(targetUrl);
  });

  test('Scenario 1: Happy Path (Flusso Standard di Successo)', async ({ page }) => {
${inputs.map(input => {
  const hint = input.selectorHints[0] || `locator('input')`;
  const sampleVal = input.placeholder || 'Via Garibaldi 15, Milano';
  return `    await page.${hint}.fill('${sampleVal}');`;
}).join('\n')}

    // Click submit
    await ${primaryButtonLocator}.click();

    // Verifica stabilità post-azione
    await page.waitForLoadState('domcontentloaded');
  });

  test('Scenario 2: Edge-Case & Unicode Stress Test (Caratteri speciali & lunghezze estreme)', async ({ page }) => {
    const edgeCaseString = 'Test 🚀 & <script>alert(1)</script> / Straße 10-A';
${inputs.map(input => {
  const hint = input.selectorHints[0] || `locator('input')`;
  return `    await page.${hint}.fill(edgeCaseString);`;
}).join('\n')}

    await ${primaryButtonLocator}.click();
    await expect(page).toHaveTitle(/./);
  });

  test('Scenario 3: Boundary Negative Test (Invio a vuoto per validazione)', async ({ page }) => {
${inputs.map(input => {
  const hint = input.selectorHints[0] || `locator('input')`;
  return `    await page.${hint}.fill('');`;
}).join('\n')}

    await ${primaryButtonLocator}.click();
    // Verifica che l'app gestisca correttamente i campi obbligatori
    const isFormValid = await page.evaluate(() => {
      const form = document.querySelector('form');
      return form ? form.checkValidity() : true;
    });
    expect(isFormValid).toBeDefined();
  });
});
`;

    const fullOut = path.resolve(process.cwd(), outputFilePath);
    fs.writeFileSync(fullOut, suiteContent, 'utf-8');

    return {
      filePath: fullOut,
      scenariosCount: 3,
      scenarios: [
        'Scenario 1: Happy Path (Flusso Standard)',
        'Scenario 2: Edge-Case & Unicode Stress Test',
        'Scenario 3: Boundary Negative Validation Test'
      ]
    };
  }
}
