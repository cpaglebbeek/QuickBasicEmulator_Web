/**
 * Dialect adapter — v0.0.3-Davidoff
 *
 * Bridge tussen Core's canonieke dialect-spec JSON en QBJS-runtime.
 * Verantwoordelijk voor:
 *  1. Active dialect-state bijhouden
 *  2. Pre-flight validation van `.bas`-input tegen actieve dialect
 *  3. QBJS-engine triggeren met geaccepteerde source
 *
 * QBJS zelf is "QBasic + QB64-compat" — daarom:
 *  - QBasic-modus en QB45-modus = pass-through naar QBJS
 *  - GW-BASIC-modus = pre-flight checker die GW-only constraints handhaaft
 *    (line-numbers required + geen SUB/FUNCTION/SELECT/DO)
 */

import gwSpec from '@cpaglebbeek/quickbasic-emulator-core/src/spec/dialect_gwbasic.json' assert { type: 'json' };
import qbSpec from '@cpaglebbeek/quickbasic-emulator-core/src/spec/dialect_qbasic.json' assert { type: 'json' };
import qb45Spec from '@cpaglebbeek/quickbasic-emulator-core/src/spec/dialect_qb45.json' assert { type: 'json' };

import { validateGwbasic } from './dialects/gwbasic-mode';
import { validateQbasic } from './dialects/qbasic-mode';
import { validateQb45 } from './dialects/qb45-mode';

export type Dialect = 'gwbasic' | 'qbasic' | 'qb45';

export interface ValidationResult {
  ok: boolean;
  errors: { line: number; message: string }[];
}

export interface DialectSpec {
  dialect: Dialect;
  description: string;
  features: Record<string, string>;
  statements: Record<string, unknown>;
  builtin_functions: Record<string, unknown>;
}

const specs: Record<Dialect, DialectSpec> = {
  gwbasic: gwSpec as DialectSpec,
  qbasic: qbSpec as DialectSpec,
  qb45: qb45Spec as DialectSpec,
};

let activeDialect: Dialect = 'qb45';

export function setDialect(d: Dialect): void {
  activeDialect = d;
}

export function getDialect(): Dialect {
  return activeDialect;
}

export function getSpec(d: Dialect = activeDialect): DialectSpec {
  return specs[d];
}

/**
 * Pre-flight validate source against active dialect.
 * Returns ok=true if source is acceptable; otherwise list of errors.
 */
export function validate(source: string, dialect: Dialect = activeDialect): ValidationResult {
  switch (dialect) {
    case 'gwbasic': return validateGwbasic(source);
    case 'qbasic':  return validateQbasic(source);
    case 'qb45':    return validateQb45(source);
  }
}

/**
 * Pre-flight + execute. Returns false if validation rejected.
 * QBJS-engine call is een placeholder until the IDE wire-up in index.html.
 */
export function runProgram(source: string, dialect: Dialect = activeDialect): ValidationResult {
  const result = validate(source, dialect);
  if (!result.ok) return result;

  // QBJS expects window.QB to be loaded by index.html's <script> tags.
  // In v0.0.3 we only set up the data-flow; full integration in v0.0.4+.
  if (typeof window !== 'undefined' && (window as any).QB?.run) {
    (window as any).QB.run(source);
  }
  return result;
}
