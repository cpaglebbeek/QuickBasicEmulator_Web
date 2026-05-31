/**
 * QuickBASIC 4.5 dialect-mode — pre-flight validator.
 *
 * QB45 is de meest permissieve dialect die we ondersteunen. QBJS-runtime is in essentie
 * QB+QB64-compat, dus we accepteren alles dat QBJS aankan. Geen verbods-checks nodig.
 *
 * Toekomst (v0.0.4+): pre-flight kan QB45-specifieke compile-mode-hints geven
 * (BRUN vs Stand-alone) zodra de decompiler-koppeling expliciet wordt.
 */

import type { ValidationResult } from '../dialect-adapter';

export function validateQb45(_source: string): ValidationResult {
  // QB45 = pass-through. QBJS-engine doet de echte parsing.
  return { ok: true, errors: [] };
}
