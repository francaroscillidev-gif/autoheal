import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface DoctorCheck {
  name: string;
  passed: boolean;
  message: string;
  remedy?: string;
}

export class HealthDoctor {
  public static diagnose(): DoctorCheck[] {
    const checks: DoctorCheck[] = [];

    // 1. Verifica Node.js
    const nodeVer = process.version;
    const major = parseInt(nodeVer.slice(1).split('.')[0], 10);
    checks.push({
      name: 'Node.js Runtime',
      passed: major >= 18,
      message: `Node.js versione ${nodeVer} installata.`,
      remedy: major < 18 ? 'Aggiorna Node.js alla versione 18+ o superiore.' : undefined
    });

    // 2. Verifica Playwright Browsers
    try {
      execSync('npx playwright --version', { stdio: 'pipe' });
      checks.push({
        name: 'Playwright Framework',
        passed: true,
        message: 'Playwright CLI rilevato e pronto all\'uso.'
      });
    } catch {
      checks.push({
        name: 'Playwright Framework',
        passed: false,
        message: 'Playwright CLI non disponibile.',
        remedy: 'Esegui "npm install @playwright/test playwright" nel progetto.'
      });
    }

    // 3. Verifica Git Repository
    try {
      execSync('git rev-parse --is-inside-work-tree', { stdio: 'pipe' });
      checks.push({
        name: 'Git Worktree & VCS',
        passed: true,
        message: 'Repository Git locale attivo per PR e commit automatici.'
      });
    } catch {
      checks.push({
        name: 'Git Worktree & VCS',
        passed: false,
        message: 'Cartella non associata a un repository Git.',
        remedy: 'Esegui "git init" per abilitare il versionamento automatico.'
      });
    }

    // 4. Verifica Configurazione AutoHeal
    const configPath = path.resolve(process.cwd(), 'autoheal.config.json');
    const hasConfig = fs.existsSync(configPath);
    checks.push({
      name: 'Configuration File',
      passed: hasConfig,
      message: hasConfig ? 'File autoheal.config.json presente.' : 'Nessun file autoheal.config.json trovato (verranno usati i default).',
      remedy: !hasConfig ? 'Esegui "npx autoheal init" per personalizzare i parametri.' : undefined
    });

    // 5. Verifica Memory Cache
    const cachePath = path.resolve(process.cwd(), '.autoheal-cache.json');
    const hasCache = fs.existsSync(cachePath);
    checks.push({
      name: 'Persistent Selector Memory',
      passed: true,
      message: hasCache ? 'Cache attiva con selettori memorizzati.' : 'Cache vuota (verrà creata al primo self-healing).'
    });

    return checks;
  }
}
