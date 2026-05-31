/**
 * Dialect-mode tests — v0.0.3-Davidoff
 *
 * Pre-flight validators per dialect, met focus op de e2e hello-world voor alle drie dialecten
 * (regressie-test om dialect-drift te detecteren tussen Core spec + Web validator).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { validateGwbasic } from '../src/dialects/gwbasic-mode';
import { validateQbasic } from '../src/dialects/qbasic-mode';
import { validateQb45 } from '../src/dialects/qb45-mode';

const CORE_SAMPLES = resolve(__dirname, '../../QuickBasicEmulator_Core/tests/samples');

function readSample(name: string): string {
  return readFileSync(resolve(CORE_SAMPLES, name), 'utf-8');
}

describe('e2e hello-world per dialect (validates Core sample-corpus)', () => {
  it('GW-BASIC hello passes GW validator', () => {
    const source = readSample('hello_gwbasic.bas');
    const r = validateGwbasic(source);
    expect(r.ok, JSON.stringify(r.errors)).toBe(true);
  });

  it('QBasic hello passes QBasic validator', () => {
    const source = readSample('hello_qbasic.bas');
    const r = validateQbasic(source);
    expect(r.ok, JSON.stringify(r.errors)).toBe(true);
  });

  it('QB45 hello passes QB45 validator', () => {
    const source = readSample('hello_qb45.bas');
    const r = validateQb45(source);
    expect(r.ok).toBe(true);
  });
});

describe('GW-BASIC validator catches forbidden constructs', () => {
  it('rejects missing line numbers', () => {
    const r = validateGwbasic('PRINT "no line number"');
    expect(r.ok).toBe(false);
    expect(r.errors[0]?.message).toMatch(/line number/i);
  });

  it('rejects SUB / END SUB', () => {
    const source = '10 GOSUB 100\n100 SUB Test\n110 END SUB';
    const r = validateGwbasic(source);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /SUB/i.test(e.message))).toBe(true);
  });

  it('rejects FUNCTION', () => {
    const source = '10 FUNCTION X\n20 END FUNCTION';
    const r = validateGwbasic(source);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /FUNCTION/i.test(e.message))).toBe(true);
  });

  it('rejects DO/LOOP', () => {
    const source = '10 DO\n20 LOOP';
    const r = validateGwbasic(source);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /DO/i.test(e.message))).toBe(true);
  });

  it('rejects SELECT CASE', () => {
    const source = '10 SELECT CASE X\n20 END SELECT';
    const r = validateGwbasic(source);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /SELECT/i.test(e.message))).toBe(true);
  });

  it('accepts apostrophe header-comment without line-number', () => {
    const source = "' Header comment\n10 PRINT \"OK\"";
    const r = validateGwbasic(source);
    expect(r.ok).toBe(true);
  });

  it('accepts valid loops sample', () => {
    const source = readSample('loops_gwbasic.bas');
    const r = validateGwbasic(source);
    expect(r.ok, JSON.stringify(r.errors)).toBe(true);
  });

  it('accepts valid conditionals sample (single-line IF)', () => {
    const source = readSample('conditionals_gwbasic.bas');
    const r = validateGwbasic(source);
    expect(r.ok, JSON.stringify(r.errors)).toBe(true);
  });

  it('accepts GOSUB-style procedures (no SUB/FUNCTION)', () => {
    const source = readSample('procedures_gwbasic.bas');
    const r = validateGwbasic(source);
    expect(r.ok, JSON.stringify(r.errors)).toBe(true);
  });
});

describe('QBasic validator catches QB45-only constructs', () => {
  it('rejects TYPE block', () => {
    const source = "TYPE Person\n  name AS STRING\nEND TYPE";
    const r = validateQbasic(source);
    expect(r.ok).toBe(false);
    expect(r.errors[0]?.message).toMatch(/TYPE/);
  });

  it('rejects REDIM PRESERVE', () => {
    const r = validateQbasic('REDIM PRESERVE a(10)');
    expect(r.ok).toBe(false);
    expect(r.errors[0]?.message).toMatch(/PRESERVE/i);
  });

  it('rejects metacommand $DYNAMIC', () => {
    const r = validateQbasic("' $DYNAMIC");
    expect(r.ok).toBe(false);
    expect(r.errors[0]?.message).toMatch(/metacommand/i);
  });

  it('accepts QBasic loops + conditionals + procedures samples', () => {
    for (const f of ['loops_qbasic.bas', 'conditionals_qbasic.bas', 'procedures_qbasic.bas', 'arrays_qbasic.bas']) {
      const r = validateQbasic(readSample(f));
      expect(r.ok, `${f}: ${JSON.stringify(r.errors)}`).toBe(true);
    }
  });
});

describe('QB45 validator (pass-through)', () => {
  it('accepts everything our Core corpus has', () => {
    for (const f of ['hello_qb45.bas', 'loops_qb45.bas', 'conditionals_qb45.bas', 'procedures_qb45.bas', 'arrays_qb45.bas']) {
      const r = validateQb45(readSample(f));
      expect(r.ok).toBe(true);
    }
  });

  it('does not throw on empty source', () => {
    expect(() => validateQb45('')).not.toThrow();
  });
});
