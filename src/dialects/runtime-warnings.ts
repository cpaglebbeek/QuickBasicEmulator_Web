/**
 * Runtime-capability warnings — v0.1.2-Letwin
 *
 * Onze dialect-specs zeggen dat GOTO/GOSUB/RETURN in QBasic+QB45 supported zijn (klopt).
 * Maar de QBJS-runtime negeert ze (WARN: ignoring line). Cascade-effect: WEND without WHILE,
 * IF without END IF — terwijl de source eigenlijk valide is.
 *
 * Deze module detecteert classic-BASIC constructs en geeft warnings (geen errors).
 * Source-validatie blijft groen; user weet vooraf dat QBJS gaat falen.
 *
 * Workaround voor user: gebruik X86-runtime (v0.3.0-Chen QB64-PE-fork) zodra beschikbaar.
 */

export interface RuntimeWarning {
  line: number;
  feature: string;
  message: string;
}

// Order matters: ON GOTO/GOSUB before bare GOTO/GOSUB so compound match wins.
const PATTERNS: { re: RegExp; feature: string; message: string }[] = [
  {
    re: /\bON\s+\w+\s+(?:GOTO|GOSUB)\b/i,
    feature: 'ON GOTO/GOSUB',
    message: 'QBJS-runtime does not implement ON x GOTO/GOSUB dispatch.',
  },
  {
    re: /\bGOTO\b/i,
    feature: 'GOTO',
    message: 'QBJS-runtime ignores GOTO statements. Use SUB/FUNCTION + structured loops, or wait for QuickBasicEmulator_X86 (v0.3.0-Chen).',
  },
  {
    re: /\bGOSUB\b/i,
    feature: 'GOSUB',
    message: 'QBJS-runtime ignores GOSUB statements. Use SUB/FUNCTION procedures, or wait for QuickBasicEmulator_X86.',
  },
  {
    re: /\bRETURN\b(?!\s*=)/i,
    feature: 'RETURN',
    message: 'QBJS-runtime ignores standalone RETURN (GOSUB-return). FUNCTION-name = ... assignment is fine.',
  },
];

export function detectRuntimeWarnings(source: string): RuntimeWarning[] {
  const warnings: RuntimeWarning[] = [];
  const lines = source.split(/\r?\n/);
  lines.forEach((raw, idx) => {
    const lineN = idx + 1;
    const trimmed = raw.trim();
    if (trimmed === '' || trimmed.startsWith("'")) return;
    // Strip leading line-number for matching
    const body = trimmed.replace(/^\d+\s+/, '');
    // Skip if entire line is a REM
    if (/^REM\b/i.test(body)) return;
    // Strip trailing apostrophe-comment
    const codeOnly = body.replace(/"[^"]*"/g, '""').replace(/'.*$/, '');
    for (const { re, feature, message } of PATTERNS) {
      if (re.test(codeOnly)) {
        warnings.push({ line: lineN, feature, message });
        break; // one warning per line is enough
      }
    }
  });
  return warnings;
}
