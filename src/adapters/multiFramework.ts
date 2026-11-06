export type SupportedFramework = 'playwright' | 'cypress' | 'testing-library';

export interface FrameworkAdapter {
  name: SupportedFramework;
  detect(testCode: string): boolean;
  convertLocator(target: { tag: string; role?: string; text?: string; testId?: string; id?: string }): string;
}

export class MultiFrameworkRouter {
  private static adapters: FrameworkAdapter[] = [
    {
      name: 'playwright',
      detect: (code) => code.includes('@playwright/test') || code.includes('page.locator') || code.includes('page.goto'),
      convertLocator: (target) => {
        if (target.testId) return `page.getByTestId('${target.testId}')`;
        if (target.role && target.text) return `page.getByRole('${target.role}', { name: '${target.text}' })`;
        if (target.tag === 'button' && target.text) return `page.getByRole('button', { name: '${target.text}' })`;
        if (target.id) return `page.locator('#${target.id}')`;
        return `page.locator('${target.tag}')`;
      }
    },
    {
      name: 'cypress',
      detect: (code) => code.includes('cy.get(') || code.includes('cy.visit(') || code.includes('describe(') && code.includes('it('),
      convertLocator: (target) => {
        if (target.testId) return `cy.get('[data-testid="${target.testId}"]')`;
        if (target.role && target.text) return `cy.findByRole('${target.role}', { name: /${target.text}/i })`;
        if (target.tag === 'button' && target.text) return `cy.contains('button', '${target.text}')`;
        if (target.id) return `cy.get('#${target.id}')`;
        return `cy.get('${target.tag}')`;
      }
    },
    {
      name: 'testing-library',
      detect: (code) => code.includes('@testing-library') || code.includes('screen.getBy') || code.includes('render('),
      convertLocator: (target) => {
        if (target.role && target.text) return `screen.getByRole('${target.role}', { name: /${target.text}/i })`;
        if (target.testId) return `screen.getByTestId('${target.testId}')`;
        if (target.text) return `screen.getByText('${target.text}')`;
        return `screen.getByRole('button')`;
      }
    }
  ];

  public static detectFramework(testCode: string): FrameworkAdapter {
    for (const adapter of this.adapters) {
      if (adapter.detect(testCode)) {
        return adapter;
      }
    }
    // Default fallback a Playwright
    return this.adapters[0];
  }
}
