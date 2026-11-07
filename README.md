<p align="center">
  <img src="assets/logo.svg" alt="AutoHeal Agent Logo" width="100%" />
</p>

<p align="center">
  <img src="assets/badges/autoheal-rate.svg" alt="AutoHeal 100% Pass" />
  <img src="assets/badges/autoheal-cache.svg" alt="0ms Memory Cache" />
  <img src="assets/badges/autoheal-safeguard.svg" alt="SafeGuard Protected" />
</p>

> **The Next-Gen Autonomous Testing & Self-Healing Ecosystem for Playwright, Cypress, and Testing Library**
> Ripara test rotti in modo polimorfico, esplora synthetic user journey ed edge cases, misura flakiness e stabilità, include un server MCP per agenti AI, Live Web Dashboard e zero-token local cache.

---

## 👤 Autore
**Franca Roscilli**
- GitHub: [@francaroscillidev-gif](https://github.com/francaroscillidev-gif)
- Email: francaroscillidev@gmail.com
- Licenza: **Apache License 2.0**

---

## 🚀 Nuove Funzionalità di AutoHeal v6.0 Next-Gen

1. **🧬 Polymorphic Genetic Selector Synthesizer (`--polymorphic`)**:
   - Genera strategie di failover a cascata con `.or()` continuo (TestID ➔ ARIA Role ➔ Semantic Label ➔ Structure) rendendo i test **impossibili da rompere** nei futuri refactoring.
2. **🧭 Autonomous Synthetic Journey & Edge-Case Explorer (`autoheal journey <url/file>`)**:
   - Esplora la struttura della pagina e sintetizza suite a 3 scenari:
     - **Happy Path:** flusso di business con dati realistici
     - **Edge-Case Stress Test:** caratteri speciali Unicode, emoji e injection safe check
     - **Boundary Negative Validation Test:** verifica dell'invalidità e dei campi obbligatori.
3. **⏱️ Stability & Flakiness Benchmarker (`autoheal bench <file>`)**:
   - Calcola matematicamente lo **Stability Score (0-100)** e la latenza media del test su iterazioni multiple.
4. **🔒 Zero-Leak Privacy & Secret Sanitizer**:
   - Maschera automaticamente token, credenziali, chiavi API, cookie e carte di credito da log, DOM e report.
5. **🩺 Autonomous Health Check (`autoheal doctor`)**:
   - Diagnosi one-click dell'ambiente di test (Playwright, Git, Node, Config, Cache).
6. **⚡ Suite Deduplicator & Optimizer (`autoheal optimize`)**:
   - Analizza l'AST dei test, individua step ridondanti e stima i millisecondi risparmiati in CI.
7. **🌐 Live Web Dashboard (`autoheal serve`)**:
   - Interfaccia web interattiva su `http://localhost:4321` con ispezione cache e playground DOM.
8. **🤖 Server MCP Ufficiale (`autoheal mcp`)**:
   - Standard Model Context Protocol su stdio per Claude Desktop, Cursor e Antigravity.
9. **⚡ Instant Memory Cache (`.autoheal-cache.json`)**:
   - Riparazione a **0ms** e **$0 token** per selettori già noti (`⚡ [Cache Hit]`).
10. **🛡️ SafeGuard Mode**:
    - Distingue i veri bug (HTTP 500, crash JS) dai cambi selettore, proteggendo il test suite.
11. **👀 Live TDD Watcher (`autoheal watch`)**:
    - Auto-ripara i test in background in tempo reale mentre sviluppi.

---

## 🏛️ Architettura del Sistema

```mermaid
flowchart TD
    A["Esecuzione Test (Playwright / Cypress)"] --> B{"Test Fallito?"}
    B -- No --> C["✅ Build Verde"]
    B -- Sì --> D{"SafeGuard: È un Vero Bug?"}
    D -- Sì: 500 / Crash --> E["🚨 Allerta Sviluppatore (Test intatto)"]
    D -- No: Selettore rotto --> F{"Presente in Cache Locale?"}
    F -- Sì --> G["⚡ Instant Patch (0ms, $0 token)"]
    F -- No --> H["AI Healer + Genetic Synthesizer (.or) + Vision AI"]
    H --> I["Memorizzazione in Cache"]
    I --> G
    G --> J["AST Patcher (ts-morph chirurgico)"]
    J --> K["Re-run Test di Verifica"]
    K -- Passato --> L["📊 Live Web Dashboard + Batch Git PR"]
```

---

## ⚡ Guida ai Comandi CLI

```bash
# 1. Esegui la suite con auto-healing e selettori polimorfici
npx autoheal run --polymorphic

# 2. Genera una suite a 3 scenari (Happy, Edge-Case, Negative)
npx autoheal journey demo/app.html --output demo/journey-suite.spec.ts

# 3. Misura la stabilità e il Flakiness Score di un test
npx autoheal bench demo/journey-suite.spec.ts --runs 3

# 4. Diagnostica l'ambiente di lavoro con Doctor CLI
npx autoheal doctor

# 5. Ottimizza la suite eliminando passaggi ridondanti
npx autoheal optimize demo

# 6. Avvia la Dashboard Web Interattiva
npx autoheal serve --port 4321

# 7. Inizializza il file di configurazione autoheal.config.json
npx autoheal init

# 8. Avvia la modalità Live Watcher durante lo sviluppo
npx autoheal watch

# 9. Avvia il server Model Context Protocol (MCP) per client AI
npx autoheal mcp

# 10. Rigenera i badge SVG ufficiali
npx autoheal badges
```

---

## 📬 Contact, Support & Commercial Inquiries

If you have questions, feedback, enterprise integration requests, or custom agent governance needs, feel free to reach out directly:

- **Lead Developer & Maintainer:** Franca Roscilli
- **Email:** [francaroscillidev@gmail.com](mailto:francaroscillidev@gmail.com)
- **GitHub:** [@francaroscillidev-gif](https://github.com/francaroscillidev-gif)
- **Bug Reports & Feature Requests:** [Open an issue on GitHub](https://github.com/francaroscillidev-gif/autoheal/issues)

---

## 📄 Licenza

Rilasciato sotto licenza Apache 2.0. Consulta il file [LICENSE](LICENSE) per i dettagli.
