import * as cheerio from 'cheerio';

export interface InteractiveElement {
  tag: string;
  id?: string;
  text?: string;
  role?: string;
  name?: string;
  type?: string;
  placeholder?: string;
  ariaLabel?: string;
  testId?: string;
  classes?: string[];
  selectorHints: string[];
}

/**
 * Riduce un intero albero HTML grezzo a una mappa semantica compatta
 * contenente esclusivamente elementi azionabili / identificabili.
 */
export function extractInteractiveElements(rawHtml: string): InteractiveElement[] {
  const $ = cheerio.load(rawHtml);

  // Rimuovi tag spazzatura / non pertinenti ai test UI
  $('script, style, svg, noscript, iframe, link, meta').remove();

  const interactiveSelectors = [
    'button',
    'a[href]',
    'input',
    'select',
    'textarea',
    '[role]',
    '[data-testid]',
    '[data-test]',
    '[aria-label]',
    '[onclick]',
    'h1, h2, h3, h4, h5, h6'
  ].join(', ');

  const elements: InteractiveElement[] = [];

  $(interactiveSelectors).each((_, el) => {
    const $el = $(el);
    const tag = ($el.prop('tagName') || '').toLowerCase();
    const id = $el.attr('id');
    const role = $el.attr('role');
    const name = $el.attr('name');
    const type = $el.attr('type');
    const placeholder = $el.attr('placeholder');
    const ariaLabel = $el.attr('aria-label');
    const testId = $el.attr('data-testid') || $el.attr('data-test');
    const classAttr = $el.attr('class') || '';
    const classes = classAttr.split(/\s+/).filter(Boolean);
    const text = $el.clone().children().remove().end().text().trim() || $el.text().trim();

    // Genera selettori Playwright raccomandati
    const hints: string[] = [];
    if (testId) hints.push(`getByTestId('${testId}')`);
    if (ariaLabel) hints.push(`getByLabel('${ariaLabel}')`);
    if (role && text) hints.push(`getByRole('${role}', { name: '${text}' })`);
    else if (tag === 'button' && text) hints.push(`getByRole('button', { name: '${text}' })`);
    if (placeholder) hints.push(`getByPlaceholder('${placeholder}')`);
    if (text && tag === 'a') hints.push(`getByRole('link', { name: '${text}' })`);
    if (id) hints.push(`locator('#${id}')`);

    elements.push({
      tag,
      id,
      text: text.slice(0, 100),
      role,
      name,
      type,
      placeholder,
      ariaLabel,
      testId,
      classes: classes.slice(0, 5),
      selectorHints: hints
    });
  });

  return elements;
}

/**
 * Formatta gli elementi interattivi in un markdown leggibile per l'LLM
 */
export function formatElementsForPrompt(elements: InteractiveElement[]): string {
  return elements.map((item, idx) => {
    const parts = [
      `[${idx + 1}] <${item.tag}>`,
      item.text ? `text: "${item.text}"` : '',
      item.role ? `role: "${item.role}"` : '',
      item.testId ? `data-testid: "${item.testId}"` : '',
      item.ariaLabel ? `aria-label: "${item.ariaLabel}"` : '',
      item.id ? `id: "${item.id}"` : '',
      item.placeholder ? `placeholder: "${item.placeholder}"` : '',
      item.selectorHints.length ? `hints: [${item.selectorHints.join(', ')}]` : ''
    ].filter(Boolean);
    return parts.join(' | ');
  }).join('\n');
}
