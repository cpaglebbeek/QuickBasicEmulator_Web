/**
 * QuickBasicEmulator_Web — entry point
 *
 * v0.1.1-Letwin: voeg .bas file-loader toe (FileReader + drag-drop + auto-dialect-detect).
 *
 * v0.0.3-Davidoff: vendored QBJS-fork + dialect-adapter UI shell.
 *  - Dialect-switcher activeert pre-flight validator
 *  - "Run"-button opent QBJS IDE met source ge-encoded in URL (QBJS-conventie)
 */

import version from '../version.json';
import { compress } from 'lzutf8';
import { setDialect, validate, getSpec, type Dialect } from './dialect-adapter';
import { detectRuntimeWarnings } from './dialects/runtime-warnings';

console.log(`QuickBasicEmulator_Web v${version.version}-${version.codename} (${version.released})`);

const $dialect = document.getElementById('dialect') as HTMLSelectElement | null;
const $source = document.getElementById('source') as HTMLTextAreaElement | null;
const $status = document.getElementById('status') as HTMLDivElement | null;
const $validateBtn = document.getElementById('validate-btn') as HTMLButtonElement | null;
const $runBtn = document.getElementById('run-btn') as HTMLButtonElement | null;
const $info = document.getElementById('dialect-info') as HTMLSpanElement | null;
const $fileInput = document.getElementById('file-input') as HTMLInputElement | null;
const $clearBtn = document.getElementById('clear-btn') as HTMLButtonElement | null;
const $fileName = document.getElementById('file-name') as HTMLSpanElement | null;

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
    let html = `<strong>${d.toUpperCase()}</strong>: source accepted (${source.split(/\r?\n/).length} lines).`;
    const warns = detectRuntimeWarnings(source);
    if (warns.length > 0) {
      const counts = warns.reduce<Record<string, number>>((acc, w) => { acc[w.feature] = (acc[w.feature] || 0) + 1; return acc; }, {});
      const summary = Object.entries(counts).map(([k, v]) => `${k}×${v}`).join(', ');
      html += `<br><br>⚠ <strong>QBJS-runtime warning (${warns.length} lines: ${summary}):</strong> ${escapeHtml(warns[0]!.message)}`;
    }
    showStatus(html, 'ok');
    return true;
  }
  const items = res.errors.map((e) => `<li>Line ${e.line}: ${escapeHtml(e.message)}</li>`).join('');
  showStatus(`<strong>${d.toUpperCase()}</strong> rejected source:<ul>${items}</ul>`, 'err');
  return false;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}

function runProgram(autoRun: boolean): void {
  if (!validateNow()) return;
  const source = $source?.value || '';
  // Per qbjs-ide.js:104 + :483: code is lzutf8-compressed + base64 in URL hash, RAW (no encodeURIComponent).
  // mode=auto auto-runs; without mode loads the IDE with source ready.
  const b64 = compress(source, { outputEncoding: 'Base64' }) as string;
  const modePart = autoRun ? 'mode=auto&' : '';
  const ideUrl = `./vendor/qbjs/#${modePart}code=${b64}`;
  window.open(ideUrl, '_blank');
  showStatus(
    `<strong>${currentDialect().toUpperCase()}</strong>: QBJS IDE opened ${autoRun ? '(auto-run)' : '(ready to Run)'} with ${source.length}-byte source.`,
    'info'
  );
}

/** Auto-detect dialect from filename hints. Returns null if no hint found. */
function detectDialectFromFilename(name: string): Dialect | null {
  const lc = name.toLowerCase();
  if (lc.includes('_gwbasic') || lc.includes('-gwbasic') || lc.includes('gwbasic.')) return 'gwbasic';
  if (lc.includes('_qb45') || lc.includes('-qb45') || lc.includes('qb45.')) return 'qb45';
  if (lc.includes('_qbasic') || lc.includes('-qbasic') || lc.includes('qbasic.')) return 'qbasic';
  return null;
}

async function loadFile(file: File): Promise<void> {
  if (!$source) return;
  try {
    const text = await file.text();
    $source.value = text;
    if ($fileName) $fileName.textContent = `loaded: ${file.name} (${file.size.toLocaleString()} bytes)`;
    const hinted = detectDialectFromFilename(file.name);
    if (hinted && $dialect) {
      $dialect.value = hinted;
      refreshInfo();
      showStatus(
        `Loaded <code>${escapeHtml(file.name)}</code> — dialect auto-detected as <strong>${hinted.toUpperCase()}</strong>.`,
        'info'
      );
    } else {
      showStatus(
        `Loaded <code>${escapeHtml(file.name)}</code> — using current dialect <strong>${currentDialect().toUpperCase()}</strong>. Switch above if needed.`,
        'info'
      );
    }
  } catch (e) {
    showStatus(`Failed to load file: ${escapeHtml(String(e))}`, 'err');
  }
}

$fileInput?.addEventListener('change', () => {
  const f = $fileInput.files?.[0];
  if (f) loadFile(f);
});

$clearBtn?.addEventListener('click', () => {
  if ($source) $source.value = '';
  if ($fileInput) $fileInput.value = '';
  if ($fileName) $fileName.textContent = 'no file — paste source below or drop a .bas file on the textarea';
  showStatus('Cleared.', 'info');
});

// Drag-drop on textarea
$source?.addEventListener('dragover', (e) => {
  e.preventDefault();
  $source.classList.add('dragover');
});
$source?.addEventListener('dragleave', () => $source.classList.remove('dragover'));
$source?.addEventListener('drop', (e) => {
  e.preventDefault();
  $source.classList.remove('dragover');
  const f = e.dataTransfer?.files?.[0];
  if (f) loadFile(f);
});

$dialect?.addEventListener('change', refreshInfo);
$validateBtn?.addEventListener('click', () => { validateNow(); });
$runBtn?.addEventListener('click', () => { runProgram(true); });

refreshInfo();
