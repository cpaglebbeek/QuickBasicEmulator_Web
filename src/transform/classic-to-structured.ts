/**
 * Classic-to-structured BASIC transformer — v0.2.0-Weiland
 *
 * Doel: maak K2026C-stijl programs draaibaar in QBJS door GOSUB/RETURN-blocks
 * automatisch te herschrijven naar SUB-procedures.
 *
 * Wat het WEL doet:
 *  - Detect `label:` definities (een pure label op een eigen regel)
 *  - Detect GOSUB-uses: standalone `GOSUB label` of `IF ... THEN GOSUB label`
 *  - Voor elke label die ALLEEN als GOSUB-target wordt gebruikt (niet als GOTO):
 *    - Extracteer de block van `label:` tot eerste `RETURN`
 *    - Genereer `SUB label\n<block>\nEND SUB` aan het einde van de source
 *    - Vervang `GOSUB label` met `CALL label` (impliciete sub-call werkt ook in QB)
 *  - Behoudt origineel commentaar en blanke regels
 *
 * Wat het NIET doet (uit scope v0.2.0 eerste versie):
 *  - GOTO transformeren (vereist control-flow-analyse + loop-restructure)
 *  - Labels die zowel GOSUB- als GOTO-target zijn (gemengde semantiek, te risky)
 *  - Nested SUB definitions in QBasic-onmogelijke posities
 *  - Recursieve GOSUB (compile-time werkt; runtime QBJS doet dat al via SUB-calls)
 *
 * Output: { transformed: string, report: TransformReport }
 *  - report bevat lijst van gegenereerde SUBs + lijst van niet-getransformeerde labels
 */

export interface TransformReport {
  generated_subs: string[];
  skipped_labels: { name: string; reason: string }[];
  goto_targets: string[];
  goto_to_exit_rewrites: { line: number; replaced: string; with: string }[];
  total_lines_in: number;
  total_lines_out: number;
}

export interface TransformResult {
  transformed: string;
  report: TransformReport;
}

const LABEL_RE = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*$/;
const GOSUB_RE = /\bGOSUB\s+([A-Za-z_][A-Za-z0-9_]*)\b/gi;
const GOTO_RE = /\bGOTO\s+([A-Za-z_][A-Za-z0-9_]*)\b/gi;
const RETURN_RE = /^\s*RETURN\s*$/i;

function isCommentLine(line: string): boolean {
  const t = line.trim();
  return t === '' || t.startsWith("'") || /^REM\b/i.test(t);
}

/** Find label definition lines (label_name → 0-based source-index). */
function findLabels(lines: string[]): Map<string, number> {
  const labels = new Map<string, number>();
  for (let i = 0; i < lines.length; i++) {
    const m = LABEL_RE.exec(lines[i] ?? '');
    if (m && m[1]) labels.set(m[1], i);
  }
  return labels;
}

/** Collect all label names used as GOSUB target and GOTO target. */
function findReferences(lines: string[]): { gosubTargets: Set<string>; gotoTargets: Set<string> } {
  const gosubTargets = new Set<string>();
  const gotoTargets = new Set<string>();
  for (const raw of lines) {
    if (isCommentLine(raw)) continue;
    const code = raw.replace(/"[^"]*"/g, '""').replace(/'.*$/, '');
    let m: RegExpExecArray | null;
    GOSUB_RE.lastIndex = 0;
    while ((m = GOSUB_RE.exec(code)) !== null) {
      if (m[1]) gosubTargets.add(m[1]);
    }
    GOTO_RE.lastIndex = 0;
    while ((m = GOTO_RE.exec(code)) !== null) {
      if (m[1]) gotoTargets.add(m[1]);
    }
  }
  return { gosubTargets, gotoTargets };
}

/** Find the end of a GOSUB-block: first standalone RETURN after the label. */
function findBlockEnd(lines: string[], startIdx: number): number {
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (RETURN_RE.test(lines[i] ?? '')) return i;
    const next = LABEL_RE.exec(lines[i] ?? '');
    if (next) return -1; // hit another label before RETURN — too complex for v0.2.0
  }
  return -1;
}

/**
 * Pass 2: rewrite forward GOTO labelname where the label sits IMMEDIATELY after the
 * end of an enclosing WHILE/FOR/DO loop. In that case the GOTO is a "break" pattern
 * and can be safely replaced with EXIT WHILE / EXIT FOR / EXIT DO.
 *
 * Returns mutated copy of lines + list of rewrites for the report.
 */
function rewriteForwardGotoToExit(
  lines: string[],
  labels: Map<string, number>
): { lines: string[]; rewrites: TransformReport['goto_to_exit_rewrites'] } {
  const rewrites: TransformReport['goto_to_exit_rewrites'] = [];
  const out = [...lines];

  // For each label, look backward from label-line skipping comments/blanks to find
  // the previous code line. If it is WEND/NEXT/LOOP, we know the label sits after a loop.
  const labelLoopType = new Map<string, 'WHILE' | 'FOR' | 'DO'>();
  for (const [name, labelIdx] of labels) {
    for (let i = labelIdx - 1; i >= 0; i--) {
      const t = (out[i] ?? '').trim();
      if (t === '' || t.startsWith("'") || /^REM\b/i.test(t)) continue;
      if (/^WEND\s*$/i.test(t)) labelLoopType.set(name, 'WHILE');
      else if (/^NEXT(\s|\b)/i.test(t)) labelLoopType.set(name, 'FOR');
      else if (/^LOOP(\s|$|\b)/i.test(t)) labelLoopType.set(name, 'DO');
      break;
    }
  }
  if (labelLoopType.size === 0) return { lines: out, rewrites };

  // Now rewrite GOTO label uses (must be FORWARD: GOTO line < label line).
  for (let i = 0; i < out.length; i++) {
    const raw = out[i] ?? '';
    if (isCommentLine(raw)) continue;
    const code = raw.replace(/"[^"]*"/g, (m) => '"' + '_'.repeat(m.length - 2) + '"');
    GOTO_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    let modified = raw;
    while ((m = GOTO_RE.exec(code)) !== null) {
      const name = m[1];
      if (!name) continue;
      const labelIdx = labels.get(name);
      const loopType = labelLoopType.get(name);
      if (labelIdx === undefined || loopType === undefined) continue;
      if (i >= labelIdx) continue; // not forward
      const exitStmt = `EXIT ${loopType}`;
      // Detect "IF ... GOTO label" shorthand (no THEN). QBasic accepts that for GOTO
      // but EXIT FOR/WHILE/DO requires THEN. Insert THEN to keep semantics valid.
      const ifNoThenRe = new RegExp(`(\\bIF\\b[^"]*?)\\s+GOTO\\s+${name}\\b(?![^]*?\\bTHEN\\b)`, 'i');
      const gotoRe = new RegExp(`\\bGOTO\\s+${name}\\b`, 'i');
      let replaced: string;
      if (ifNoThenRe.test(modified)) {
        replaced = modified.replace(ifNoThenRe, `$1 THEN ${exitStmt}`);
      } else {
        replaced = modified.replace(gotoRe, exitStmt);
      }
      if (replaced !== modified) {
        rewrites.push({ line: i + 1, replaced: modified.trim(), with: replaced.trim() });
        modified = replaced;
      }
    }
    out[i] = modified;
  }
  return { lines: out, rewrites };
}

export function transformClassicToStructured(source: string): TransformResult {
  const lines = source.split(/\r?\n/);
  const labels = findLabels(lines);
  const { gosubTargets, gotoTargets } = findReferences(lines);

  // Decide which labels are GOSUB-only candidates (safe to transform).
  const candidates: { name: string; startIdx: number; endIdx: number }[] = [];
  const skipped: TransformReport['skipped_labels'] = [];

  for (const [name, idx] of labels) {
    if (!gosubTargets.has(name)) {
      skipped.push({ name, reason: 'not used as GOSUB target' });
      continue;
    }
    if (gotoTargets.has(name)) {
      skipped.push({ name, reason: 'also used as GOTO target — mixed semantics' });
      continue;
    }
    const endIdx = findBlockEnd(lines, idx);
    if (endIdx === -1) {
      skipped.push({ name, reason: 'no clean RETURN before next label' });
      continue;
    }
    candidates.push({ name, startIdx: idx, endIdx });
  }

  // Build output: copy lines but replace candidate-blocks with nothing,
  // and replace GOSUB calls with CALL calls in remaining lines.
  // Then append SUB definitions at the end.
  const removeMask: boolean[] = new Array(lines.length).fill(false);
  const subDefs: string[] = [];
  const generatedSubs: string[] = [];

  for (const c of candidates) {
    // Mark label-line through RETURN-line for removal from main flow.
    for (let i = c.startIdx; i <= c.endIdx; i++) removeMask[i] = true;
    // Build SUB definition: lines between label and RETURN (exclusive).
    const body = lines.slice(c.startIdx + 1, c.endIdx);
    subDefs.push(`\nSUB ${c.name}`);
    for (const b of body) subDefs.push(b);
    subDefs.push(`END SUB`);
    generatedSubs.push(c.name);
  }

  const candidateNames = new Set(generatedSubs);
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (removeMask[i]) continue;
    let line = lines[i] ?? '';
    if (!isCommentLine(line) && candidateNames.size > 0) {
      // Replace GOSUB name → CALL name only for transformed labels.
      line = line.replace(GOSUB_RE, (full, name) => candidateNames.has(name) ? `CALL ${name}` : full);
    }
    out.push(line);
  }

  // Append generated SUBs.
  out.push(...subDefs);

  // Pass 2: forward-GOTO → EXIT-statement rewrite.
  const { lines: gotoFixed, rewrites } = rewriteForwardGotoToExit(out, findLabels(out));

  return {
    transformed: gotoFixed.join('\n'),
    report: {
      generated_subs: generatedSubs,
      skipped_labels: skipped,
      goto_targets: Array.from(gotoTargets),
      goto_to_exit_rewrites: rewrites,
      total_lines_in: lines.length,
      total_lines_out: gotoFixed.length,
    },
  };
}
