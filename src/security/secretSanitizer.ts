export class SecretSanitizer {
  private static patterns: { name: string; regex: RegExp; replacement: string }[] = [
    { name: 'GitHub PAT', regex: /github_pat_[a-zA-Z0-9_]{30,}/g, replacement: '[REDACTED_GITHUB_PAT]' },
    { name: 'GitHub Classic Token', regex: /ghp_[a-zA-Z0-9]{20,}/g, replacement: '[REDACTED_GH_TOKEN]' },
    { name: 'OpenAI Secret Key', regex: /sk-[a-zA-Z0-9]{32,}/g, replacement: '[REDACTED_OPENAI_KEY]' },
    { name: 'Google API Key', regex: /AIza[0-9A-Za-z-_]{35}/g, replacement: '[REDACTED_GOOGLE_KEY]' },
    { name: 'JWT Token', regex: /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, replacement: '[REDACTED_JWT]' },
    { name: 'Credit Card', regex: /\b(?:\d{4}[ -]?){3}\d{4}\b/g, replacement: '[REDACTED_CREDIT_CARD]' },
    { name: 'Basic Auth in URL', regex: /:\/\/[^:]+:[^@]+@/g, replacement: '://[REDACTED_AUTH]@' }
  ];

  public static sanitize(text: string): { sanitized: string; redactedCount: number } {
    let output = text;
    let count = 0;

    for (const { regex, replacement } of this.patterns) {
      const matches = output.match(regex);
      if (matches) {
        count += matches.length;
        output = output.replace(regex, replacement);
      }
    }

    return { sanitized: output, redactedCount: count };
  }
}
