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

// Constraint 1: Alignment Contamination (NO Justify)
if (/text-align\s*:\s*justify/i.test(html)) {
  errors.push('Constraint #1 VIOLATION: "text-align: justify" found. Body text must be Left-Aligned (flush-left, ragged-right).');
}

// Constraint 2: Chromatic Contamination
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

// Constraint 3: Body Weight Discipline
// - Page & Slides: 300 Light or 400 Regular for narrative reading
// - Resume: 400 Regular for high-readability scanning (weights > 500 reserved for headings/metrics)
if (docFormat === 'page' && /\.chronicle-prose\s+p[^{]*\{[^}]*font-weight\s*:\s*(?:[5-9]\d\d|bold)/i.test(html)) {
  errors.push('Constraint #3 VIOLATION: Narrative paragraph weight is > 400. Page body MUST be set to 300 Light or 400 Regular.');
} else if (docFormat === 'slides' && /\.chronicle-slide\s+p[^{]*\{[^}]*font-weight\s*:\s*(?:[5-9]\d\d|bold)/i.test(html)) {
  errors.push('Constraint #3 VIOLATION: Slide body paragraph weight is > 400. Slides body MUST be set to 300 Light or 400 Regular.');
} else if (docFormat === 'resume' && /\.resume-item\s+p[^{]*\{[^}]*font-weight\s*:\s*(?:[6-9]\d\d|bold)/i.test(html)) {
  errors.push('Constraint #3 VIOLATION: Resume body paragraph weight is > 500. Resume body MUST be set to 400 Regular.');
}

// Constraint 4: Line-Height Discipline
// - Page: >= 1.80 for spacious, reflective reading
// - Slides: 1.80 locked for slide layout
// - Resume: >= 1.50 for compact, cohesive information density
if (docFormat === 'page') {
  const lhMatch = html.match(/\.chronicle-prose\s+p[^{]*\{[^}]*line-height\s*:\s*([0-9.]+)/i);
  if (lhMatch && parseFloat(lhMatch[1]) < 1.80) {
    errors.push(`Constraint #4 VIOLATION: Body line-height ratio is ${lhMatch[1]}. Must be >= 1.80.`);
  }
} else if (docFormat === 'slides') {
  const lhMatch = html.match(/\.chronicle-slide\s+p[^{]*\{[^}]*line-height\s*:\s*([0-9.]+)/i);
  if (lhMatch && parseFloat(lhMatch[1]) < 1.75) {
    errors.push(`Constraint #4 VIOLATION: Slide line-height ratio is ${lhMatch[1]}. Must be >= 1.75.`);
  }
} else if (docFormat === 'resume') {
  const lhMatch = html.match(/\.resume-item\s+p[^{]*\{[^}]*line-height\s*:\s*([0-9.]+)/i);
  if (lhMatch && parseFloat(lhMatch[1]) < 1.50) {
    errors.push(`Constraint #4 VIOLATION: Resume line-height ratio is ${lhMatch[1]}. Must be >= 1.50.`);
  }
}

// Constraint 5: Shadow Abuse (No physical drop shadows in reading flow)
const shadowMatches = html.match(/box-shadow\s*:\s*([^;]+);/g) || [];
for (const sm of shadowMatches) {
  if (!sm.includes('0.02') && !sm.includes('none')) {
    errors.push(`Constraint #5 VIOLATION: Unauthorized box-shadow found: "${sm}". Drop shadows are forbidden in reading flow.`);
  }
}

// Constraint 6: Visual Field Ceiling (max-width <= 896px for Page)
if (docFormat === 'page' && /--reading-max-width\s*:\s*(\d+)px/i.test(html)) {
  const mw = parseInt(html.match(/--reading-max-width\s*:\s*(\d+)px/i)[1], 10);
  if (mw > 896) {
    errors.push(`Constraint #6 VIOLATION: Container max-width ${mw}px exceeds 896px ceiling.`);
  }
}

// Constraint 7: CJK Formatting
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
