/**
 * QBasic dialect-mode — pre-flight validator.
 *
 * QBasic verschilt van QB45 op een paar punten (per dialect_qbasic.json + dialect_qb45.json):
 *   - geen TYPE / END TYPE (user_defined_types: not_supported)
 *   - geen REDIM PRESERVE (alleen REDIM)
 *   - geen compile_to_exe (irrelevant voor runtime-validation)
 *   - geen metacommands $STATIC / $DYNAMIC / $INCLUDE
 *
 * Voor v0.0.3-Davidoff: alleen TYPE en REDIM PRESERVE als pre-flight warning.
 */

import type { ValidationResult } from '../dialect-adapter';

const TYPE_BLOCK_RE = /\bTYPE\s+\w+\b/i;
const REDIM_PRESERVE_RE = /\bREDIM\s+(?:SHARED\s+)?PRESERVE\b/i;
const METACOMMAND_RE = /'\s*\$(STATIC|DYNAMIC|INCLUDE)\b/i;

export function validateQbasic(source: string): ValidationResult {
  const errors: ValidationResult['errors'] = [];
  const lines = source.split(/\r?\n/);

  lines.forEach((raw, idx) => {
    const lineNumber = idx + 1;
    if (TYPE_BLOCK_RE.test(raw)) {
      errors.push({
        line: lineNumber,
        message: 'QBasic does not support user-defined TYPE blocks. Use QuickBASIC 4.5 dialect for TYPE/END TYPE.',
      });
    }
    if (REDIM_PRESERVE_RE.test(raw)) {
      errors.push({
        line: lineNumber,
        message: 'QBasic REDIM does not support PRESERVE. Use QuickBASIC 4.5 dialect, or DIM with copy-by-loop.',
      });
    }
    if (METACOMMAND_RE.test(raw)) {
      errors.push({
        line: lineNumber,
        message: 'QBasic does not support metacommands ($STATIC/$DYNAMIC/$INCLUDE). Use QuickBASIC 4.5 dialect.',
      });
    }
  });

  return { ok: errors.length === 0, errors };
}
