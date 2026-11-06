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
  suggestedLocatorCode: string; // e.g. "getByRole('button', { name: 'Invia Ordine' })"
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
    // Se è disponibile una chiave API LLM, proviamo prima la chiamata LLM
    if (this.apiKey) {
      try {
        const llmResult = await this.queryLlm(context);
        if (llmResult) return llmResult;
      } catch (err) {
        console.warn(`[AutoHeal AI] LLM query failed, falling back to local semantic matcher:`, err);
      }
    }

    // Semantic Intent Matching locale (deterministico & veloce)
    return this.localSemanticMatch(context);
  }

  /**
   * Algoritmo euristico locale: analizza il testo, il nome dell'azione e i selettori affini
   */
  private localSemanticMatch(context: HealingContext): HealingProposal {
    const { brokenLocator, elements, failedTestCode, errorMessage } = context;

    // Estraiamo parole chiave dall'intento originale (es. da '.btn-submit', 'button[name="checkout"]', o dal testo del locator)
    const normalizedOld = brokenLocator.toLowerCase().replace(/[^a-z0-9]/g, ' ');
    const keywords = normalizedOld.split(/\s+/).filter(w => w.length > 2 && !['button', 'click', 'locator', 'page', 'waitfor'].includes(w));

    let bestElement: InteractiveElement | null = null;
    let highestScore = 0;
    let reasoning = '';

    for (const el of elements) {
      let score = 0;
      const elText = (el.text || '').toLowerCase();
      const elTestId = (el.testId || '').toLowerCase();
      const elAria = (el.ariaLabel || '').toLowerCase();
      const elId = (el.id || '').toLowerCase();

      // 1. Corrispondenza Test ID (priorità massima)
      for (const kw of keywords) {
        if (elTestId.includes(kw)) score += 10;
        if (elAria.includes(kw)) score += 8;
        if (elText.includes(kw)) score += 7;
        if (elId.includes(kw)) score += 5;
        if (el.classes?.some(c => c.toLowerCase().includes(kw))) score += 4;
      }

      // Bonus per corrispondenza di ruolo (se il vecchio conteneva 'button' o l'azione è un click)
      if (failedTestCode.includes('.click(') && (el.tag === 'button' || el.role === 'button')) {
        score += 3;
      }

      if (score > highestScore) {
        highestScore = score;
        bestElement = el;
      }
    }

    if (bestElement && highestScore >= 5) {
      const suggested = bestElement.selectorHints[0] || `locator('${bestElement.tag}')`;
      reasoning = `Matched intent with ${highestScore} confidence based on text="${bestElement.text}" and testId="${bestElement.testId || 'none'}". Replaced fragile locator with resilient Playwright query.`;

      return {
        confidence: Math.min(highestScore / 15, 0.98),
        reasoning,
        oldLocator: brokenLocator,
        suggestedLocatorCode: suggested,
        targetElement: bestElement
      };
    }

    // Se non abbiamo trovato keyword specifiche ma c'è un solo bottone o elemento interattivo coerente
    if (elements.length === 1 && elements[0].selectorHints.length > 0) {
      const singleEl = elements[0];
      return {
        confidence: 0.75,
        reasoning: 'Single actionable target found in modified DOM region.',
        oldLocator: brokenLocator,
        suggestedLocatorCode: singleEl.selectorHints[0],
        targetElement: singleEl
      };
    }

    throw new Error(`Unable to determine intent for broken locator: ${brokenLocator}. No confident match found.`);
  }

  /**
   * Invocazione LLM (formattata per prompt strutturato)
   */
  private async queryLlm(context: HealingContext): Promise<HealingProposal | null> {
    const formattedDom = formatElementsForPrompt(context.elements);

    const systemPrompt = `You are an autonomous test-repair agent for Playwright tests.
Given a broken test line, the error message, and the simplified current DOM elements, your task is to identify the original intent and output a modernized, resilient Playwright locator (e.g. getByRole, getByTestId, getByLabel).

Output strictly valid JSON with this shape:
{
  "reasoning": "Brief explanation of what changed in the DOM and why this is the correct target",
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

    // Se c'è GEMINI_API_KEY, eseguiamo fetch verso Gemini API
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
