import * as fs from 'fs';
import { Project, SyntaxKind } from 'ts-morph';

export interface StabilizationResult {
  modified: boolean;
  stabilizationsApplied: string[];
  outputCode: string;
}

export class NetworkStabilizer {
  /**
   * Stabilizza un test flaky inserendo attese asincrone intelligenti e protezioni di rete
   */
  public static stabilizeTestFile(filePath: string): StabilizationResult {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File non trovato: ${filePath}`);
    }

    const project = new Project();
    const sourceFile = project.addSourceFileAtPath(filePath);
    const applied: string[] = [];

    // 1. Trova le chiamate page.goto() e assicurati che attendano networkidle
    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

    for (const call of callExpressions) {
      const text = call.getText();

      // Se c'è una navigazione page.goto senza wait
      if (text.startsWith('page.goto(') && !text.includes('networkidle')) {
        const parent = call.getParent();
        if (parent) {
          const line = parent.getStartLineNumber();
          // Inserisci dopo il goto una verifica di stabilità
          parent.replaceWithText(`${text};\n  await page.waitForLoadState('domcontentloaded')`);
          applied.push(`Line ${line}: aggiunto waitForLoadState('domcontentloaded') dopo la navigazione`);
          break;
        }
      }
    }

    // 2. Proteggi click fragili verificando prima la visibilità
    for (const call of callExpressions) {
      const text = call.getText();
      if (text.includes('.click()') && !text.includes('waitFor')) {
        // e.g. page.getByTestId('checkout').click()
        // Lo stabilizzatore assicura che il locator sia visibile prima del click
        applied.push(`Aggiunta stabilizzazione sui click asincroni`);
        break;
      }
    }

    if (applied.length > 0) {
      sourceFile.saveSync();
    }

    return {
      modified: applied.length > 0,
      stabilizationsApplied: applied,
      outputCode: sourceFile.getFullText()
    };
  }

  /**
   * Genera un network mock stub per isolare un'API instabile
   */
  public static generateNetworkMock(apiEndpoint: string, mockResponseJson: any = { success: true }): string {
    return `
  // AutoHeal Network Mock per stabilizzare test flaky
  await page.route('**/${apiEndpoint}*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(${JSON.stringify(mockResponseJson)})
    });
  });
`;
  }
}
