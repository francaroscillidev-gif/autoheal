import * as fs from 'fs';
import * as path from 'path';
import { extractInteractiveElements } from '../dom/reducer.js';

export interface GenerationOptions {
  source: string; // URL o percorso file HTML
  outputFile?: string;
  testTitle?: string;
}

export class TestGenerator {
  /**
   * Genera uno script di test Playwright completo analizzando il DOM di un file o URL
   */
  public static generateSuite(options: GenerationOptions): string {
    const { source, outputFile, testTitle } = options;

    let html = '';
    let isUrl = false;

    if (source.startsWith('http://') || source.startsWith('https://')) {
      isUrl = true;
    } else if (fs.existsSync(source)) {
      html = fs.readFileSync(source, 'utf-8');
    } else {
      throw new Error(`File sorgente non trovato: ${source}`);
    }

    const title = testTitle || 'User Navigation & Form Interaction Smoke Test';
    const elements = extractInteractiveElements(html);

    // Costruisci le istruzioni del test
    const steps: string[] = [];

    // Navigazione
    if (isUrl) {
      steps.push(`  await page.goto('${source}');`);
    } else {
      steps.push(`  const htmlPath = path.resolve(__dirname, '${path.basename(source)}');`);
      steps.push(`  await page.goto(\`file://\${htmlPath}\`);`);
    }

    // Interazioni per gli elementi rilevati
    for (const el of elements) {
      if (el.tag === 'input') {
        if (el.type === 'text' || el.type === 'email' || !el.type) {
          const locator = el.selectorHints[0] || `locator('input')`;
          steps.push(`  // Compila campo input: ${el.placeholder || el.name || 'test'}`);
          steps.push(`  await page.${locator}.fill('Test value');`);
        }
      } else if (el.tag === 'button' || el.role === 'button') {
        const locator = el.selectorHints[0] || `locator('button')`;
        steps.push(`  // Clicca bottone azione`);
        steps.push(`  await page.${locator}.click();`);
      }
    }

    const fileContent = `import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('${title}', async ({ page }) => {
${steps.join('\n\n')}

  // Verifica asserzione di base
  await expect(page).toHaveTitle(/./);
});
`;

    if (outputFile) {
      const fullOutputPath = path.resolve(process.cwd(), outputFile);
      fs.writeFileSync(fullOutputPath, fileContent, 'utf-8');
      return fullOutputPath;
    }

    return fileContent;
  }
}
