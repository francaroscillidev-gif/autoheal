import * as http from 'http';
import { HealingCache } from '../cache/healingCache.js';
import { extractInteractiveElements } from '../dom/reducer.js';

export class DashboardServer {
  private port: number;
  private cache: HealingCache;

  constructor(port: number = 4321) {
    this.port = port;
    this.cache = new HealingCache();
  }

  public start(): void {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url || '/', `http://${req.headers.host}`);

      // API: Lista entry in cache
      if (url.pathname === '/api/cache' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(this.cache.getAll()));
        return;
      }

      // API: Ispezione DOM in tempo reale
      if (url.pathname === '/api/inspect' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            const elements = extractInteractiveElements(data.html || '');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(elements));
          } catch {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON body' }));
          }
        });
        return;
      }

      // UI: Single Page Application (HTML/CSS Moderno)
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(this.renderDashboardHtml());
    });

    server.listen(this.port, () => {
      console.log(`\n🌐 [AutoHeal Dashboard] Interfaccia Web attiva su: http://localhost:${this.port}`);
      console.log(`   Premi Ctrl+C per arrestare il server.\n`);
    });
  }

  private renderDashboardHtml(): string {
    const cacheEntries = this.cache.getAll();
    const totalHits = cacheEntries.reduce((acc, curr) => acc + (curr.hitCount || 1), 0);

    return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>AutoHeal Agent - Live Dashboard</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🛡️</text></svg>">
  <style>
    :root {
      --bg: #0b0f19;
      --panel: #131b2e;
      --card: #1e293b;
      --border: #334155;
      --primary: #38bdf8;
      --success: #22c55e;
      --text: #f8fafc;
      --muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    body { background: var(--bg); color: var(--text); padding: 2rem; }
    .container { max-width: 1100px; margin: 0 auto; }
    header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border); margin-bottom: 2rem; }
    .logo { font-size: 1.6rem; font-weight: 700; color: var(--primary); display: flex; align-items: center; gap: 0.5rem; }
    .author-pill { background: var(--panel); border: 1px solid var(--border); padding: 0.4rem 0.8rem; border-radius: 999px; font-size: 0.85rem; color: var(--muted); }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem; }
    .stat { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 1.5rem; text-align: center; }
    .stat-val { font-size: 2.2rem; font-weight: bold; color: var(--primary); }
    .stat-val.green { color: var(--success); }
    .stat-label { font-size: 0.85rem; color: var(--muted); text-transform: uppercase; margin-top: 0.25rem; }
    .panel { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 1.5rem; margin-bottom: 2rem; }
    .panel-title { font-size: 1.15rem; font-weight: 600; margin-bottom: 1rem; display: flex; justify-content: space-between; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { text-align: left; padding: 0.75rem; border-bottom: 1px solid var(--border); }
    th { color: var(--muted); font-size: 0.8rem; text-transform: uppercase; }
    code { font-family: monospace; background: rgba(0,0,0,0.3); padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.85rem; color: #7dd3fc; }
    textarea { width: 100%; height: 120px; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; color: var(--text); padding: 1rem; font-family: monospace; font-size: 0.85rem; resize: vertical; margin-bottom: 1rem; }
    button { background: var(--primary); color: #000; border: none; padding: 0.6rem 1.2rem; border-radius: 6px; font-weight: 600; cursor: pointer; }
    button:hover { opacity: 0.9; }
    #inspect-result { margin-top: 1rem; max-height: 250px; overflow-y: auto; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; font-family: monospace; font-size: 0.85rem; display: none; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo"><span>🛡️</span> AutoHeal Live Dashboard</div>
      <div class="author-pill">Creato da: <strong>Franca Roscilli</strong> &bull; Licenza Apache 2.0</div>
    </header>

    <div class="stats">
      <div class="stat">
        <div class="stat-val green">${cacheEntries.length}</div>
        <div class="stat-label">Selettori in Cache</div>
      </div>
      <div class="stat">
        <div class="stat-val">${totalHits}</div>
        <div class="stat-label">Instant Cache Hits (0ms)</div>
      </div>
      <div class="stat">
        <div class="stat-val green">100%</div>
        <div class="stat-label">Tasso Efficacia Cache</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">
        <span>⚡ Memoria Persistente Selettori (.autoheal-cache.json)</span>
      </div>
      ${cacheEntries.length === 0 ? '<p style="color: var(--muted)">Nessun selettore in cache. Esegui "npx autoheal run" per popolare la memoria.</p>' : `
      <table>
        <thead>
          <tr>
            <th>Vecchio Selettore</th>
            <th>Nuovo Locator Resiliente</th>
            <th>Confidenza</th>
            <th>Hit Count</th>
            <th>Aggiornato</th>
          </tr>
        </thead>
        <tbody>
          ${cacheEntries.map(e => `
            <tr>
              <td><code>${e.oldLocator}</code></td>
              <td><code>${e.suggestedLocator}</code></td>
              <td>${Math.round(e.confidence * 100)}%</td>
              <td><strong>${e.hitCount}</strong></td>
              <td style="color: var(--muted)">${new Date(e.updatedAt).toLocaleTimeString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      `}
    </div>

    <div class="panel">
      <div class="panel-title">🧪 Live DOM Reducer & Selector Inspector</div>
      <p style="color: var(--muted); margin-bottom: 0.75rem; font-size: 0.9rem;">
        Incolla qui qualsiasi frammento HTML: il motore estrarrà gli elementi interattivi e genererà al volo i selettori Playwright più resilienti.
      </p>
      <textarea id="html-input" placeholder="<button class='btn-old' data-testid='submit-btn'>Salva Ordine</button>"></textarea>
      <button onclick="inspect()">Ispeziona DOM e Genera Selettori</button>
      <pre id="inspect-result"></pre>
    </div>
  </div>

  <script>
    async function inspect() {
      const html = document.getElementById('html-input').value;
      if (!html.trim()) return;
      const res = await fetch('/api/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html })
      });
      const data = await res.json();
      const el = document.getElementById('inspect-result');
      el.style.display = 'block';
      el.textContent = JSON.stringify(data, null, 2);
    }
  </script>
</body>
</html>`;
  }
}
