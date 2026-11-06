import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface TestFailure {
  filePath: string;
  lineNumber: number;
  testTitle: string;
  errorMessage: string;
  brokenLocator?: string;
}

export interface RunResult {
  passed: boolean;
  rawOutput: string;
  failures: TestFailure[];
}

function stripAnsi(str: string): string {
  return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}

export class TestRunner {
  /**
   * Esegue un comando di test Playwright con JSON reporter
   */
  public async runPlaywright(testFile?: string): Promise<RunResult> {
    const args = ['playwright', 'test'];
    if (testFile) {
      args.push(testFile);
    }
    args.push('--reporter=json');

    return new Promise((resolve) => {
      const child = spawn('npx', args, {
        cwd: process.cwd(),
        env: { ...process.env, CI: '1' },
        shell: true
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (d) => {
        stdout += d.toString();
      });

      child.stderr.on('data', (d) => {
        stderr += d.toString();
      });

      child.on('close', (code) => {
        const fullOutput = stdout + '\n' + stderr;
        let failures: TestFailure[] = [];

        try {
          const cleanStdout = stripAnsi(stdout).trim();
          const jsonStart = cleanStdout.indexOf('{');
          if (jsonStart !== -1) {
            const parsed = JSON.parse(cleanStdout.slice(jsonStart));
            failures = this.extractFailuresFromJson(parsed);
          }
        } catch (e) {
          failures = this.parseFailuresFromRaw(stripAnsi(fullOutput));
        }

        if (failures.length === 0 && code !== 0) {
          failures = this.parseFailuresFromRaw(stripAnsi(fullOutput));
        }

        resolve({
          passed: code === 0,
          rawOutput: fullOutput,
          failures
        });
      });
    });
  }

  private extractFailuresFromJson(json: any): TestFailure[] {
    const failures: TestFailure[] = [];
    const rootDir = json.config?.rootDir || process.cwd();
    const suites = json.suites || [];

    const traverse = (suite: any, currentFile?: string) => {
      const suiteFile = suite.file || currentFile;

      for (const spec of suite.specs || []) {
        const specFile = spec.file || suiteFile;

        for (const test of spec.tests || []) {
          for (const result of test.results || []) {
            if (result.status === 'failed' || result.status === 'timedOut') {
              const allErrors = result.errors || [];
              if (result.error && !allErrors.includes(result.error)) {
                allErrors.unshift(result.error);
              }

              // Trova l'errore che contiene i dettagli sulla riga/file
              const detailedErr = allErrors.find((e: any) => e.location) || allErrors[0] || {};
              const combinedMsg = stripAnsi(allErrors.map((e: any) => e.message || '').join('\n'));

              // Estrai il locator rotto
              const locMatch = combinedMsg.match(/(?:waiting for locator|locator)\(['"`](.*?)['"`]\)/i);
              const brokenLocator = locMatch ? locMatch[1] : undefined;

              let filePath = detailedErr.location?.file || specFile || '';
              if (filePath && !path.isAbsolute(filePath)) {
                filePath = path.resolve(rootDir, filePath);
              }

              const lineNumber = detailedErr.location?.line || spec.line || 1;

              failures.push({
                filePath,
                lineNumber,
                testTitle: spec.title || test.title,
                errorMessage: combinedMsg,
                brokenLocator
              });
            }
          }
        }
      }
      for (const childSuite of suite.suites || []) {
        traverse(childSuite, suiteFile);
      }
    };

    for (const s of suites) {
      traverse(s);
    }

    return failures;
  }

  private parseFailuresFromRaw(cleanOutput: string): TestFailure[] {
    const failures: TestFailure[] = [];
    const locatorRegex = /(?:waiting for locator|locator)\(['"`](.*?)['"`]\)/i;
    const fileLineRegex = /at\s+([^\s:]+):(\d+):(\d+)/;

    const fileMatch = fileLineRegex.exec(cleanOutput);
    const locMatch = locatorRegex.exec(cleanOutput);

    if (fileMatch) {
      failures.push({
        filePath: fileMatch[1],
        lineNumber: parseInt(fileMatch[2], 10),
        testTitle: 'Failed Playwright Test',
        errorMessage: cleanOutput.slice(0, 500),
        brokenLocator: locMatch ? locMatch[1] : undefined
      });
    }

    return failures;
  }
}
