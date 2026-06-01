/**
 * Classic-to-structured transformer tests — v0.2.0-Weiland
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { transformClassicToStructured } from '../src/transform/classic-to-structured';

describe('transform — basic GOSUB → SUB rewrite', () => {
  it('transforms simple GOSUB-RETURN block to SUB', () => {
    const src = 'PRINT "before"\nGOSUB greet\nEND\n\ngreet:\nPRINT "hello"\nRETURN';
    const { transformed, report } = transformClassicToStructured(src);
    expect(report.generated_subs).toEqual(['greet']);
    expect(transformed).toContain('CALL greet');
    expect(transformed).toContain('SUB greet');
    expect(transformed).toContain('END SUB');
    expect(transformed).not.toMatch(/^greet:$/m);
  });

  it('handles multiple GOSUB targets', () => {
    const src = 'GOSUB a\nGOSUB b\nEND\na:\nPRINT 1\nRETURN\nb:\nPRINT 2\nRETURN';
    const { report } = transformClassicToStructured(src);
    expect(report.generated_subs.sort()).toEqual(['a', 'b']);
  });

  it('handles IF ... THEN GOSUB inline', () => {
    const src = 'x = 1\nIF x = 1 THEN GOSUB doit\nEND\ndoit:\nPRINT "yes"\nRETURN';
    const { transformed, report } = transformClassicToStructured(src);
    expect(report.generated_subs).toEqual(['doit']);
    expect(transformed).toContain('IF x = 1 THEN CALL doit');
  });

  it('does NOT transform labels also used as GOTO', () => {
    const src = 'GOTO target\nGOSUB target\ntarget:\nPRINT "x"\nRETURN';
    const { report } = transformClassicToStructured(src);
    expect(report.generated_subs).toEqual([]);
    expect(report.skipped_labels.some((s) => s.name === 'target' && /mixed semantics/i.test(s.reason))).toBe(true);
  });

  it('does NOT transform labels with no clean RETURN', () => {
    const src = 'GOSUB a\nEND\na:\nPRINT 1\nb:\nPRINT 2\nRETURN';
    const { report } = transformClassicToStructured(src);
    // a has no RETURN before label b
    expect(report.generated_subs).not.toContain('a');
  });

  it('preserves comments and blank lines in non-block code', () => {
    const src = "' header\nPRINT 1\n\nGOSUB x\nEND\nx:\nPRINT 2\nRETURN";
    const { transformed } = transformClassicToStructured(src);
    expect(transformed).toContain("' header");
  });
});

describe('transform — reports', () => {
  it('reports total_lines_in/out', () => {
    const src = 'PRINT 1\nEND';
    const { report } = transformClassicToStructured(src);
    expect(report.total_lines_in).toBe(2);
    expect(report.total_lines_out).toBe(2);
  });

  it('reports goto_targets separately', () => {
    const src = 'GOTO finish\nfinish:\nEND';
    const { report } = transformClassicToStructured(src);
    expect(report.goto_targets).toContain('finish');
    expect(report.generated_subs).toEqual([]);
  });

  it('lists skipped reasons', () => {
    const src = 'label1:\nPRINT 1\nRETURN';
    // label1 is not GOSUB target → skipped
    const { report } = transformClassicToStructured(src);
    expect(report.skipped_labels.some((s) => s.name === 'label1')).toBe(true);
  });
});

describe('transform — pass 2: forward GOTO → EXIT (v0.2.1)', () => {
  it('rewrites GOTO label-after-WEND to EXIT WHILE', () => {
    const src = 'i = 0\nWHILE 1\n  IF i = 5 THEN GOTO finished\n  i = i + 1\nWEND\nfinished:\nPRINT "done"';
    const { transformed, report } = transformClassicToStructured(src);
    expect(transformed).toContain('EXIT WHILE');
    expect(transformed).not.toMatch(/GOTO\s+finished/i);
    expect(report.goto_to_exit_rewrites.length).toBe(1);
    expect(report.goto_to_exit_rewrites[0]!.with).toContain('EXIT WHILE');
  });

  it('rewrites GOTO label-after-NEXT to EXIT FOR', () => {
    const src = 'FOR i = 1 TO 10\n  IF i = 5 THEN GOTO done\nNEXT\ndone:\nPRINT "x"';
    const { transformed, report } = transformClassicToStructured(src);
    expect(transformed).toContain('EXIT FOR');
    expect(report.goto_to_exit_rewrites.length).toBe(1);
  });

  it('rewrites GOTO label-after-LOOP to EXIT DO', () => {
    const src = 'DO\n  IF cond THEN GOTO leave\nLOOP\nleave:\nEND';
    const { transformed, report } = transformClassicToStructured(src);
    expect(transformed).toContain('EXIT DO');
    expect(report.goto_to_exit_rewrites.length).toBe(1);
  });

  it('does NOT rewrite backward GOTO (label before goto)', () => {
    const src = 'start:\nPRINT 1\nWEND\nGOTO start';
    const { transformed, report } = transformClassicToStructured(src);
    expect(transformed).toMatch(/GOTO\s+start/i);
    expect(report.goto_to_exit_rewrites.length).toBe(0);
  });

  it('does NOT rewrite GOTO to label not after WEND/NEXT/LOOP', () => {
    const src = 'GOTO middle\nPRINT 1\nmiddle:\nPRINT 2';
    const { transformed, report } = transformClassicToStructured(src);
    expect(transformed).toMatch(/GOTO\s+middle/i);
    expect(report.goto_to_exit_rewrites.length).toBe(0);
  });

  it('does NOT match GOTO inside string literal', () => {
    const src = 'WHILE 1\n  PRINT "GOTO eindewhile"\nWEND\neindewhile:';
    const { report } = transformClassicToStructured(src);
    // The PRINT contains "GOTO eindewhile" but it's a string literal — must not rewrite
    expect(report.goto_to_exit_rewrites.length).toBe(0);
  });
});

describe('transform — Core sample corpus', () => {
  const samples = '/Users/christian/Documents/Gemini_Projects/QuickBasicEmulator_Core/tests/samples';
  it('procedures_gwbasic.bas: transforms Double subroutine', () => {
    const src = readFileSync(`${samples}/procedures_gwbasic.bas`, 'utf-8');
    const { report } = transformClassicToStructured(src);
    // GW-BASIC uses line-numbers for GOSUB targets, not symbolic labels — transformer skips
    // because label-style "100:" is not the pure-label pattern. Output should be unchanged.
    expect(report.generated_subs).toEqual([]);
  });

  it('hello_qb45.bas: no GOSUB → no transform', () => {
    const src = readFileSync(`${samples}/hello_qb45.bas`, 'utf-8');
    const { report } = transformClassicToStructured(src);
    expect(report.generated_subs).toEqual([]);
  });
});

describe('transform — K2026C.BAS real-world (optional)', () => {
  const path = '/Users/christian/Downloads/K2026C.BAS';
  const exists = existsSync(path);

  it.skipIf(!exists)('generates SUBs for GOSUB targets scherm2/printer/file (if present)', () => {
    const src = readFileSync(path, 'latin1');
    const { report } = transformClassicToStructured(src);
    // Theo's K2026 has GOSUB scherm2/printer/file/menustart/scherm
    expect(report.generated_subs.length).toBeGreaterThanOrEqual(1);
    // Report should also list GOTO targets that remain untouched
    expect(report.goto_targets.length).toBeGreaterThanOrEqual(1);
  });

  it.skipIf(!exists)('still reports remaining GOTO as untouched', () => {
    const src = readFileSync(path, 'latin1');
    const { report, transformed } = transformClassicToStructured(src);
    // GOTO remains in transformed output (we don't restructure it)
    expect(transformed).toMatch(/\bGOTO\b/);
    expect(report.goto_targets.length).toBeGreaterThan(0);
  });
});
