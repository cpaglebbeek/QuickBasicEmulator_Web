/**
 * Runtime-capability warnings — v0.2.0-Weiland
 *
 * Sinds v0.2.0 wordt de QBJS-feature-matrix opgehaald uit Core:
 *   @cpaglebbeek/quickbasic-emulator-core/src/spec/runtime_capability_qbjs.json
 *
 * De PATTERNS-array hieronder is gegeneerd uit die matrix (alle statements met
 * supported=none of partial). Hierdoor groeit dialect-coverage automatisch mee
 * met Core-updates zonder dubbele bron-van-waarheid.
 */

import capability from '@cpaglebbeek/quickbasic-emulator-core/src/spec/runtime_capability_qbjs.json' assert { type: 'json' };

export interface RuntimeWarning {
  line: number;
  feature: string;
  message: string;
}

// Build PATTERNS from the Core runtime-capability matrix. Order matters:
// compound matches (ON GOTO/GOSUB) before bare ones.
type CapStmt = { supported: 'full' | 'partial' | 'none'; qbjs_behavior?: string; workaround?: string; notes?: string };
const stmts = capability.statements as Record<string, CapStmt>;

function escapeRegExpWord(name: string): string {
  return name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const buildPattern = (name: string, partial: boolean): RegExp => {
  if (name === 'ON') return /\bON\s+\w+\s+(?:GOTO|GOSUB)\b/i;
  if (name === 'RETURN' && partial) return /\bRETURN\b(?!\s*=)/i; // partial: standalone only
  const escaped = name.split(/\s+/).map(escapeRegExpWord).join('\\s+');
  return new RegExp(`\\b${escaped}\\b`, 'i');
};

const CAP_GAPS: { re: RegExp; feature: string; message: string }[] = (() => {
  const compound = ['ON']; // multi-word matches first
  const order = [...compound, ...Object.keys(stmts).filter((k) => !compound.includes(k))];
  const out: { re: RegExp; feature: string; message: string }[] = [];
  for (const name of order) {
    const s = stmts[name];
    if (!s) continue;
    if (s.supported === 'full') continue;
    const partial = s.supported === 'partial';
    const verb = partial ? 'partial support' : 'ignored';
    const workaround = s.workaround ? ` ${s.workaround}` : '';
    const note = s.notes ? ` (${s.notes})` : '';
    out.push({
      re: buildPattern(name, partial),
      feature: name === 'ON' ? 'ON GOTO/GOSUB' : name,
      message: `QBJS-runtime: ${name} ${verb}${note}.${workaround}`,
    });
  }
  return out;
})();

// Backward-compat alias for existing tests/imports.
const PATTERNS = CAP_GAPS;

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
