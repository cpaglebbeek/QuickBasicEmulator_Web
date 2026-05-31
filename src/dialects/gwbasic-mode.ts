/**
 * GW-BASIC dialect-mode — pre-flight validator.
 *
 * GW-BASIC unieke constraints (per Core/src/spec/dialect_gwbasic.json):
 *   - line_numbers: required → elke non-empty non-comment regel moet starten met line-number
 *   - sub_function_procedures: not_supported → SUB / FUNCTION / END SUB / END FUNCTION verboden
 *   - select_case: not_supported → SELECT CASE / END SELECT verboden
 *   - do_loop: not_supported → DO / LOOP verboden
 *   - multi_line_if: not_supported → END IF verboden (single-line IF/THEN/ELSE wel toegestaan)
 *
 * Strategie: line-by-line scan. Comments (REM / ') worden gedetecteerd; blanke regels overgeslagen.
 */

import type { ValidationResult } from '../dialect-adapter';

const FORBIDDEN_KEYWORDS_RE = /\b(SUB|FUNCTION|END\s+SUB|END\s+FUNCTION|SELECT\s+CASE|END\s+SELECT|DO|LOOP|END\s+IF)\b/i;
const LINE_NUMBER_RE = /^\s*(\d+)\s+/;

export function validateGwbasic(source: string): ValidationResult {
  const errors: ValidationResult['errors'] = [];
  const lines = source.split(/\r?\n/);

  lines.forEach((raw, idx) => {
    const lineNumber = idx + 1; // 1-based source line
    const trimmed = raw.trim();

    // Skip empty lines
    if (trimmed === '') return;

    // Skip comments — even without line-number (sourcefile convention)
    // GW-BASIC strikt vereist line-numbers ook bij REM, maar veel listings hebben header-comments
    // zonder. We zijn lenient bij '-comments en strict bij REM-na-statement.
    if (trimmed.startsWith("'")) return;

    // Line-number presence check
    if (!LINE_NUMBER_RE.test(raw)) {
      errors.push({
        line: lineNumber,
        message: `GW-BASIC requires a line number at start of each line. Got: "${trimmed.slice(0, 40)}..."`,
      });
    }

    // Strip line-number for keyword-scan
    let body = raw.replace(LINE_NUMBER_RE, '').trim();

    // Strip trailing comments — REM and ' both end the code-portion of a line.
    // (We do NOT match REM inside string literals, but for v0.0.3-Davidoff this is acceptable;
    //  GW-BASIC programs rarely embed REM inside strings.)
    const remIdx = body.search(/\bREM\b/i);
    if (remIdx === 0) return; // entire line is a comment
    if (remIdx > 0) body = body.slice(0, remIdx).trim();

    const apostrophe = body.indexOf("'");
    if (apostrophe === 0) return;
    if (apostrophe > 0) body = body.slice(0, apostrophe).trim();

    if (body === '') return;

    // Strip string-literals "..." so substrings like "Loop " or "SUB" inside output strings
    // don't false-positive as forbidden keywords.
    const codeOnly = body.replace(/"[^"]*"/g, '""');

    const match = codeOnly.match(FORBIDDEN_KEYWORDS_RE);
    if (match) {
      errors.push({
        line: lineNumber,
        message: `GW-BASIC does not support "${match[0].toUpperCase()}". Use GOSUB/RETURN instead of SUB/FUNCTION, IF/THEN single-line instead of block IF, and WHILE/WEND instead of DO/LOOP.`,
      });
    }
  });

  return { ok: errors.length === 0, errors };
}
