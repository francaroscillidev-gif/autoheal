import { spawn } from 'child_process';
import chalk from 'chalk';

export interface BenchmarkMetrics {
  totalDurationMs: number;
  testFile: string;
  runsCount: number;
  avgDurationMs: number;
  stabilityScore: number; // 0-100%
  status: 'highly_stable' | 'moderate' | 'flaky';
}

export class TestBenchmarker {
  public static async benchmark(testFile: string, runs: number = 3): Promise<BenchmarkMetrics> {
    const durations: number[] = [];

    for (let i = 0; i < runs; i++) {
      const start = Date.now();
      await this.runSinglePass(testFile);
      const elapsed = Date.now() - start;
      durations.push(elapsed);
    }

    const total = durations.reduce((a, b) => a + b, 0);
    const avg = Math.round(total / runs);

    // Calcolo della deviazione standard per determinare la stabilità
    const variance = durations.reduce((acc, curr) => acc + Math.pow(curr - avg, 2), 0) / runs;
    const stdDev = Math.sqrt(variance);

    // Più stdDev è basso rispetto all'avg, più il test è stabile
    const coefficientOfVariation = avg > 0 ? (stdDev / avg) * 100 : 0;
    const stabilityScore = Math.max(0, Math.min(100, Math.round(100 - coefficientOfVariation)));

    const status = stabilityScore >= 85 ? 'highly_stable' : stabilityScore >= 60 ? 'moderate' : 'flaky';

    return {
      totalDurationMs: total,
      testFile,
      runsCount: runs,
      avgDurationMs: avg,
      stabilityScore,
      status
    };
  }

  private static runSinglePass(testFile: string): Promise<boolean> {
    return new Promise((resolve) => {
      const child = spawn('npx', ['playwright', 'test', testFile], {
        cwd: process.cwd(),
        shell: true,
        stdio: 'pipe'
      });
      child.on('close', (code) => resolve(code === 0));
    });
  }
}
