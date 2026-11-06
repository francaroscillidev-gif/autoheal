import { HealingCache } from '../cache/healingCache.js';
import { SafeGuard } from '../guard/safeGuard.js';
import { extractInteractiveElements } from '../dom/reducer.js';

export class McpServer {
  private cache: HealingCache;

  constructor() {
    this.cache = new HealingCache();
  }

  public handleRequest(request: any): any {
    const { method, params, id } = request;

    if (method === 'tools/list') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          tools: [
            {
              name: 'autoheal_diagnose',
              description: 'Analizza un errore di test e diagnostica se si tratta di un bug reale o di un selettore rotto',
              inputSchema: {
                type: 'object',
                properties: {
                  errorMessage: { type: 'string' }
                },
                required: ['errorMessage']
              }
            },
            {
              name: 'autoheal_query_cache',
              description: 'Verifica se un selettore rotto è già stato riparato e memorizzato nella cache a 0ms',
              inputSchema: {
                type: 'object',
                properties: {
                  brokenLocator: { type: 'string' }
                },
                required: ['brokenLocator']
              }
            },
            {
              name: 'autoheal_inspect_dom',
              description: 'Estrae gli elementi interattivi da un codice HTML riducendo i token del 90%',
              inputSchema: {
                type: 'object',
                properties: {
                  html: { type: 'string' }
                },
                required: ['html']
              }
            }
          ]
        }
      };
    }

    if (method === 'tools/call') {
      const toolName = params?.name;
      const args = params?.arguments || {};

      if (toolName === 'autoheal_diagnose') {
        const diag = SafeGuard.diagnose(args.errorMessage);
        return {
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify(diag, null, 2) }] }
        };
      }

      if (toolName === 'autoheal_query_cache') {
        const entry = this.cache.get(args.brokenLocator);
        return {
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: entry ? JSON.stringify(entry, null, 2) : 'Not found in cache' }] }
        };
      }

      if (toolName === 'autoheal_inspect_dom') {
        const elements = extractInteractiveElements(args.html);
        return {
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify(elements, null, 2) }] }
        };
      }
    }

    return { jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } };
  }

  public startStdio(): void {
    process.stdin.setEncoding('utf-8');
    let buffer = '';

    process.stdin.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const req = JSON.parse(line);
          const res = this.handleRequest(req);
          process.stdout.write(JSON.stringify(res) + '\n');
        } catch (e: any) {
          process.stdout.write(JSON.stringify({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' } }) + '\n');
        }
      }
    });
  }
}
