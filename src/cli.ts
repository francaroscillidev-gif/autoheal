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
import { HtmlReporter, HealedTestRecord } from './report/htmlReporter.js';
import { TestGenerator } from './generator/testGenerator.js';
import { VisionHealer } from './ai/visionHealer.js';
import { NetworkStabilizer } from './stabilizer/networkStabilizer.js';
import { BotCommenter } from './git/botCommenter.js';

const program = new Command();

program
  .name('autoheal')
  .description('Autonomous Testing & Regression Agent (Playwright, Cypress, Testing Library)')
  .version('2.0.0');

program
  .command('run')
  .description('Run test suite with autonomous self-healing, HTML report, and PR auto-creation')
  .option('-f, --file <file>', 'Specific test file to run')
  .option('--no-pr', 'Do not create git branch and PR after healing')
  .option('--report <path>', 'Custom path for the HTML report', 'autoheal-report.html')
  .action(async (options) => {
    console.log(chalk.bold.blue('🛡️  [AutoHeal Agent v2.0] Avvio suite di test...'));
    const runner = new TestRunner();
    const result = await runner.runPlaywright(options.file);

    if (result.passed) {
      console.log(chalk.bold.green('✅ Tutti i test sono passati! Nessuna riparazione necessaria.'));
      process.exit(0);
    }

    console.log(chalk.bold.red(`❌ Rilevati ${result.failures.length || 1} test falliti. Avvio analisi di Self-Healing...`));

    const records: HealedTestRecord[] = [];

    for (const failure of result.failures) {
      console.log(chalk.cyan(`\n🔍 Analisi file: ${failure.filePath}:${failure.lineNumber}`));
      if (failure.brokenLocator) {
        console.log(chalk.yellow(`   Selettore rotto rilevato: "${failure.brokenLocator}"`));
      }

      const testCode = fs.readFileSync(failure.filePath, 'utf-8');

      let currentDom = '';
      const demoHtmlPath = path.resolve(process.cwd(), 'demo/app.html');
      if (fs.existsSync(demoHtmlPath)) {
        currentDom = fs.readFileSync(demoHtmlPath, 'utf-8');
      }

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

          console.log(chalk.blue(`🔄 Ri-esecuzione del test di verifica...`));
          const verifyResult = await runner.runPlaywright(failure.filePath);

          const isHealed = verifyResult.passed;
          records.push({
            testFile: path.basename(failure.filePath),
            testTitle: failure.testTitle,
            line: failure.lineNumber,
            oldLocator: proposal.oldLocator,
            newLocator: proposal.suggestedLocatorCode,
            confidence: proposal.confidence,
            reasoning: proposal.reasoning,
            timestamp: new Date().toLocaleTimeString(),
            status: isHealed ? 'healed' : 'failed'
          });

          if (isHealed) {
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
            console.log(chalk.red(`⚠️ La patch non ha risolto completamente il fallimento.`));
          }
        }
      } catch (err: any) {
        console.log(chalk.red(`❌ Errore durante l'healing: ${err.message}`));
      }
    }

    if (records.length > 0) {
      const reportPath = HtmlReporter.generateReport(records, options.report);
      console.log(chalk.bold.magenta(`\n📊 Report HTML generato: ${reportPath}`));
    }
  });

program
  .command('generate <source>')
  .description('Genera automaticamente una suite di test da un file HTML o URL')
  .option('-o, --output <file>', 'Output test file path', 'generated.spec.ts')
  .option('-t, --title <title>', 'Test title')
  .action((source, options) => {
    try {
      console.log(chalk.bold.blue(`🧪 [AutoHeal Generator] Analisi di: ${source}...`));
      const outPath = TestGenerator.generateSuite({
        source,
        outputFile: options.output,
        testTitle: options.title
      });
      console.log(chalk.bold.green(`✅ Test suite generata con successo in: ${outPath}`));
    } catch (err: any) {
      console.log(chalk.red(`❌ Errore nella generazione del test: ${err.message}`));
    }
  });

program
  .command('stabilize <file>')
  .description('Rileva e stabilizza test flaky eliminando race condition e problemi di rete')
  .action((file) => {
    try {
      console.log(chalk.bold.blue(`🛡️  [AutoHeal Stabilizer] Stabilizzazione di ${file}...`));
      const res = NetworkStabilizer.stabilizeTestFile(file);
      if (res.modified) {
        console.log(chalk.green(`✅ Applicate le seguenti stabilizzazioni:\n- ${res.stabilizationsApplied.join('\n- ')}`));
      } else {
        console.log(chalk.yellow(`ℹ️ Nessuna flakiness rilevata nel file.`));
      }
    } catch (err: any) {
      console.log(chalk.red(`❌ Errore: ${err.message}`));
    }
  });

program
  .command('vision <screenshot>')
  .description('Analisi visiva di uno screenshot di errore con Multimodal Vision AI')
  .option('-d, --desc <description>', 'Descrizione dell\'elemento da trovare', 'Pulsante di checkout o azione primaria')
  .action(async (screenshot, options) => {
    try {
      console.log(chalk.bold.blue(`👁️  [AutoHeal Vision AI] Analisi screenshot: ${screenshot}...`));
      const vision = new VisionHealer();
      const res = await vision.analyzeScreenshot({
        screenshotPath: screenshot,
        elementDescription: options.desc
      });
      console.log(chalk.green(`✅ Risultato Vision AI (Confidenza: ${(res.confidence * 100).toFixed(0)}%):`));
      console.log(chalk.white(`   ${res.reasoning}`));
      console.log(chalk.cyan(`   Azione consigliata: ${res.suggestedAction}`));
    } catch (err: any) {
      console.log(chalk.red(`❌ Errore: ${err.message}`));
    }
  });

program.parse(process.argv);
