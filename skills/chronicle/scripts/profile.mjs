#!/usr/bin/env node
/**
 * Chronicle Design System - GitHub Profile README & Banner Generator
 *
 * Implements Chronicle's austere aesthetic for GitHub Profiles:
 * - Solves GitHub Markdown style sanitization by generating a theme-adaptive SVG banner
 * - Full Dark/Light mode switching via prefers-color-scheme
 * - Hollow stroke Serif typography with paint-order: stroke fill
 * - Austere Markdown body strictly adhering to the 7 Hard Constraints (no emojis, vacuum rhythm)
 *
 * Usage:
 *   node profile.mjs [--name <name>] [--title <title>] [--quote <quote>] [--out-dir <dir>]
 *   node profile.mjs profile.md [--out-dir <dir>]
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const args = process.argv.slice(2);
const flags = {
  name: 'CHRONICLE',
  title: 'Systems Architect & Computational Typographer',
  quote: '文字的重量，从不在于它占据了多少像素，而在于它被多少空白所温柔托起。',
  quoteSource: '',
  outDir: 'profile'
};

let inputFile = null;
let customBody = null;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--name' && args[i + 1]) {
    flags.name = args[++i];
  } else if (arg === '--title' && args[i + 1]) {
    flags.title = args[++i];
  } else if (arg === '--quote' && args[i + 1]) {
    flags.quote = args[++i];
  } else if (arg === '--quote-source' && args[i + 1]) {
    flags.quoteSource = args[++i];
  } else if (arg === '--out-dir' && args[i + 1]) {
    flags.outDir = args[++i];
  } else if (!arg.startsWith('--') && existsSync(resolve(arg))) {
    inputFile = resolve(arg);
  }
}

// If input file is provided, parse simple frontmatter/sections
if (inputFile) {
  const content = readFileSync(inputFile, 'utf-8');
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const yaml = fmMatch[1];
    const nameMatch = yaml.match(/name:\s*["']?([^"'\n]+)["']?/);
    if (nameMatch) flags.name = nameMatch[1].trim();
    const titleMatch = yaml.match(/title:\s*["']?([^"'\n]+)["']?/);
    if (titleMatch) flags.title = titleMatch[1].trim();
    const quoteMatch = yaml.match(/quote:\s*["']?([^"'\n]+)["']?/);
    if (quoteMatch) flags.quote = quoteMatch[1].trim();
    const sourceMatch = yaml.match(/quote_source:\s*["']?([^"'\n]+)["']?/);
    if (sourceMatch) flags.quoteSource = sourceMatch[1].trim();
    const rest = content.slice(fmMatch[0].length).trim();
    if (rest) customBody = rest;
  }
}

const outDir = resolve(process.cwd(), flags.outDir);
if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cleanQuote(str) {
  if (!str) return '';
  return String(str).trim().replace(/^["“'”]+|["“'”]+$/g, '');
}

/**
 * Generate Adaptive SVG Banner
 */
function generateBannerSvg({ name, title, quote, quoteSource }, theme = 'adaptive') {
  const width = 896;
  const height = 260;

  const lightTokens = `
        --base-surface: #fbf9f6;
        --primary-ink: #2f3542;
        --secondary-ink: #57606f;
        --sole-accent: #537791;
        --subtle-border: rgba(47, 53, 66, 0.16);
        --subtle-fill: rgba(47, 53, 66, 0.04);
        --stroke-tint: rgba(47, 53, 66, 0.75);
  `;

  const darkTokens = `
        --base-surface: #16181d;
        --primary-ink: #e4e7eb;
        --secondary-ink: #9aa2b1;
        --sole-accent: #9cb4cd;
        --subtle-border: rgba(228, 231, 235, 0.16);
        --subtle-fill: rgba(228, 231, 235, 0.05);
        --stroke-tint: rgba(228, 231, 235, 0.75);
  `;

  let styleTokens = '';
  if (theme === 'light') {
    styleTokens = `:root { ${lightTokens} }`;
  } else if (theme === 'dark') {
    styleTokens = `:root { ${darkTokens} }`;
  } else {
    styleTokens = `:root { ${lightTokens} }
      @media (prefers-color-scheme: dark) {
        :root { ${darkTokens} }
      }`;
  }

  const safeName = escapeXml(name);
  const safeTitle = escapeXml(title);
  const safeQuote = escapeXml(cleanQuote(quote));
  const safeSource = escapeXml(quoteSource);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <style>
      ${styleTokens}
      .card-bg {
        fill: var(--base-surface);
        stroke: var(--subtle-border);
        stroke-width: 1px;
      }
      .watermark-circle {
        fill: none;
        stroke: var(--subtle-border);
        stroke-width: 0.8px;
        opacity: 0.5;
      }
      .hero-title {
        font-family: "Noto Serif SC", "Songti SC", "Source Han Serif SC", "SimSun", "Georgia", "Times New Roman", serif;
        font-weight: 700;
        font-size: 54px;
        letter-spacing: 0.12em;
        text-anchor: middle;
        fill: var(--base-surface);
        stroke: var(--stroke-tint);
        stroke-width: 1.6px;
        paint-order: stroke fill;
      }
      .hero-subtitle {
        font-family: "Noto Serif SC", "Songti SC", "Source Han Serif SC", "SimSun", serif;
        font-weight: 400;
        font-size: 15px;
        letter-spacing: 0.06em;
        text-anchor: middle;
        fill: var(--secondary-ink);
      }
      .epigraph-text {
        font-family: "Noto Serif SC", "Songti SC", "SimSun", serif;
        font-weight: 400;
        font-size: 13px;
        font-style: italic;
        text-anchor: middle;
        fill: var(--secondary-ink);
        letter-spacing: 0.04em;
      }
      .hairline-divider {
        stroke: var(--subtle-border);
        stroke-width: 0.8px;
        stroke-dasharray: 4 6;
      }
      .accent-dot {
        fill: var(--sole-accent);
      }
    </style>
  </defs>

  <!-- Background Card -->
  <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="6" class="card-bg" />

  <!-- Concentric Watermark Geometry -->
  <circle cx="${width / 2}" cy="100" r="140" class="watermark-circle" />
  <circle cx="${width / 2}" cy="100" r="180" class="watermark-circle" style="stroke-dasharray: 2 6;" />

  <!-- Accent Geometry Accent -->
  <circle cx="${width / 2}" cy="28" r="2.5" class="accent-dot" />

  <!-- Hollow Hero Title -->
  <text x="${width / 2}" y="105" class="hero-title">${safeName}</text>

  <!-- Subtitle -->
  <text x="${width / 2}" y="142" class="hero-subtitle">${safeTitle}</text>

  <!-- Hairline Divider -->
  <line x1="${width / 2 - 120}" y1="172" x2="${width / 2 + 120}" y2="172" class="hairline-divider" />

  <!-- Epigraph Quote -->
  <text x="${width / 2}" y="208" class="epigraph-text">“${safeQuote}”</text>
  ${safeSource ? `<text x="${width / 2}" y="228" class="epigraph-text" style="font-size: 11px; font-style: normal; opacity: 0.8;">— ${safeSource} —</text>` : ''}
</svg>`;
}

/**
 * Generate Austere GitHub Profile README.md
 */
function generateProfileMarkdown({ name, title, quote, quoteSource, customBody }) {
  const safeName = escapeXml(name);
  const cleanQ = cleanQuote(quote);

  if (customBody) {
    return `<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./banner-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="./banner-light.svg">
  <img alt="${safeName} Banner" src="./banner.svg" width="100%">
</picture>

</div>

> “${cleanQ}”
${quoteSource ? `> <cite>— ${quoteSource}</cite>\n` : ''}
---

${customBody}

---

<div align="center">

\`2026 · CHRONICLE TYPOGRAPHIC LABS · SILENCE AND ORDER\`

</div>
`;
  }

  return `<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./banner-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="./banner-light.svg">
  <img alt="${safeName} Banner" src="./banner.svg" width="100%">
</picture>

</div>

> “${cleanQ}”
${quoteSource ? `> <cite>— ${quoteSource}</cite>\n` : ''}
---

### 01 / ARCHITECTURE & PHILOSOPHY

- **色彩克制 (Chromatic Austerity)**: 绝对单一强调色，杜绝高饱和度警告色与多余图章。
- **排版极性 (Typographic Polarity)**: 标题与哲思采用古典衬线 (Serif)；工程叙事与逻辑代码采用细体无衬线 (Sans-serif)。
- **留白韵律 (Vacuum as Rhythm)**: 充沛垂直空白作为视觉休止符与呼吸韵律。

---

### 02 / DOMAIN OF PRACTICE

| 领域 | 核心栈与技术规范 | 实践哲学 |
| :--- | :--- | :--- |
| **System Architecture** | Rust / TypeScript / Distributed Consensus / WebAssembly | 确定性交付，状态严密自洽，零额外运行时黑盒 |
| **Document Engineering** | Headless Chrome / SVG / MathJax / Micro-Typography | 印刷级矢量排版，双页优先叙事，严格拒绝压缩折叠 |
| **Agentic Tooling** | MCP Protocol / Anthropic Skills / Automated Linters | 刚性门禁防御，零提示词膨胀，确定性测试闭环 |

---

### 03 / WORKS & CONTRIBUTIONS

\`\`\`text
[Chronicle]  Universal visual & typographic design system for long-form reading, slides, and print.
[Artifacts]  Deterministic PDF, Retina PNG, and adaptive SVG generation pipelines.
[Philosophy] "Form follows restraint; clarity arises where noise recedes."
\`\`\`

---

<div align="center">

\`2026 · CHRONICLE TYPOGRAPHIC LABS · SILENCE AND ORDER\`

</div>
`;
}

// Generate files
const bannerSvg = generateBannerSvg(flags, 'adaptive');
const bannerLightSvg = generateBannerSvg(flags, 'light');
const bannerDarkSvg = generateBannerSvg(flags, 'dark');
const readmeMd = generateProfileMarkdown({ ...flags, customBody });

const bannerPath = resolve(outDir, 'banner.svg');
const bannerLightPath = resolve(outDir, 'banner-light.svg');
const bannerDarkPath = resolve(outDir, 'banner-dark.svg');
const readmePath = resolve(outDir, 'README.md');

writeFileSync(bannerPath, bannerSvg, 'utf-8');
writeFileSync(bannerLightPath, bannerLightSvg, 'utf-8');
writeFileSync(bannerDarkPath, bannerDarkSvg, 'utf-8');
writeFileSync(readmePath, readmeMd, 'utf-8');

console.log(`OK: Chronicle GitHub Profile Generated:`);
console.log(`  Adaptive Banner: ${bannerPath}`);
console.log(`  Light Banner:    ${bannerLightPath}`);
console.log(`  Dark Banner:     ${bannerDarkPath}`);
console.log(`  README:          ${readmePath}`);
