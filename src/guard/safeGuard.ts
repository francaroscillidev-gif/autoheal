export interface BugDiagnostic {
  isRealApplicationBug: boolean;
  bugCategory?: 'SERVER_500' | 'CLIENT_CRASH' | 'ASSERTION_VALUE_MISMATCH' | 'SELECTOR_DRIFT';
  reasoning: string;
  recommendation: string;
}

export class SafeGuard {
  /**
   * Determina se un fallimento è un vero bug di logica/backend o una semplice modifica di selettore
   */
  public static diagnose(errorMessage: string, consoleLogs: string[] = []): BugDiagnostic {
    const combined = (errorMessage + '\n' + consoleLogs.join('\n')).toLowerCase();

    // 1. Crash server / errori HTTP 5xx
    if (combined.includes('500 internal server error') || combined.includes('status of 502') || combined.includes('status of 503')) {
      return {
        isRealApplicationBug: true,
        bugCategory: 'SERVER_500',
        reasoning: 'Rilevato errore HTTP 5xx del backend server durante l\'esecuzione del test.',
        recommendation: 'NON riparare il test. Ispezionare i log backend o riavviare il server API.'
      };
    }

    // 2. Uncaught Exception / React Error Boundaries
    if (combined.includes('uncaught typeerror') || combined.includes('unhandledrejection') || combined.includes('cannot read properties of undefined') || combined.includes('minified react error')) {
      return {
        isRealApplicationBug: true,
        bugCategory: 'CLIENT_CRASH',
        reasoning: 'Rilevata un\'eccezione non gestita (JavaScript crash) nella console del browser dell\'applicazione.',
        recommendation: 'NON riparare il test. Si tratta di un bug reale nel codice applicativo frontend.'
      };
    }

    // 3. Fallimento di logica su valori di business (es. expect(balance).toBe(100) ma ha ricevuto 0)
    if (combined.includes('received: ') && combined.includes('expected: ') && !combined.includes('locator')) {
      return {
        isRealApplicationBug: true,
        bugCategory: 'ASSERTION_VALUE_MISMATCH',
        reasoning: 'Discrepanza di valore logico (business logic assertion failure), non un problema di localizzazione DOM.',
        recommendation: 'Verificare che il calcolo o lo stato applicativo sia conforme ai requisiti prima di modificare l\'asserzione.'
      };
    }

    // 4. Timeout su locator o selettore non trovato
    return {
      isRealApplicationBug: false,
      bugCategory: 'SELECTOR_DRIFT',
      reasoning: 'Mancata corrispondenza del selettore DOM o timeout d\'interazione. Candidato ideale per auto-healing.',
      recommendation: 'Procedere con la riparazione semantica del locator.'
    };
  }
}
