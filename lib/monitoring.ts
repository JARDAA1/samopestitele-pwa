/**
 * Monitoring – Sentry integrace.
 *
 * Pravidla:
 * - Inicializuje se POUZE v produkci (NODE_ENV === 'production')
 * - DSN se načítá z env proměnné EXPO_PUBLIC_SENTRY_DSN
 * - Neodesílá hesla, osobní údaje ani request body
 */
import * as Sentry from '@sentry/react';

// ─── Inicializace ─────────────────────────────────────────────────────────────

export function initMonitoring(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

  // Inicializace pouze v produkci a pokud je DSN nakonfigurováno
  if (!dsn || process.env.NODE_ENV !== 'production') {
    return;
  }

  Sentry.init({
    dsn,
    environment: 'production',

    // Nikdy neodesílat PII
    sendDefaultPii: false,

    // Odebrat potenciálně citlivá data z requestů
    beforeSend(event) {
      if (event.request) {
        delete event.request.data;      // request body
        delete event.request.cookies;  // cookies
        delete event.request.headers;  // hlavičky (mohou obsahovat auth tokeny)
      }
      return event;
    },
  });
}

// ─── Zachytávání výjimek ──────────────────────────────────────────────────────

/**
 * Odešle výjimku do Sentry (pouze v produkci).
 * V development prostředí je no-op – chyba se neposílá, jen se tiše ignoruje.
 * Monitoring nikdy nesmí rozbít běh aplikace → celé tělo je v try/catch.
 */
export function captureException(error: unknown): void {
  try {
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureException(error);
    }
  } catch {
    // Chyba monitoringu nesmí propagovat do aplikace
  }
}

// Re-export Sentry pro případné přímé použití (např. Sentry.ErrorBoundary)
export { Sentry };
