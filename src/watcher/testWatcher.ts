import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { spawn } from 'child_process';

export class TestWatcher {
  private targetDir: string;
  private isRunning: boolean = false;
  private debounceTimer: NodeJS.Timeout | null = null;

  constructor(targetDir: string = process.cwd()) {
    this.targetDir = targetDir;
  }

  public start(): void {
    console.log(chalk.bold.cyan(`👀 [AutoHeal Watcher] In ascolto su modifiche in: ${this.targetDir}`));
    console.log(chalk.gray(`   Premi Ctrl+C per terminare.\n`));

    fs.watch(this.targetDir, { recursive: true }, (eventType, filename) => {
      if (!filename) return;

      // Ignora file di cache, node_modules, git, report
      if (
        filename.includes('node_modules') ||
        filename.includes('.git') ||
        filename.includes('.autoheal-cache') ||
        filename.includes('autoheal-report') ||
        filename.endsWith('.log')
      ) {
        return;
      }

      // Filtra estensioni web pertinenti
      if (/\.(ts|tsx|js|jsx|html|vue|svelte)$/.test(filename)) {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          this.triggerAutoHealRun(filename);
        }, 500);
      }
    });
  }

  private triggerAutoHealRun(modifiedFile: string): void {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log(chalk.yellow(`\n⚡ Modifica rilevata in: ${modifiedFile}. Avvio auto-healing test...`));

    const child = spawn('npx', ['autoheal', 'run', '--no-pr'], {
      cwd: this.targetDir,
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      this.isRunning = false;
      if (code === 0) {
        console.log(chalk.green(`✨ [AutoHeal Watcher] Tutti i test sono allineati e verdi.`));
      } else {
        console.log(chalk.blue(`🔄 [AutoHeal Watcher] Ciclo completato.`));
      }
    });
  }
}
