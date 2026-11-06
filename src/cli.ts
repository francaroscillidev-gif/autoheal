#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { TestRunner } from './runner/testRunner.js';
import { extractInteractiveElements } from './dom/reducer.js';
import { HealingEngine } from './ai/healer.js';
import { AstPatcher } from './patcher/astPatcher.js';
import { PrGenerator } from './git/prGenerator.js';

const program = new Command();

program
  .name('autoheal')
  .description('Autonomous Testing & Regression Agent for Playwright (Self-Healing Tests)')
  .version('1.0.0');

program
  .command('run')
  .description('Run Playwright tests with autonomous self-healing')
  .option('-f, --file <file>', 'Specific test file to run')
  .option('--no-pr', 'Do not create git branch and PR after healing')
  .action(async (options) => {
    console.log(chalk.bold.blue('🛡️  [AutoHeal Agent] Avvio suite di test...'));
    const runner = new TestRunner();
    const result = await runner.runPlaywright(options.file);

    if (result.passed) {
      console.log(chalk.bold.green('✅ Tutti i test sono passati! Nessuna riparazione necessaria.'));
      process.exit(0);
    }

    console.log(chalk.bold.red(`❌ Rilevati ${result.failures.length || 1} test falliti. Avvio analisi di Self-Healing...`));

    // Analizziamo il fallimento
    for (const failure of result.failures) {
      console.log(chalk.cyan(`\n🔍 Analisi file: ${failure.filePath}:${failure.lineNumber}`));
      if (failure.brokenLocator) {
        console.log(chalk.yellow(`   Selettore rotto rilevato: "${failure.brokenLocator}"`));
      }

      // Leggi il file di test originale
      const testCode = fs.readFileSync(failure.filePath, 'utf-8');

      // Se il test ha salvato o generato uno snapshot DOM, leggiamolo; altrimenti cerchiamo un file HTML collegato
      let currentDom = '';
      const demoHtmlPath = path.resolve(process.cwd(), 'demo/app.html');
      if (fs.existsSync(demoHtmlPath)) {
        currentDom = fs.readFileSync(demoHtmlPath, 'utf-8');
      }

      // Estrai gli elementi interattivi dal DOM ridotto
      const interactiveElements = extractInteractiveElements(currentDom);
      console.log(chalk.gray(`   Elementi interattivi analizzati nel DOM: ${interactiveElements.length}`));

      const healer = new HealingEngine();
      try {
        console.log(chalk.blue(`🤖 Interrogazione Healer AI per comprendere l'intento...`));
        const proposal = await healer.heal({
          failedTestCode: testCode,
          failedLine: failure.lineNumber,
          errorMessage: failure.errorMessage,
          brokenLocator: failure.brokenLocator || 'button',
          rawHtmlOrDom: currentDom,
          elements: interactiveElements
        });

        console.log(chalk.green(`✨ Soluzione identificata (Confidence: ${(proposal.confidence * 100).toFixed(0)}%):`));
        console.log(chalk.white(`   Spiegazione: ${proposal.reasoning}`));
        console.log(chalk.cyan(`   Nuovo selettore: ${chalk.bold(proposal.suggestedLocatorCode)}`));

        // Applica la patch AST
        console.log(chalk.blue(`🔧 Applicazione patch AST sul file di test...`));
        const patcher = new AstPatcher();
        const patchResult = patcher.patchFile({
          filePath: failure.filePath,
          lineNumber: failure.lineNumber,
          oldLocator: proposal.oldLocator,
          newLocatorCode: proposal.suggestedLocatorCode
        });

        if (patchResult.success) {
          console.log(chalk.green(`✅ File modificato con successo: ${patchResult.diffPreview}`));

          // Ri-esegui il test per verifica
          console.log(chalk.blue(`🔄 Ri-esecuzione del test di verifica...`));
          const verifyResult = await runner.runPlaywright(failure.filePath);

          if (verifyResult.passed) {
            console.log(chalk.bold.green(`🎉 Il test è VERDE dopo la riparazione automatica!`));

            if (options.pr !== false) {
              const branchName = `autoheal/fix-${path.basename(failure.filePath, '.ts')}-${Date.now()}`;
              await PrGenerator.createHealBranchAndCommit({
                branchName,
                title: `fix(test): auto-heal locator for ${path.basename(failure.filePath)}`,
                body: `## 🤖 Autonomous Test Healing\n\n- **Broken Locator:** \`${proposal.oldLocator}\`\n- **New Locator:** \`${proposal.suggestedLocatorCode}\`\n- **Confidence:** ${(proposal.confidence * 100).toFixed(0)}%\n- **Reasoning:** ${proposal.reasoning}\n\nGenerated automatically by **AutoHeal Agent**.`,
                modifiedFiles: [failure.filePath]
              });
            }
          } else {
            console.log(chalk.red(`⚠️ La patch non ha risolto completamente il fallimento. Il test continua a fallire.`));
          }
        } else {
          console.log(chalk.red(`❌ Impossibile applicare la patch AST automaticamente.`));
        }
      } catch (err: any) {
        console.log(chalk.red(`❌ Errore durante l'healing: ${err.message}`));
      }
    }
  });

program.parse(process.argv);
