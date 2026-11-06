import * as fs from 'fs';
import * as path from 'path';
import { Project, SyntaxKind } from 'ts-morph';

export interface OptimizationInsight {
  file: string;
  duplicateStepsCount: number;
  estimatedTimeSavedMs: number;
  suggestions: string[];
}

export class TestOptimizer {
  public static analyzeDirectory(dirPath: string = process.cwd()): OptimizationInsight[] {
    const project = new Project();
    const insights: OptimizationInsight[] = [];

    const files = this.findTestFiles(dirPath);

    for (const file of files) {
      try {
        const sourceFile = project.addSourceFileAtPath(file);
        const calls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
        const callTexts = calls.map(c => c.getText());

        // Identifica chiamate duplicate consecutive
        const duplicates: string[] = [];
        const seen = new Set<string>();

        for (const text of callTexts) {
          if (seen.has(text) && (text.includes('fill(') || text.includes('goto('))) {
            duplicates.push(text);
          }
          seen.add(text);
        }

        const count = duplicates.length;
        const timeSaved = count * 650; // stima di 650ms risparmiati per ogni step ridondante

        insights.push({
          file: path.basename(file),
          duplicateStepsCount: count,
          estimatedTimeSavedMs: timeSaved,
          suggestions: count > 0 ? [
            `Rilevati ${count} passaggi di setup/fill ridondanti.`,
            'Consigliato raggruppamento in un helper beforeEach() o fixtures Playwright.'
          ] : ['Test snello e privo di ridondanze critiche.']
        });
      } catch {}
    }

    return insights;
  }

  private static findTestFiles(dir: string): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;

    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory() && !item.name.includes('node_modules') && !item.name.startsWith('.')) {
        results.push(...this.findTestFiles(fullPath));
      } else if (item.isFile() && (item.name.endsWith('.spec.ts') || item.name.endsWith('.test.ts'))) {
        results.push(fullPath);
      }
    }
    return results;
  }
}
