import * as fs from 'fs';
import * as path from 'path';

export interface HealedTestRecord {
  testFile: string;
  testTitle: string;
  line: number;
  oldLocator: string;
  newLocator: string;
  confidence: number;
  reasoning: string;
  timestamp: string;
  status: 'healed' | 'failed';
}

export class HtmlReporter {
  public static generateReport(records: HealedTestRecord[], outputPath: string = 'autoheal-report.html'): string {
    const total = records.length;
    const healed = records.filter(r => r.status === 'healed').length;
    const failed = total - healed;
    const successRate = total > 0 ? Math.round((healed / total) * 100) : 100;

    const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AutoHeal Agent - Test Healing Report</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #38bdf8;
      --success: #22c55e;
      --danger: #ef4444;
      --badge-bg: #0369a1;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: var(--bg); color: var(--text); padding: 2rem; line-height: 1.6; }
    .container { max-width: 1000px; margin: 0 auto; }
    header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 1.5rem; margin-bottom: 2rem; }
    .logo { font-size: 1.5rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; color: var(--primary); }
    .author-badge { font-size: 0.85rem; color: var(--text-muted); background: var(--card-bg); padding: 0.35rem 0.75rem; border-radius: 999px; border: 1px solid var(--border); }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .stat-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px; padding: 1.25rem; text-align: center; }
    .stat-val { font-size: 2rem; font-weight: bold; }
    .stat-val.success { color: var(--success); }
    .stat-val.rate { color: var(--primary); }
    .stat-val.danger { color: var(--danger); }
    .stat-label { font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px; margin-bottom: 1.5rem; overflow: hidden; }
    .card-header { padding: 1rem 1.25rem; background: rgba(255,255,255,0.02); border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
    .test-title { font-weight: 600; font-size: 1.1rem; }
    .test-meta { font-size: 0.85rem; color: var(--text-muted); }
    .badge { padding: 0.25rem 0.6rem; border-radius: 6px; font-size: 0.8rem; font-weight: 600; }
    .badge.success { background: rgba(34, 197, 94, 0.2); color: var(--success); border: 1px solid var(--success); }
    .badge.danger { background: rgba(239, 68, 68, 0.2); color: var(--danger); border: 1px solid var(--danger); }
    .card-body { padding: 1.25rem; }
    .diff-container { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1rem 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.9rem; }
    .diff-box { padding: 0.75rem; border-radius: 6px; overflow-x: auto; }
    .diff-box.old { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); }
    .diff-box.new { background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); }
    .diff-label { font-size: 0.75rem; text-transform: uppercase; font-weight: bold; margin-bottom: 0.35rem; color: var(--text-muted); }
    .reasoning { background: rgba(56, 189, 248, 0.05); border-left: 3px solid var(--primary); padding: 0.75rem 1rem; border-radius: 0 6px 6px 0; margin-top: 1rem; font-size: 0.9rem; }
    footer { text-align: center; margin-top: 3rem; color: var(--text-muted); font-size: 0.85rem; border-top: 1px solid var(--border); padding-top: 1.5rem; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo">
        <span>🛡️</span> AutoHeal Agent
      </div>
      <div class="author-badge">
        Autore: <strong>Franca Roscilli</strong>
      </div>
    </header>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-val rate">${successRate}%</div>
        <div class="stat-label">Tasso di Riparazione</div>
      </div>
      <div class="stat-card">
        <div class="stat-val success">${healed}</div>
        <div class="stat-label">Test Auto-Riparati</div>
      </div>
      <div class="stat-card">
        <div class="stat-val danger">${failed}</div>
        <div class="stat-label">Fallimenti Irrisolti</div>
      </div>
      <div class="stat-card">
        <div class="stat-val">${total}</div>
        <div class="stat-label">Totale Errori Analizzati</div>
      </div>
    </div>

    <main>
      ${records.map(record => `
        <div class="card">
          <div class="card-header">
            <div>
              <div class="test-title">${record.testTitle}</div>
              <div class="test-meta">${record.testFile}:${record.line} &bull; ${record.timestamp}</div>
            </div>
            <span class="badge ${record.status === 'healed' ? 'success' : 'danger'}">
              ${record.status === 'healed' ? `✓ HEALED (${Math.round(record.confidence * 100)}%)` : '✗ FAILED'}
            </span>
          </div>
          <div class="card-body">
            <div class="diff-container">
              <div class="diff-box old">
                <div class="diff-label">Vecchio Selettore (Rotto)</div>
                <code>${record.oldLocator}</code>
              </div>
              <div class="diff-box new">
                <div class="diff-label">Nuovo Selettore (Riparato)</div>
                <code>${record.newLocator}</code>
              </div>
            </div>
            <div class="reasoning">
              <strong>🤖 Analisi AI Healer:</strong> ${record.reasoning}
            </div>
          </div>
        </div>
      `).join('')}
    </main>

    <footer>
      Generato automaticamente da <strong>AutoHeal Agent</strong> per Playwright &bull; Licenza Apache 2.0
    </footer>
  </div>
</body>
</html>`;

    const fullPath = path.resolve(process.cwd(), outputPath);
    fs.writeFileSync(fullPath, html, 'utf-8');
    return fullPath;
  }
}
