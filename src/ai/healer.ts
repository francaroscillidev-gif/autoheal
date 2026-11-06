import { InteractiveElement, formatElementsForPrompt } from '../dom/reducer.js';

export interface HealingContext {
  failedTestCode: string;
  failedLine: number;
  errorMessage: string;
  brokenLocator: string;
  rawHtmlOrDom: string;
  elements: InteractiveElement[];
}

export interface HealingProposal {
  confidence: number;
  reasoning: string;
  oldLocator: string;
  suggestedLocatorCode: string;
  targetElement?: InteractiveElement;
}

export class HealingEngine {
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
  }

  /**
   * Determina il nuovo locator confrontando l'intento del test e gli elementi del DOM.
   */
  public async heal(context: HealingContext): Promise<HealingProposal> {
    if (this.apiKey) {
      try {
        const llmResult = await this.queryLlm(context);
        if (llmResult) return llmResult;
      } catch (err) {
        console.warn(`[AutoHeal AI] LLM fallback su local matcher:`, err);
      }
    }

    return this.localSemanticMatch(context);
  }

  /**
   * Algoritmo semantico locale avanzato: gestisce bottoni, input, link, dropdown e asserzioni
   */
  private localSemanticMatch(context: HealingContext): HealingProposal {
    const { brokenLocator, elements, failedTestCode } = context;

    const normalizedOld = brokenLocator.toLowerCase().replace(/[^a-z0-9]/g, ' ');
    const keywords = normalizedOld.split(/\s+/).filter(w => 
      w.length > 2 && !['button', 'click', 'locator', 'page', 'waitfor', 'input', 'select', 'fill'].includes(w)
    );

    let bestElement: InteractiveElement | null = null;
    let highestScore = 0;

    const isFillAction = failedTestCode.includes('.fill(');
    const isClickAction = failedTestCode.includes('.click(');

    for (const el of elements) {
      let score = 0;
      const elText = (el.text || '').toLowerCase();
      const elTestId = (el.testId || '').toLowerCase();
      const elAria = (el.ariaLabel || '').toLowerCase();
      const elId = (el.id || '').toLowerCase();
      const elPlaceholder = (el.placeholder || '').toLowerCase();
      const elName = (el.name || '').toLowerCase();

      // Corrispondenza semantica pesata
      for (const kw of keywords) {
        if (elTestId.includes(kw)) score += 12;
        if (elAria.includes(kw)) score += 10;
        if (elText.includes(kw)) score += 8;
        if (elPlaceholder.includes(kw)) score += 8;
        if (elName.includes(kw)) score += 7;
        if (elId.includes(kw)) score += 6;
        if (el.classes?.some(c => c.toLowerCase().includes(kw))) score += 4;
      }

      // Bonus per affinità d'azione
      if (isClickAction && (el.tag === 'button' || el.role === 'button' || el.tag === 'a')) {
        score += 3;
      }
      if (isFillAction && (el.tag === 'input' || el.tag === 'textarea')) {
        score += 4;
      }

      if (score > highestScore) {
        highestScore = score;
        bestElement = el;
      }
    }

    if (bestElement && highestScore >= 5) {
      const suggested = bestElement.selectorHints[0] || `locator('${bestElement.tag}')`;
      const reasoning = `Intent matched con confidenza elevata (${highestScore} pts) su <${bestElement.tag}> [text="${bestElement.text || ''}", testId="${bestElement.testId || 'none'}", aria="${bestElement.ariaLabel || 'none'}"]. Sostituito il selettore fragile con Playwright resilient query.`;

      return {
        confidence: Math.min(highestScore / 15, 0.99),
        reasoning,
        oldLocator: brokenLocator,
        suggestedLocatorCode: suggested,
        targetElement: bestElement
      };
    }

    // Se c'è un solo elemento interattivo compatibile con l'azione
    const compatibleElements = elements.filter(el => 
      isClickAction ? (el.tag === 'button' || el.role === 'button' || el.tag === 'a') : (el.tag === 'input')
    );

    if (compatibleElements.length === 1 && compatibleElements[0].selectorHints.length > 0) {
      const singleEl = compatibleElements[0];
      return {
        confidence: 0.80,
        reasoning: `Unico target interattivo compatibile presente nell'area attiva (${singleEl.tag}).`,
        oldLocator: brokenLocator,
        suggestedLocatorCode: singleEl.selectorHints[0],
        targetElement: singleEl
      };
    }

    throw new Error(`Impossibile determinare con sicurezza l'intento per il selettore: ${brokenLocator}.`);
  }

  private async queryLlm(context: HealingContext): Promise<HealingProposal | null> {
    const formattedDom = formatElementsForPrompt(context.elements);

    const systemPrompt = `You are an autonomous test-repair agent for Playwright tests.
Identify the original test intent and output a modernized, resilient Playwright locator (e.g. getByRole, getByTestId, getByLabel, getByPlaceholder).

Output strictly valid JSON:
{
  "reasoning": "Explanation",
  "confidence": 0.95,
  "suggestedLocatorCode": "getByRole('button', { name: 'Submit' })"
}`;

    const userContent = `Test snippet:
${context.failedTestCode}

Failed line: ${context.failedLine}
Broken locator: ${context.brokenLocator}
Error message: ${context.errorMessage}

Current Interactive Elements in DOM:
${formattedDom}
`;

    if (process.env.GEMINI_API_KEY) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${userContent}` }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });

      if (res.ok) {
        const data = await res.json() as any;
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          return {
            confidence: parsed.confidence || 0.9,
            reasoning: parsed.reasoning || 'Healed using Gemini LLM intent matching',
            oldLocator: context.brokenLocator,
            suggestedLocatorCode: parsed.suggestedLocatorCode
          };
        }
      }
    }

    return null;
  }
}
