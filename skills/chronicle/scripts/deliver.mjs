#!/usr/bin/env node
/**
 * Chronicle Design System - One-Stop Delivery Command
 * Executes: Compile -> Quality Gate Lint -> High-Fidelity Export (Long PNG / PDF)
 * Supports --format page|slides|resume
 *
 * Usage: node deliver.mjs <input.md> [annotations.json] [--format page|slides|resume] [--png] [--pdf] [--theme light|dark] [--out-dir <dir>]
 */

import { execFileSync } from 'child_process';
import { resolve, dirname, basename, extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const flags = { outDir: 'output', theme: 'light' };
const positional = [];

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg.startsWith('--')) {
    const key = arg.slice(2);
    const next = args[i + 1];
    if (next && !next.startsWith('--')) {
      flags[key] = next;
      i++;
    } else {
      flags[key] = true;
    }
  } else {
    positional.push(arg);
  }
}

const mdFile = positional[0];
if (!mdFile || !existsSync(resolve(mdFile))) {
  console.error('Usage: node deliver.mjs <input.md> [annotations.json] [--format page|slides|resume] [--png] [--pdf] [--theme light|dark] [--out-dir <dir>]');
  process.exit(1);
}

const maybeAnno = positional[1];
const annoFile = (maybeAnno && maybeAnno.endsWith('.json') && existsSync(resolve(maybeAnno))) ? maybeAnno : null;

const baseName = basename(mdFile, extname(mdFile));
const outDir = resolve(flags['out-dir'] || flags.outDir || 'output');
if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

const targetHtml = resolve(outDir, `${baseName}.html`);
const targetPng = resolve(outDir, `${baseName}.png`);
const targetPdf = resolve(outDir, `${baseName}.pdf`);

console.log(`\n>>> [1/3] Compiling Chronicle Document: ${mdFile} -> ${targetHtml}`);
const renderScript = resolve(__dirname, 'render.mjs');
const renderArgs = [renderScript, mdFile];
if (annoFile) renderArgs.push(annoFile);
renderArgs.push(targetHtml);

if (flags.format || flags.type) {
  renderArgs.push('--format', flags.format || flags.type);
}
if (flags.aspect) {
  renderArgs.push('--aspect', flags.aspect);
}
if (flags.theme) {
  renderArgs.push('--theme', flags.theme);
}
execFileSync('node', renderArgs, { stdio: 'inherit' });

console.log(`\n>>> [2/3] Running Quality Gate Linter`);
const lintScript = resolve(__dirname, 'lint.mjs');
try {
  execFileSync('node', [lintScript, targetHtml], { stdio: 'inherit' });
} catch (err) {
  console.error('\nDELIVERY FAILED: Quality gate did not pass.');
  process.exit(1);
}

// Export step
const exportScript = resolve(__dirname, 'export.mjs');
const exportArgs = [exportScript, targetHtml];

const doPng = flags.png !== undefined ? flags.png : true;
const doPdf = flags.pdf !== undefined ? flags.pdf : true;

if (doPng) exportArgs.push('--png', targetPng);
if (doPdf) exportArgs.push('--pdf', targetPdf);
if (flags.format || flags.type) {
  exportArgs.push('--format', flags.format || flags.type);
}
if (flags.aspect) {
  exportArgs.push('--aspect', flags.aspect);
}

if (doPng || doPdf) {
  console.log(`\n>>> [3/3] Exporting High-Fidelity Deliverables`);
  try {
    execFileSync('node', exportArgs, { stdio: 'inherit' });
  } catch (err) {
    console.error('Export warning/error:', err.message);
  }
}

console.log(`\n==========================================`);
console.log(`OK: CHRONICLE DELIVERY COMPLETE`);
console.log(`  HTML: ${targetHtml}`);
if (doPng) console.log(`  PNG:  ${targetPng}`);
if (doPdf) console.log(`  PDF:  ${targetPdf}`);
console.log(`==========================================\n`);
