import * as fs from 'fs';
import * as path from 'path';

export interface AutoHealConfig {
  confidenceThreshold: number;
  framework: 'playwright' | 'cypress' | 'testing-library';
  autoCommit: boolean;
  createPr: boolean;
  openReport: boolean;
  cacheEnabled: boolean;
  ignoredLocators: string[];
}

export const DEFAULT_CONFIG: AutoHealConfig = {
  confidenceThreshold: 0.85,
  framework: 'playwright',
  autoCommit: true,
  createPr: true,
  openReport: false,
  cacheEnabled: true,
  ignoredLocators: []
};

export class ConfigManager {
  private static configPath = path.resolve(process.cwd(), 'autoheal.config.json');

  public static loadConfig(): AutoHealConfig {
    if (fs.existsSync(this.configPath)) {
      try {
        const raw = fs.readFileSync(this.configPath, 'utf-8');
        return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
      } catch {
        return DEFAULT_CONFIG;
      }
    }
    return DEFAULT_CONFIG;
  }

  public static saveDefaultConfig(): void {
    if (!fs.existsSync(this.configPath)) {
      fs.writeFileSync(this.configPath, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8');
    }
  }
}
