import { execSync } from 'child_process';
import chalk from 'chalk';
import { HealedTestRecord } from '../report/htmlReporter.js';

export class BatchPrGenerator {
  public static async createBatchPr(records: HealedTestRecord[]): Promise<{ branchCreated: boolean; prUrl?: string }> {
    const healedRecords = records.filter(r => r.status === 'healed');
    if (healedRecords.length === 0) return { branchCreated: false };

    try {
      execSync('git rev-parse --is-inside-work-tree', { stdio: 'pipe' });
    } catch {
      return { branchCreated: false };
    }

    const branchName = `autoheal/batch-fix-${Date.now()}`;
    const uniqueFiles = Array.from(new Set(healedRecords.map(r => r.testFile)));

    const title = `chore(tests): auto-heal ${healedRecords.length} broken locator(s) in regression suite`;
    
    const rows = healedRecords.map(r => `| \`${r.testFile}:${r.line}\` | \`${r.oldLocator}\` | \`${r.newLocator}\` | **${Math.round(r.confidence * 100)}%** |`).join('\n');

    const body = `## 🛡️ Autonomous Test Healing Summary

AutoHeal Agent ha identificato e riparato con successo **${healedRecords.length}** test falliti nella suite.

### 📋 Mappa delle Riparazioni:

| File & Riga | Vecchio Locator (Rotto) | Nuovo Locator (Resiliente) | Confidenza AI |
| :--- | :--- | :--- | :--- |
${rows}

### 💡 Dettagli:
${healedRecords.map(r => `- **\`${r.testFile}\`**: ${r.reasoning}`).join('\n')}

---
*Creato automaticamente da [AutoHeal Agent](https://github.com/francaroscillidev-gif/autoheal) • Autore: Franca Roscilli*`;

    try {
      execSync(`git checkout -b ${branchName}`, { stdio: 'pipe' });
      for (const file of uniqueFiles) {
        execSync(`git add "${file}"`, { stdio: 'pipe' });
      }
      const safeMsg = `${title}\n\n${body}`.replace(/"/g, '\\"');
      execSync(`git commit -m "${safeMsg}"`, { stdio: 'pipe' });
      console.log(chalk.green(`[Git] Batch commit creato con successo su branch '${branchName}'!`));

      // Tentativo creazione PR con gh
      try {
        const ghCheck = execSync('which gh', { stdio: 'pipe' }).toString().trim();
        if (ghCheck) {
          const prOutput = execSync(`gh pr create --title "${title}" --body "${body.replace(/"/g, '\\"')}" --head "${branchName}"`, { stdio: 'pipe' });
          return { branchCreated: true, prUrl: prOutput.toString().trim() };
        }
      } catch {}

      return { branchCreated: true };
    } catch (err: any) {
      console.warn(chalk.yellow(`[Git] Batch PR warning: ${err.message}`));
      return { branchCreated: false };
    }
  }
}
