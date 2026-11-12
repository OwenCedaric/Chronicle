#!/usr/bin/env node
/**
 * Chronicle Design System - Quality Gate Linter
 * Verifies the 7 Hard Constraints defined in ChronicleDesignSystem.md across Page, Slides, and Resume.
 * Usage: node lint.mjs <page.html>
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const file = process.argv[2];
if (!file || !existsSync(resolve(file))) {
  console.error('Usage: node lint.mjs <page.html>');
  process.exit(1);
}

const html = readFileSync(resolve(file), 'utf-8');
const errors = [];
const warnings = [];

// Determine format
let docFormat = 'page';
if (html.includes('chronicle-deck')) {
  docFormat = 'slides';
} else if (html.includes('chronicle-resume-sheet')) {
  docFormat = 'resume';
}

// ---------------------------------------------------------------------------
// Helpers: extract <style> content and parse CSS rules for structural checks
// ---------------------------------------------------------------------------
function extractStyleContent(src) {
  const blocks = [];
  const re = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = re.exec(src)) !== null) blocks.push(m[1]);
  return blocks.join('\n');
}

/** Simple CSS rule splitter: returns [{selector, body}] (ignores @-rules internals). */
function parseCssRules(css) {
  // Strip comments
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [];
  const parts = css.split('}');
  for (const part of parts) {
    const braceIdx = part.lastIndexOf('{');
    if (braceIdx === -1) continue;
    const selector = part.slice(0, braceIdx).trim();
    const body = part.slice(braceIdx + 1).trim();
    if (selector && body) rules.push({ selector, body });
  }
  return rules;
}

/** Check if a selector targets body/paragraph text (NOT headings, titles, metrics, etc.) */
function isBodySelector(sel, fmt) {
  const lower = sel.toLowerCase();
  // Skip heading / structural / accent selectors
  if (/\bh[1-6]\b/.test(lower)) return false;
  if (/title|heading|name|metric|seal|badge|label|keyword|hero|coda|speaker|frame/.test(lower)) return false;
  // Skip card-mode overrides (aspect-card uses intentionally compact line-height)
  if (/aspect-card/.test(lower)) return false;

  if (fmt === 'page') {
    return /chronicle-prose/.test(lower) || /chronicle-p/.test(lower) || /chronicle-container/.test(lower);
  }
  if (fmt === 'slides') {
    return /chronicle-slide/.test(lower) && (/\bp\b/.test(lower) || /slide-content/.test(lower) || /slide-statement/.test(lower));
  }
  if (fmt === 'resume') {
    return /resume-text|resume-section|resume-bullet|resume-intro|resume-project/.test(lower);
  }
  return false;
}

const styleContent = extractStyleContent(html);
const cssRules = parseCssRules(styleContent);

// ===================================================================
// Constraint 1: Alignment Contamination (NO Justify)
// ===================================================================
if (/text-align\s*:\s*justify/i.test(html)) {
  errors.push('Constraint #1 VIOLATION: "text-align: justify" found. Body text must be Left-Aligned (flush-left, ragged-right).');
}

// ===================================================================
// Constraint 2: Chromatic Contamination
// ===================================================================
const forbiddenColorNames = ['red', 'green', 'yellow', 'orange', 'purple', 'cyan'];
for (const color of forbiddenColorNames) {
  const regex = new RegExp(`(?:color|background|border)[^:]*:\\s*${color}\\b`, 'i');
  if (regex.test(html)) {
    errors.push(`Constraint #2 VIOLATION: Unauthorized color keyword "${color}" detected. Only Sole Accent is permitted.`);
  }
}

// Check for unapproved hex codes in inline styles or definitions
const hexMatches = html.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
const allowedHexes = new Set([
  '#fbf9f6', '#1c1f26', '#3d4451', '#d2d6dd',
  '#757d8a', '#a0a7b4', '#82a1b9', '#9cb4cd',
  '#ffffff', '#000000', '#f5f5f5', '#f7f7f7',
  '#2f3542', '#57606f', '#537791', '#16181d',
  '#e4e7eb', '#9aa2b1', '#111827', '#4b5563',
  '#464e5f', '#e8ecf1', '#a3abb8', '#202530',
  '#222733', '#f3f4f6', '#121418'
]);
for (const hex of hexMatches) {
  const norm = hex.toLowerCase();
  if (!allowedHexes.has(norm)) {
    warnings.push(`Constraint #2 ADVISORY: Off-palette hex "${hex}" detected. Verify it conforms to approved tokens.`);
  }
}

// ===================================================================
// Constraint 3: Body Weight Discipline
// Parses actual CSS rules and checks font-weight on body-text selectors.
// - Page & Slides: 300 or 400 (violation if >= 500)
// - Resume: 400 (violation if >= 600, headings/metrics may use 500-700)
// ===================================================================
const weightThreshold = docFormat === 'resume' ? 600 : 500;
for (const rule of cssRules) {
  if (!isBodySelector(rule.selector, docFormat)) continue;
  const fwMatch = rule.body.match(/font-weight\s*:\s*(\d+|bold|bolder)/i);
  if (!fwMatch) continue;
  const val = fwMatch[1].toLowerCase();
  const numWeight = val === 'bold' ? 700 : val === 'bolder' ? 700 : parseInt(val, 10);
  if (!isNaN(numWeight) && numWeight >= weightThreshold) {
    errors.push(
      `Constraint #3 VIOLATION: Body selector "${rule.selector.slice(0, 60)}" has font-weight: ${fwMatch[1]}. ` +
      `${docFormat === 'resume' ? 'Resume body' : 'Narrative body'} must be 300 Light or 400 Regular.`
    );
  }
}

// Also check inline style font-weight on body elements
const inlineFwMatches = html.matchAll(/<(?:p|li|div)[^>]*style="[^"]*font-weight\s*:\s*(\d+|bold)[^"]*"/gi);
for (const m of inlineFwMatches) {
  const val = m[1].toLowerCase();
  const numWeight = val === 'bold' ? 700 : parseInt(val, 10);
  if (!isNaN(numWeight) && numWeight >= weightThreshold) {
    warnings.push(`Constraint #3 ADVISORY: Inline font-weight ${m[1]} found on element. Verify it is not narrative body text.`);
  }
}

// ===================================================================
// Constraint 4: Line-Height Discipline
// Parses CSS rules for line-height on body selectors.
// - Page: >= 1.80
// - Slides: >= 1.75
// - Resume: >= 1.50
// ===================================================================
const lhFloor = docFormat === 'page' ? 1.80 : docFormat === 'slides' ? 1.75 : 1.50;
for (const rule of cssRules) {
  if (!isBodySelector(rule.selector, docFormat)) continue;
  const lhMatch = rule.body.match(/line-height\s*:\s*([0-9.]+)/i);
  if (!lhMatch) continue;
  const lh = parseFloat(lhMatch[1]);
  if (lh > 0 && lh < lhFloor) {
    errors.push(
      `Constraint #4 VIOLATION: Selector "${rule.selector.slice(0, 60)}" has line-height: ${lhMatch[1]}. ` +
      `${docFormat.charAt(0).toUpperCase() + docFormat.slice(1)} body must be >= ${lhFloor}.`
    );
  }
}

// Also check the CSS custom property as a fallback
const customLhMatch = styleContent.match(/--(?:body-)?line-height\s*:\s*([0-9.]+)/i);
if (customLhMatch) {
  const lh = parseFloat(customLhMatch[1]);
  if (lh > 0 && lh < lhFloor) {
    errors.push(`Constraint #4 VIOLATION: CSS custom property line-height is ${customLhMatch[1]}. Must be >= ${lhFloor}.`);
  }
}

// ===================================================================
// Constraint 5: Shadow Abuse (No physical drop shadows in reading flow)
// Checks both box-shadow and filter: drop-shadow()
// ===================================================================
const shadowMatches = html.match(/box-shadow\s*:\s*([^;]+);/g) || [];
for (const sm of shadowMatches) {
  // Allow the micro-shadow exception (opacity 0.02) and explicit 'none'
  if (!sm.includes('0.02') && !sm.includes('none')) {
    errors.push(`Constraint #5 VIOLATION: Unauthorized box-shadow found: "${sm.slice(0, 80)}". Drop shadows are forbidden in reading flow.`);
  }
}

const dropShadowMatches = html.match(/filter\s*:[^;]*drop-shadow\s*\([^)]+\)/gi) || [];
for (const ds of dropShadowMatches) {
  errors.push(`Constraint #5 VIOLATION: Unauthorized filter drop-shadow found: "${ds.slice(0, 80)}". Drop shadows are forbidden in reading flow.`);
}

// ===================================================================
// Constraint 6: Visual Field Ceiling (max-width <= 896px for Page)
// Checks CSS custom property AND inline max-width declarations.
// ===================================================================
if (docFormat === 'page') {
  // Check custom property
  const mwPropMatch = styleContent.match(/--reading-max-width\s*:\s*(\d+)px/i);
  if (mwPropMatch) {
    const mw = parseInt(mwPropMatch[1], 10);
    if (mw > 896) {
      errors.push(`Constraint #6 VIOLATION: --reading-max-width is ${mw}px. Must be <= 896px.`);
    }
  }

  // Check container rules for explicit max-width overrides
  for (const rule of cssRules) {
    const sel = rule.selector.toLowerCase();
    if (!/chronicle-container|chronicle-prose/.test(sel)) continue;
    const mwMatch = rule.body.match(/max-width\s*:\s*(\d+)px/i);
    if (mwMatch) {
      const mw = parseInt(mwMatch[1], 10);
      if (mw > 896) {
        errors.push(`Constraint #6 VIOLATION: Selector "${rule.selector.slice(0, 60)}" sets max-width: ${mw}px. Must be <= 896px.`);
      }
    }
  }

  // Check inline styles on container-like elements
  const inlineMwMatches = html.matchAll(/<(?:main|div|article|section)[^>]*class="[^"]*(?:chronicle-container|chronicle-prose)[^"]*"[^>]*style="[^"]*max-width\s*:\s*(\d+)px/gi);
  for (const m of inlineMwMatches) {
    const mw = parseInt(m[1], 10);
    if (mw > 896) {
      errors.push(`Constraint #6 VIOLATION: Inline max-width ${mw}px on container exceeds 896px ceiling.`);
    }
  }
}

// ===================================================================
// Constraint 7: CJK Formatting (Pangu spacing)
// ===================================================================
const pMatches = html.match(/<(?:p|li)[^>]*>([\s\S]*?)<\/(?:p|li)>/g) || [];
let panguViolations = 0;
const CJK = '\\u4e00-\\u9fff';
const CJK_LATIN_UNSPACED = new RegExp(`[${CJK}][a-zA-Z0-9]|[a-zA-Z0-9][${CJK}]`);
for (const p of pMatches) {
  const text = p.replace(/<[^>]+>/g, '');
  if (CJK_LATIN_UNSPACED.test(text)) {
    panguViolations++;
  }
}
if (panguViolations > 0) {
  warnings.push(`Constraint #7 ADVISORY: ${panguViolations} paragraphs contain unspaced CJK-Latin characters. Ensure pangu spacing is applied.`);
}

// ===================================================================
// Output Report
// ===================================================================
console.log(`\n=== Chronicle Quality Gate Report [${docFormat.toUpperCase()}]: ${file} ===`);
if (warnings.length > 0) {
  for (const w of warnings) {
    console.log(`WARN: ${w}`);
  }
}

if (errors.length > 0) {
  for (const e of errors) {
    console.error(`ERROR: ${e}`);
  }
  console.error('\nVERDICT: NOT READY (Gate check failed)\n');
  process.exit(1);
} else {
  console.log('\nVERDICT: READY (All Hard Constraints satisfied)\n');
}
