#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { TestRunner } from './runner/testRunner.js';
import { extractInteractiveElements } from './dom/reducer.js';
import { HealingEngine } from './ai/healer.js';
import { AstPatcher } from './patcher/astPatcher.js';
import { BatchPrGenerator } from './git/batchPrGenerator.js';
import { HtmlReporter, HealedTestRecord } from './report/htmlReporter.js';
import { TestGenerator } from './generator/testGenerator.js';
import { VisionHealer } from './ai/visionHealer.js';
import { NetworkStabilizer } from './stabilizer/networkStabilizer.js';
import { HealingCache } from './cache/healingCache.js';
import { SafeGuard } from './guard/safeGuard.js';
import { TestWatcher } from './watcher/testWatcher.js';

const program = new Command();

program
  .name('autoheal')
  .description('Autonomous Testing & Regression Agent (Playwright, Cypress, Testing Library)')
  .version('3.0.0');

program
  .command('run')
  .description('Run test suite with autonomous self-healing, caching, safeguard and PR generation')
  .option('-f, --file <file>', 'Specific test file to run')
  .option('--no-pr', 'Do not create git branch and PR after healing')
  .option('--report <path>', 'Custom path for the HTML report', 'autoheal-report.html')
  .action(async (options) => {
    console.log(chalk.bold.blue('🛡️  [AutoHeal Agent v3.0] Avvio suite di test...'));
    const runner = new TestRunner();
    const cache = new HealingCache();
    const result = await runner.runPlaywright(options.file);

    if (result.passed) {
      console.log(chalk.bold.green('✅ Tutti i test sono passati! Nessuna riparazione necessaria.'));
      process.exit(0);
    }

    console.log(chalk.bold.red(`❌ Rilevati ${result.failures.length || 1} test falliti. Avvio analisi di Self-Healing...`));

    const records: HealedTestRecord[] = [];

    for (const failure of result.failures) {
      console.log(chalk.cyan(`\n🔍 Analisi file: ${failure.filePath}:${failure.lineNumber}`));

      // 1. SafeGuard: Verifica se è un bug applicativo reale
      const diagnostic = SafeGuard.diagnose(failure.errorMessage);
      if (diagnostic.isRealApplicationBug) {
        console.log(chalk.bold.red(`🚨 [SafeGuard Alert] Fallimento identificato come VERO BUG applicativo (${diagnostic.bugCategory})!`));
        console.log(chalk.yellow(`   Motivazione: ${diagnostic.reasoning}`));
        console.log(chalk.white(`   Raccomandazione: ${diagnostic.recommendation}`));
        console.log(chalk.gray(`   Skipping self-healing per preservare l'integrità del test.`));
        continue;
      }

      const brokenLocator = failure.brokenLocator || 'button';
      console.log(chalk.yellow(`   Selettore rotto rilevato: "${brokenLocator}"`));

      let suggestedLocator = '';
      let confidence = 0.95;
      let reasoning = '';

      // 2. Controllo Cache Istantanea (0ms, $0 token)
      const cached = cache.get(brokenLocator);
      if (cached) {
        console.log(chalk.bold.green(`⚡ [Cache Hit] Soluzione istantanea recuperata da memoria locale (Hits: ${cached.hitCount}):`));
        console.log(chalk.cyan(`   Nuovo selettore: ${chalk.bold(cached.suggestedLocator)}`));
        suggestedLocator = cached.suggestedLocator;
        confidence = cached.confidence;
        reasoning = `Recuperato da memoria cache locale (${cached.domainOrContext || 'precedente auto-healing'}).`;
      } else {
        // 3. Analisi DOM e AI Healer
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
            brokenLocator,
            rawHtmlOrDom: currentDom,
            elements: interactiveElements
          });

          suggestedLocator = proposal.suggestedLocatorCode;
          confidence = proposal.confidence;
          reasoning = proposal.reasoning;

          console.log(chalk.green(`✨ Soluzione identificata (Confidence: ${(confidence * 100).toFixed(0)}%):`));
          console.log(chalk.white(`   Spiegazione: ${reasoning}`));
          console.log(chalk.cyan(`   Nuovo selettore: ${chalk.bold(suggestedLocator)}`));

          // Memorizza nella cache per i prossimi run
          cache.set(brokenLocator, suggestedLocator, confidence, path.basename(failure.filePath));
        } catch (err: any) {
          console.log(chalk.red(`❌ Errore durante l'healing: ${err.message}`));
          continue;
        }
      }

      // 4. Applicazione patch AST sul file di test
      console.log(chalk.blue(`🔧 Applicazione patch AST sul file di test...`));
      const patcher = new AstPatcher();
      const patchResult = patcher.patchFile({
        filePath: failure.filePath,
        lineNumber: failure.lineNumber,
        oldLocator: brokenLocator,
        newLocatorCode: suggestedLocator
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
          oldLocator: brokenLocator,
          newLocator: suggestedLocator,
          confidence,
          reasoning,
          timestamp: new Date().toLocaleTimeString(),
          status: isHealed ? 'healed' : 'failed'
        });

        if (isHealed) {
          console.log(chalk.bold.green(`🎉 Il test è VERDE dopo la riparazione automatica!`));
        } else {
          console.log(chalk.red(`⚠️ La patch non ha risolto completamente il fallimento.`));
        }
      }
    }

    // 5. Creazione Batch PR raggruppata
    if (records.some(r => r.status === 'healed') && options.pr !== false) {
      console.log(chalk.blue(`\n📦 Creazione Batch Pull Request raggruppata per tutti i test riparati...`));
      await BatchPrGenerator.createBatchPr(records);
    }

    // 6. Generazione Report HTML
    if (records.length > 0) {
      const reportPath = HtmlReporter.generateReport(records, options.report);
      console.log(chalk.bold.magenta(`\n📊 Report HTML generato: ${reportPath}`));
    }
  });

program
  .command('watch [dir]')
  .description('Avvia il watcher in tempo reale: auto-ripara i test mentre scrivi codice')
  .action((dir) => {
    const watcher = new TestWatcher(dir ? path.resolve(process.cwd(), dir) : process.cwd());
    watcher.start();
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
