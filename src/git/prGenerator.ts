import { execSync } from 'child_process';
import chalk from 'chalk';

export interface PrDetails {
  branchName: string;
  title: string;
  body: string;
  modifiedFiles: string[];
}

export class PrGenerator {
  /**
   * Crea un branch git, committa le modifiche e apre (o prepara) la Pull Request.
   */
  public static async createHealBranchAndCommit(details: PrDetails): Promise<{ branchCreated: boolean; prUrl?: string }> {
    try {
      // 1. Verifica se siamo in un git repo
      execSync('git rev-parse --is-inside-work-tree', { stdio: 'pipe' });
    } catch {
      console.log(chalk.yellow('[Git] Non in un git repository o git non disponibile. Salto creazione branch/PR.'));
      return { branchCreated: false };
    }

    try {
      // 2. Crea e sposta su un branch dedicato
      execSync(`git checkout -b ${details.branchName}`, { stdio: 'pipe' });

      // 3. Stage dei file modificati
      for (const file of details.modifiedFiles) {
        execSync(`git add "${file}"`, { stdio: 'pipe' });
      }

      // 4. Commit
      const commitMsg = `${details.title}\n\n${details.body}`.replace(/"/g, '\\"');
      execSync(`git commit -m "${commitMsg}"`, { stdio: 'pipe' });
      console.log(chalk.green(`[Git] Commit creato su branch '${details.branchName}'!`));

      // 5. Tentativo di creare la PR tramite GitHub CLI 'gh'
      try {
        const ghCheck = execSync('which gh', { stdio: 'pipe' }).toString().trim();
        if (ghCheck) {
          console.log(chalk.cyan(`[Git] Creazione Pull Request con GitHub CLI...`));
          const prOutput = execSync(`gh pr create --title "${details.title}" --body "${details.body.replace(/"/g, '\\"')}" --head "${details.branchName}"`, { stdio: 'pipe' });
          const url = prOutput.toString().trim();
          return { branchCreated: true, prUrl: url };
        }
      } catch (ghErr) {
        // gh non autenticato o non configurato: normale in locale, restituiamo le istruzioni
      }

      return { branchCreated: true };
    } catch (err: any) {
      console.warn(chalk.yellow(`[Git] Impossibile completare la branch/PR automatica: ${err.message}`));
      return { branchCreated: false };
    }
  }
}
