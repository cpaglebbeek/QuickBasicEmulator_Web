/**
 * QuickBasicEmulator_Web — entry point
 *
 * v0.0.3-Davidoff: vendored QBJS-fork + dialect-adapter UI shell.
 *  - Dialect-switcher activeert pre-flight validator
 *  - "Run"-button opent QBJS IDE met source ge-encoded in URL (QBJS-conventie)
 *  - In v0.0.4-Whitten: inline-embed QBJS i.p.v. nieuwe tab
 */

import version from '../version.json';
import { setDialect, validate, getSpec, type Dialect } from './dialect-adapter';

console.log(`QuickBasicEmulator_Web v${version.version}-${version.codename} (${version.released})`);

const $dialect = document.getElementById('dialect') as HTMLSelectElement | null;
const $source = document.getElementById('source') as HTMLTextAreaElement | null;
const $status = document.getElementById('status') as HTMLDivElement | null;
const $validateBtn = document.getElementById('validate-btn') as HTMLButtonElement | null;
const $runBtn = document.getElementById('run-btn') as HTMLButtonElement | null;
const $info = document.getElementById('dialect-info') as HTMLSpanElement | null;

function currentDialect(): Dialect {
  return ($dialect?.value || 'qb45') as Dialect;
}

function showStatus(html: string, cls: 'ok' | 'err' | 'info'): void {
  if (!$status) return;
  $status.className = cls;
  $status.innerHTML = html;
}

function refreshInfo(): void {
  const d = currentDialect();
  setDialect(d);
  const spec = getSpec(d);
  const stmtCount = Object.keys(spec.statements).length;
  const fnCount = Object.keys(spec.builtin_functions).length;
  if ($info) {
    $info.textContent = `${spec.description} — ${stmtCount} statements, ${fnCount} builtins`;
  }
}

function validateNow(): boolean {
  const source = $source?.value || '';
  const d = currentDialect();
  setDialect(d);
  const res = validate(source, d);
  if (res.ok) {
    showStatus(`<strong>${d.toUpperCase()}</strong>: source accepted (${source.split(/\r?\n/).length} lines).`, 'ok');
    return true;
  }
  const items = res.errors.map((e) => `<li>Line ${e.line}: ${escapeHtml(e.message)}</li>`).join('');
  showStatus(`<strong>${d.toUpperCase()}</strong> rejected source:<ul>${items}</ul>`, 'err');
  return false;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}

function runProgram(): void {
  if (!validateNow()) return;
  const source = $source?.value || '';
  // QBJS shareable URL convention: lzutf8+base64 encoded. For v0.0.3 we just open the IDE
  // and let the user paste; full URL-encoding integration in v0.0.4-Whitten.
  const ideUrl = './vendor/qbjs/';
  try {
    localStorage.setItem('qbe_pending_source', source);
    localStorage.setItem('qbe_pending_dialect', currentDialect());
  } catch { /* ignore quota */ }
  window.open(ideUrl, '_blank');
  showStatus(`<strong>${currentDialect().toUpperCase()}</strong>: validated. QBJS IDE opened in new tab — paste source there for v0.0.3.`, 'info');
}

$dialect?.addEventListener('change', refreshInfo);
$validateBtn?.addEventListener('click', () => { validateNow(); });
$runBtn?.addEventListener('click', () => { runProgram(); });

refreshInfo();
