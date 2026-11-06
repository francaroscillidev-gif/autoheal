import { HealedTestRecord } from '../report/htmlReporter.js';

export interface PrCommentOptions {
  repoOwner: string;
  repoName: string;
  pullNumber: number;
  records: HealedTestRecord[];
  githubToken?: string;
}

export class BotCommenter {
  /**
   * Genera il corpo del commento in Markdown per la PR GitHub
   */
  public static buildCommentBody(records: HealedTestRecord[]): string {
    const total = records.length;
    const healed = records.filter(r => r.status === 'healed').length;

    const rows = records.map(r => `
| \`${r.testFile}:${r.line}\` | \`${r.oldLocator}\` | \`${r.newLocator}\` | **${Math.round(r.confidence * 100)}%** | ${r.status === 'healed' ? '✅ Healed' : '❌ Needs Review'} |
`).join('').trim();

    return `## 🛡️ AutoHeal Bot - Test Healing Report

> Rilevati **${total}** test falliti nella suite di regressione.
> **${healed}/${total}** test possono essere auto-riparati con successo! 🚀

### 📋 Dettaglio Riparazioni Proposte:

| File & Line | Vecchio Locator (Rotto) | Nuovo Locator Proposto | Confidenza | Esito |
| :--- | :--- | :--- | :--- | :--- |
${rows}

### 💡 Dettagli e Motivazione AI:
${records.map(r => `- **\`${r.testFile}\`**: ${r.reasoning}`).join('\n')}

---

### ⚡ Come applicare questa patch:
Rispondi a questa Pull Request con:
\`\`\`text
/autoheal apply
\`\`\`
oppure esegui in locale: \`npx autoheal run\`

*Generato autonomamente da [AutoHeal Agent](https://github.com/francaroscillidev-gif/autoheal) • Autore: Franca Roscilli*`;
  }

  /**
   * Invia il commento sulla PR GitHub tramite le API REST
   */
  public static async postComment(options: PrCommentOptions): Promise<{ success: boolean; commentUrl?: string }> {
    const token = options.githubToken || process.env.GITHUB_TOKEN;
    if (!token) {
      console.warn('[AutoHeal Bot] Nessun GITHUB_TOKEN trovato. Salto pubblicazione commento.');
      return { success: false };
    }

    const endpoint = `https://api.github.com/repos/${options.repoOwner}/${options.repoName}/issues/${options.pullNumber}/comments`;
    const body = this.buildCommentBody(options.records);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ body })
      });

      if (res.ok) {
        const data = await res.json() as any;
        return { success: true, commentUrl: data.html_url };
      }
    } catch (err: any) {
      console.error(`[AutoHeal Bot] Errore pubblicazione commento PR: ${err.message}`);
    }

    return { success: false };
  }
}
