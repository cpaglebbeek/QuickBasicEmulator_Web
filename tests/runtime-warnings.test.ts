/**
 * Runtime-warnings tests — v0.1.2-Letwin
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { detectRuntimeWarnings } from '../src/dialects/runtime-warnings';

describe('detectRuntimeWarnings — basic', () => {
  it('returns empty for source without unstructured constructs', () => {
    const src = 'PRINT "hi"\nFOR i = 1 TO 3\n  PRINT i\nNEXT\nEND';
    expect(detectRuntimeWarnings(src)).toEqual([]);
  });

  it('detects GOTO', () => {
    const w = detectRuntimeWarnings('10 GOTO 30\n20 PRINT "skip"\n30 END');
    expect(w.length).toBe(1);
    expect(w[0]!.feature).toBe('GOTO');
    expect(w[0]!.line).toBe(1);
  });

  it('detects GOSUB and RETURN separately', () => {
    const src = 'GOSUB Sub1\nEND\nSub1:\nPRINT "in sub"\nRETURN';
    const w = detectRuntimeWarnings(src);
    const features = w.map((x) => x.feature);
    expect(features).toContain('GOSUB');
    expect(features).toContain('RETURN');
  });

  it('detects ON x GOTO/GOSUB', () => {
    const w = detectRuntimeWarnings('ON x GOTO L1, L2, L3');
    expect(w.length).toBe(1);
    expect(w[0]!.feature).toBe('ON GOTO/GOSUB');
  });
});

describe('detectRuntimeWarnings — false-positive avoidance', () => {
  it('does NOT warn on GOTO inside a string literal', () => {
    expect(detectRuntimeWarnings('PRINT "use GOTO here"')).toEqual([]);
  });

  it('does NOT warn on REM line containing GOTO', () => {
    expect(detectRuntimeWarnings('REM avoid GOTO')).toEqual([]);
    expect(detectRuntimeWarnings("' avoid GOTO")).toEqual([]);
  });

  it('does NOT warn on FUNCTION-return assignment (RETURN = something)', () => {
    // standalone RETURN flagged, but "FUNCTION-name = expr" doesn't match RETURN pattern
    const w = detectRuntimeWarnings('Doubled% = n% * 2');
    expect(w).toEqual([]);
  });

  it('handles line-numbered GW-BASIC style', () => {
    const w = detectRuntimeWarnings('30 GOTO eindewhile');
    expect(w.length).toBe(1);
    expect(w[0]!.feature).toBe('GOTO');
  });
});

describe('detectRuntimeWarnings — K2026C.BAS real-world fixture (optional)', () => {
  const path = '/Users/christian/Downloads/K2026C.BAS';
  const exists = existsSync(path);

  it.skipIf(!exists)('detects runtime-warnings (GOTO+GOSUB+RETURN) in Theo\'s calendar', () => {
    const src = readFileSync(path, 'latin1');
    const w = detectRuntimeWarnings(src);
    expect(w.length).toBeGreaterThanOrEqual(8); // matches QBJS console output: 1 GOTO + 3 GOSUB + 4 RETURN
    const features = new Set(w.map((x) => x.feature));
    expect(features.has('GOTO')).toBe(true);
    expect(features.has('GOSUB')).toBe(true);
    expect(features.has('RETURN')).toBe(true);
  });
});

describe('detectRuntimeWarnings — Core test-suite samples should be clean', () => {
  const samples = resolve(__dirname, '../../QuickBasicEmulator_Core/tests/samples');
  function readSample(name: string): string {
    return readFileSync(resolve(samples, name), 'utf-8');
  }
  it('hello_qb45 has no runtime-warnings', () => {
    expect(detectRuntimeWarnings(readSample('hello_qb45.bas'))).toEqual([]);
  });
  it('procedures_qb45 (FUNCTION-based) has no runtime-warnings', () => {
    expect(detectRuntimeWarnings(readSample('procedures_qb45.bas'))).toEqual([]);
  });
  it('procedures_gwbasic (GOSUB-based) flags GOSUB', () => {
    const w = detectRuntimeWarnings(readSample('procedures_gwbasic.bas'));
    expect(w.some((x) => x.feature === 'GOSUB')).toBe(true);
  });
});
