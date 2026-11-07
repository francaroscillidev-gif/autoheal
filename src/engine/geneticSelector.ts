import { InteractiveElement } from '../dom/reducer.js';

export interface PolymorphicLocatorResult {
  primaryLocator: string;
  cascadingLocatorCode: string;
  tierList: string[];
  resilienceScore: number; // 0 to 100
  explanation: string;
}

export class GeneticSelectorSynthesizer {
  /**
   * Genera un selettore polimorfico ultra-resiliente con failover a cascata (.or())
   */
  public static synthesize(target: InteractiveElement): PolymorphicLocatorResult {
    const tiers: string[] = [];

    // Livello 1: Test ID (massima stabilità contrattuale)
    if (target.testId) {
      tiers.push(`page.getByTestId('${target.testId}')`);
    }

    // Livello 2: Accessibilità W3C / Role + Name (standard industriale)
    if (target.role && target.text) {
      tiers.push(`page.getByRole('${target.role}', { name: '${target.text}' })`);
    } else if (target.tag === 'button' && target.text) {
      tiers.push(`page.getByRole('button', { name: '${target.text}' })`);
    } else if (target.ariaLabel) {
      tiers.push(`page.getByLabel('${target.ariaLabel}')`);
    }

    // Livello 3: Attributi semantici stabili (Placeholder, name, ID)
    if (target.placeholder) {
      tiers.push(`page.getByPlaceholder('${target.placeholder}')`);
    } else if (target.id) {
      tiers.push(`page.locator('#${target.id}')`);
    } else if (target.name) {
      tiers.push(`page.locator('[name="${target.name}"]')`);
    }

    // Livello 4: Fallback strutturale contestuale
    if (target.text && target.tag === 'a') {
      tiers.push(`page.getByRole('link', { name: '${target.text}' })`);
    } else if (target.tag && target.classes && target.classes.length > 0) {
      tiers.push(`page.locator('${target.tag}.${target.classes[0]}')`);
    } else {
      tiers.push(`page.locator('${target.tag}')`);
    }

    // Rimuovi duplicati preservando l'ordine di priorità
    const uniqueTiers = Array.from(new Set(tiers));
    const primary = uniqueTiers[0] || `page.locator('${target.tag}')`;

    // Se abbiamo almeno 2 livelli, costruiamo la catena polimorfica Playwright con .or()
    let cascading = primary;
    if (uniqueTiers.length > 1) {
      // e.g. page.getByTestId('submit').or(page.getByRole('button', { name: 'Paga' }))
      cascading = uniqueTiers[0];
      for (let i = 1; i < Math.min(uniqueTiers.length, 3); i++) {
        cascading += `.or(${uniqueTiers[i]})`;
      }
    }

    const resilienceScore = Math.min(uniqueTiers.length * 30 + 10, 100);

    return {
      primaryLocator: primary,
      cascadingLocatorCode: cascading,
      tierList: uniqueTiers,
      resilienceScore,
      explanation: `Sintetizzata strategia polimorfica a ${uniqueTiers.length} livelli (Score: ${resilienceScore}/100) con failover continuo Playwright .or()`
    };
  }
}
