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
import { DashboardServer } from './server/dashboardServer.js';
import { McpServer } from './mcp/mcpServer.js';
import { ConfigManager } from './config/configManager.js';
import { HealthDoctor } from './doctor/healthDoctor.js';
import { TestOptimizer } from './optimizer/testOptimizer.js';
import { BadgeGenerator } from './badges/badgeGenerator.js';

const program = new Command();

program
  .name('autoheal')
  .description('Enterprise Autonomous Testing & Regression Agent (Playwright, Cypress, Testing Library)')
  .version('5.0.0');

program
  .command('run')
  .description('Run test suite with autonomous self-healing, caching, safeguard and PR generation')
  .option('-f, --file <file>', 'Specific test file to run')
  .option('--no-pr', 'Do not create git branch and PR after healing')
  .option('--report <path>', 'Custom path for the HTML report', 'autoheal-report.html')
  .action(async (options) => {
    console.log(chalk.bold.blue('🛡️  [AutoHeal Agent v5.0 Ultimate] Avvio suite di test...'));
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
  .command('doctor')
  .description('Esegue un checkup completo dell\'ambiente (Playwright, Git, Node, Cache)')
  .action(() => {
    console.log(chalk.bold.blue('🩺 [AutoHeal Doctor] Diagnosi dell\'ambiente in corso...\n'));
    const checks = HealthDoctor.diagnose();
    let allOk = true;

    for (const c of checks) {
      const symbol = c.passed ? chalk.green('✓') : chalk.red('✗');
      console.log(`${symbol} ${chalk.bold(c.name)}: ${c.message}`);
      if (!c.passed && c.remedy) {
        allOk = false;
        console.log(chalk.yellow(`   💡 Rimedio: ${c.remedy}`));
      }
    }

    if (allOk) {
      console.log(chalk.bold.green('\n🎉 Tutti i controlli sono superati! Il sistema è configurato in modo ottimale.'));
    } else {
      console.log(chalk.bold.yellow('\n⚠️ Alcuni componenti richiedono attenzione.'));
    }
  });

program
  .command('optimize [dir]')
  .description('Analizza la suite per individuare test ridondanti e stimare il tempo di CI risparmiato')
  .action((dir) => {
    console.log(chalk.bold.blue('⚡ [AutoHeal Optimizer] Scansione dei test per deduplicazione...\n'));
    const insights = TestOptimizer.analyzeDirectory(dir ? path.resolve(process.cwd(), dir) : process.cwd());
    let totalSaved = 0;

    for (const ins of insights) {
      console.log(chalk.cyan(`📄 File: ${ins.file}`));
      console.log(`   Ridondanze: ${ins.duplicateStepsCount}`);
      console.log(`   Tempo stimabile risparmiato: ~${ins.estimatedTimeSavedMs}ms`);
      for (const s of ins.suggestions) {
        console.log(chalk.gray(`   - ${s}`));
      }
      totalSaved += ins.estimatedTimeSavedMs;
      console.log('');
    }

    console.log(chalk.bold.green(`🚀 Potenziale risparmio totale in CI: ~${totalSaved}ms`));
  });

program
  .command('badges')
  .description('Rigenera i badge SVG ufficiali per la documentazione e il README di GitHub')
  .action(() => {
    BadgeGenerator.generateBadges();
    console.log(chalk.green('✅ Badge SVG generati con successo in assets/badges/!'));
  });

program
  .command('serve')
  .description('Avvia la Web Dashboard interattiva in tempo reale')
  .option('-p, --port <port>', 'Porta server HTTP', '4321')
  .action((options) => {
    const server = new DashboardServer(parseInt(options.port, 10));
    server.start();
  });

program
  .command('mcp')
  .description('Avvia il Model Context Protocol (MCP) Server su stdio per client AI')
  .action(() => {
    const mcp = new McpServer();
    mcp.startStdio();
  });

program
  .command('init')
  .description('Inizializza il file di configurazione autoheal.config.json')
  .action(() => {
    ConfigManager.saveDefaultConfig();
    console.log(chalk.green('✅ File autoheal.config.json creato con successo!'));
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
