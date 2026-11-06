import { Project, SyntaxKind, Node } from 'ts-morph';
import * as fs from 'fs';

export interface PatchRequest {
  filePath: string;
  lineNumber?: number;
  oldLocator: string;
  newLocatorCode: string; // e.g. "getByTestId('checkout-submit')" or "getByRole('button', { name: 'Paga Ora' })"
}

export interface PatchResult {
  success: boolean;
  modifiedLines: number[];
  diffPreview: string;
}

export class AstPatcher {
  private project: Project;

  constructor() {
    this.project = new Project({
      useInMemoryFileSystem: false
    });
  }

  /**
   * Sostituisce chirurgicamente un locator Playwright rotto con quello curato dall'agente.
   */
  public patchFile(request: PatchRequest): PatchResult {
    const { filePath, lineNumber, oldLocator, newLocatorCode } = request;

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const sourceFile = this.project.addSourceFileAtPath(filePath);
    let replaced = false;
    const modifiedLines: number[] = [];

    // Cerchiamo le call expression specifiche `locator(...)`
    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

    for (const call of callExpressions) {
      const expr = call.getExpression();
      const exprText = expr.getText(); // e.g. "page.locator"
      const callText = call.getText(); // e.g. "page.locator('.old-btn-submit')"
      const line = call.getStartLineNumber();

      const matchesLine = lineNumber ? Math.abs(line - lineNumber) <= 2 : true;

      if (matchesLine && exprText.endsWith('locator') && callText.includes(oldLocator)) {
        // Estrai il prefisso dell'oggetto chiamante (es. "page" da "page.locator")
        let callerPrefix = 'page';
        if (Node.isPropertyAccessExpression(expr)) {
          callerPrefix = expr.getExpression().getText();
        }

        // Se newLocatorCode inizia già con getBy*, usiamo callerPrefix.newLocatorCode
        const formattedNew = newLocatorCode.startsWith('getBy')
          ? `${callerPrefix}.${newLocatorCode}`
          : newLocatorCode.startsWith('locator')
          ? `${callerPrefix}.${newLocatorCode}`
          : `${callerPrefix}.locator('${newLocatorCode}')`;

        call.replaceWithText(formattedNew);
        replaced = true;
        modifiedLines.push(line);
        break;
      }
    }

    // Fallback: regex mirata su `page.locator('...')`
    if (!replaced && lineNumber) {
      const lines = sourceFile.getFullText().split('\n');
      const targetIdx = lineNumber - 1;
      if (lines[targetIdx]) {
        const regex = new RegExp(`(\\b\\w+\\.)?locator\\(['"]${escapeRegExp(oldLocator)}['"]\\)`);
        if (regex.test(lines[targetIdx])) {
          lines[targetIdx] = lines[targetIdx].replace(regex, (_match, prefix) => {
            const p = prefix || 'page.';
            return newLocatorCode.startsWith('getBy') ? `${p}${newLocatorCode}` : `${p}locator('${newLocatorCode}')`;
          });
          sourceFile.replaceWithText(lines.join('\n'));
          replaced = true;
          modifiedLines.push(lineNumber);
        }
      }
    }

    if (replaced) {
      sourceFile.saveSync();
      return {
        success: true,
        modifiedLines,
        diffPreview: `Line ${modifiedLines.join(', ')}: locator('${oldLocator}') -> ${newLocatorCode}`
      };
    }

    return {
      success: false,
      modifiedLines: [],
      diffPreview: 'No matching locator found to patch.'
    };
  }
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
