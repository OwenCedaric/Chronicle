#!/usr/bin/env node
/**
 * Chronicle Design System - Deterministic Multi-Format Renderer
 * Supports:
 *   --format page   (Long-form article, default)
 *   --format slides (16:9 Presentation Deck)
 *   --format resume (A4 Spacious Professional Resume)
 *
 * Usage: node render.mjs <input.md> [annotations.json] [output.html] [--format page|slides|resume] [--theme light|dark]
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';
import { spacing } from './pangu.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse CLI arguments
const rawArgs = process.argv.slice(2);
const flags = {};
const positional = [];

for (let i = 0; i < rawArgs.length; i++) {
  const arg = rawArgs[i];
  if (arg.startsWith('--')) {
    const key = arg.slice(2);
    const next = rawArgs[i + 1];
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

const mdPath = positional[0];
const maybeAnnoPath = positional[1];
const maybeOutPath = positional[2];

if (!mdPath) {
  console.error('Usage: node render.mjs <input.md> [annotations.json] [output.html] [--format page|slides|resume] [--theme light|dark]');
  process.exit(1);
}

let annoPath = null;
let outPath = null;

if (maybeAnnoPath && maybeAnnoPath.endsWith('.json')) {
  annoPath = maybeAnnoPath;
  outPath = maybeOutPath || mdPath.replace(/\.md$/, '.html');
} else {
  outPath = maybeAnnoPath || mdPath.replace(/\.md$/, '.html');
}

// Read Markdown
const rawMd = readFileSync(resolve(mdPath), 'utf-8');

// Read Annotations if present
let annotations = { meta: {}, upgrades: [] };
if (annoPath && existsSync(resolve(annoPath))) {
  try {
    annotations = JSON.parse(readFileSync(resolve(annoPath), 'utf-8'));
  } catch (err) {
    console.error(`ERROR: Failed to parse annotations file: ${annoPath}`, err);
  }
}

// Extract YAML Frontmatter
let contentMd = rawMd;
const fmMatch = rawMd.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
if (fmMatch) {
  const fmLines = fmMatch[1].split('\n');
  for (const line of fmLines) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) {
      const key = kv[1].trim();
      const val = kv[2].trim().replace(/^["']|["']$/g, '');
      if (!annotations.meta[key]) {
        annotations.meta[key] = val;
      }
    }
  }
  contentMd = rawMd.slice(fmMatch[0].length);
}

// Determine format: CLI flag > frontmatter format/type > default 'page'
const docFormat = flags.format || flags.type || annotations.meta.format || annotations.meta.type || 'page';
const aspect = flags.aspect || annotations.meta.aspect || 'long';
const isCard = aspect && aspect !== 'long' && aspect !== 'auto';
const theme = flags.theme || annotations.meta.theme || 'light';
const docTitle = annotations.meta.title || annotations.meta.name || 'Chronicle Document';

// Apply Pangu spacing across text
contentMd = spacing(contentMd);

// Inline keyword syntax: ==keyword== -> <span class="keyword">keyword</span>
contentMd = contentMd.replace(/==([^=]+)==/g, '<span class="keyword">$1</span>');

// Strikethrough syntax: ~~struck~~
contentMd = contentMd.replace(/~~([^~]+)~~/g, '<del class="strikethrough">$1</del>');

let finalHtml = '';

// ==========================================
// 1. FORMAT: SLIDES (16:9 Presentation Deck)
// ==========================================
if (docFormat === 'slides') {
  const cssPath = resolve(__dirname, '../templates/styles/slides.css');
  const tplPath = resolve(__dirname, '../templates/slides.html');
  const cssContent = readFileSync(cssPath, 'utf-8');
  const tplContent = readFileSync(tplPath, 'utf-8');

  // Split markdown into slides by '---'
  const slideSections = contentMd.split(/\n---\r?\n/).map(s => s.trim()).filter(Boolean);
  const slideHtmls = [];

  // Slide 1: Hero / Title Slide
  const heroSlide = `
  <section class="chronicle-slide slide-hero active">
    <div class="hero-hollow">${docTitle}</div>
    ${annotations.meta.subtitle ? `<div class="hero-subtitle">${annotations.meta.subtitle}</div>` : ''}
    <div class="hero-meta">
      ${annotations.meta.author ? `<span>${annotations.meta.author}</span>` : ''}
      ${annotations.meta.date ? `<span>${annotations.meta.date}</span>` : ''}
    </div>
  </section>`;
  slideHtmls.push(heroSlide);

  // Subsequent Slides
  for (const rawSlide of slideSections) {
    let slideContent = rawSlide;
    let isStatement = false;

    // Check if slide contains dual column block :::dual ... :::
    const dualMatch = slideContent.match(/:::dual\s*([\s\S]*?):::/);
    if (dualMatch) {
      const dualText = dualMatch[1];
      const parts = dualText.split(/\[(.*?)\]/).filter(Boolean);
      let leftHtml = '';
      let rightHtml = '';
      if (parts.length >= 4) {
        leftHtml = `<h3>${parts[0]}</h3>${marked.parse(parts[1])}`;
        rightHtml = `<h3>${parts[2]}</h3>${marked.parse(parts[3])}`;
      } else {
        const lines = dualText.trim().split('\n');
        const mid = Math.ceil(lines.length / 2);
        leftHtml = marked.parse(lines.slice(0, mid).join('\n'));
        rightHtml = marked.parse(lines.slice(mid).join('\n'));
      }
      const dualGridHtml = `
      <div class="slide-dual-grid">
        <div class="slide-dual-col">${leftHtml}</div>
        <div class="slide-dual-col">${rightHtml}</div>
      </div>`;
      slideContent = slideContent.replace(dualMatch[0], dualGridHtml);
    }

    // Check if statement slide (starts with >)
    if (slideContent.trim().startsWith('>')) {
      isStatement = true;
    }

    const parsedBody = marked.parse(slideContent);
    const slideClass = isStatement ? 'chronicle-slide slide-statement' : 'chronicle-slide slide-content';

    slideHtmls.push(`
  <section class="${slideClass}">
    ${parsedBody}
  </section>`);
  }

  finalHtml = tplContent
    .replace('{{THEME}}', theme)
    .replace('{{TITLE}}', docTitle)
    .replace('{{STYLES}}', cssContent)
    .replace('{{SLIDES}}', slideHtmls.join('\n'));

// ==========================================
// 2. FORMAT: RESUME (A4 Professional CV)
// ==========================================
} else if (docFormat === 'resume') {
  const cssPath = resolve(__dirname, '../templates/styles/resume.css');
  const tplPath = resolve(__dirname, '../templates/resume.html');
  const cssContent = readFileSync(cssPath, 'utf-8');
  const tplContent = readFileSync(tplPath, 'utf-8');

  const name = annotations.meta.name || docTitle;
  const headline = annotations.meta.headline || annotations.meta.title || '';
  const email = annotations.meta.email || '';
  const phone = annotations.meta.phone || '';
  const location = annotations.meta.location || '';
  const github = annotations.meta.github || '';
  const website = annotations.meta.website || '';

  const headerHtml = `
  <header class="resume-header">
    <h1 class="resume-name">${name}</h1>
    ${headline ? `<div class="resume-headline">${headline}</div>` : ''}
    <div class="resume-contact">
      ${email ? `<span>Email: <a href="mailto:${email}">${email}</a></span>` : ''}
      ${phone ? `<span>Tel: ${phone}</span>` : ''}
      ${location ? `<span>Loc: ${location}</span>` : ''}
      ${github ? `<span>GitHub: <a href="https://${github}" target="_blank">${github}</a></span>` : ''}
      ${website ? `<span>Web: <a href="https://${website}" target="_blank">${website}</a></span>` : ''}
    </div>
  </header>`;

  // Custom marked renderer for resume sections and items
  const resumeRenderer = new marked.Renderer();
  resumeRenderer.heading = function({ text, depth }) {
    if (depth === 2) {
      return `<h2 class="resume-section-title">${text}</h2>\n`;
    }
    if (depth === 3) {
      const parts = text.split('|').map(p => p.trim());
      if (parts.length > 1) {
        return `
        <div class="resume-item-header">
          <div><span class="resume-item-role">${parts[0]}</span> <span class="resume-item-company">/ ${parts[1]}</span></div>
        </div>\n`;
      }
      return `<div class="resume-item-header"><span class="resume-item-role">${text}</span></div>\n`;
    }
    return `<h${depth}>${text}</h${depth}>\n`;
  };

  marked.setOptions({ renderer: resumeRenderer, gfm: true });
  let bodyHtml = marked.parse(contentMd);

  // Wrap sections: split by <h2 class="resume-section-title">
  const sections = bodyHtml.split(/(?=<h2 class="resume-section-title">)/);
  const wrappedSections = sections.map(s => {
    if (!s.trim()) return '';
    return `<section class="resume-section">${s}</section>`;
  }).join('\n');

  finalHtml = tplContent
    .replace('{{TITLE}}', `${name} - 简历`)
    .replace('{{STYLES}}', cssContent)
    .replace('{{CONTENT}}', `${headerHtml}\n${wrappedSections}`);

// ==========================================
// 3. FORMAT: PAGE (Long-form Reading Article)
// ==========================================
} else {
  const cssPath = resolve(__dirname, '../templates/styles/chronicle.css');
  const tplPath = resolve(__dirname, '../templates/page.html');
  const cssContent = readFileSync(cssPath, 'utf-8');
  const tplContent = readFileSync(tplPath, 'utf-8');

  // Block-level placeholders map
  const blockMap = new Map();
  let blockIdx = 0;

  function registerBlock(html) {
    const token = `CHRONICLE_BLOCK_${blockIdx++}_TOKEN`;
    blockMap.set(token, html);
    return `\n\n${token}\n\n`;
  }

  // Process upgrades
  if (annotations.upgrades && Array.isArray(annotations.upgrades)) {
    for (const u of annotations.upgrades) {
      if (u.type === 'epigraph' && u.target) {
        const epigraphHtml = `
<div class="chronicle-epigraph">
  <p>“${u.target}”</p>
  ${u.data?.source ? `<span class="epigraph-source">(${u.data.source})</span>` : ''}
</div>`;
        const escaped = u.target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const bqRegex = new RegExp(`>\\s*\\*?${escaped}\\*?`, 'g');
        if (bqRegex.test(contentMd)) {
          contentMd = contentMd.replace(bqRegex, registerBlock(epigraphHtml));
        } else {
          contentMd = contentMd.replace(new RegExp(escaped, 'g'), registerBlock(epigraphHtml));
        }
      } else if (u.type === 'section_break' && u.target) {
        const watermark = u.data?.watermark || u.target.slice(0, 1);
        const sectionHtml = `
<div class="chronicle-section-break">
  <span class="chronicle-section-break-watermark">${watermark}</span>
  <h2 class="chronicle-section-break-title">${u.target}</h2>
</div>`;
        const escaped = u.target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const headingRegex = new RegExp(`#{1,6}\\s*${escaped}`, 'g');
        if (headingRegex.test(contentMd)) {
          contentMd = contentMd.replace(headingRegex, registerBlock(sectionHtml));
        } else {
          contentMd = contentMd.replace(new RegExp(escaped, 'g'), registerBlock(sectionHtml));
        }
      } else if (u.type === 'chat_box' && u.data?.messages) {
        const chatHtml = `
<div class="chronicle-chat-box">
  ${u.data.messages.map(m => `
  <div class="chronicle-chat-message chronicle-chat-${m.speaker === 'right' ? 'right' : 'left'}">
    ${m.name ? `<div class="chronicle-chat-speaker">${m.name}</div>` : ''}
    <div class="chronicle-chat-body">${m.text}</div>
  </div>`).join('')}
</div>`;
        if (u.target) {
          const escaped = u.target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          contentMd = contentMd.replace(new RegExp(escaped, 'g'), registerBlock(chatHtml));
        } else {
          contentMd += registerBlock(chatHtml);
        }
      } else if (u.type === 'dual_column' && u.data?.left && u.data?.right) {
        const leftHtml = marked.parse(u.data.left);
        const rightHtml = marked.parse(u.data.right);
        const dualHtml = `
<div class="chronicle-dual-column">
  <div class="chronicle-dual-col-left">${leftHtml}</div>
  <div class="chronicle-dual-col-right">${rightHtml}</div>
</div>`;
        if (u.target) {
          const escaped = u.target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          contentMd = contentMd.replace(new RegExp(escaped, 'g'), registerBlock(dualHtml));
        } else {
          contentMd += registerBlock(dualHtml);
        }
      }
    }
  }

  const renderer = new marked.Renderer();
  renderer.paragraph = function({ text }) {
    return `<p class="chronicle-p">${text}</p>\n`;
  };
  renderer.image = function({ href, title, text }) {
    return `
<figure class="chronicle-figure">
  <img src="${href}" alt="${text || ''}" loading="lazy"${title ? ` title="${title}"` : ''}>
  ${text ? `<figcaption>${text}</figcaption>` : ''}
</figure>\n`;
  };
  renderer.hr = function() {
    return `
<div class="chronicle-section-break">
  <span class="chronicle-section-break-watermark">§</span>
</div>\n`;
  };

  marked.setOptions({ renderer, gfm: true, breaks: false });
  let renderedHtml = marked.parse(contentMd);

  for (const [token, htmlBlock] of blockMap.entries()) {
    const pTokenRegex = new RegExp(`<p(?:\\s+class="[^"]*")?>\\s*${token}\\s*<\\/p>`, 'g');
    if (pTokenRegex.test(renderedHtml)) {
      renderedHtml = renderedHtml.replace(pTokenRegex, htmlBlock);
    } else {
      renderedHtml = renderedHtml.replace(new RegExp(token, 'g'), htmlBlock);
    }
  }

  let heroHtml = '';
  if (docTitle) {
    heroHtml = `
<header class="chronicle-hero">
  <div class="chronicle-hero-bg-anchor"></div>
  <div class="chronicle-hero-content">
    <div class="chronicle-hero-hollow">${docTitle}</div>
    ${annotations.meta.subtitle ? `<div class="chronicle-hero-subtitle">${annotations.meta.subtitle}</div>` : ''}
    ${(annotations.meta.author || annotations.meta.date) ? `
      <div class="chronicle-hero-meta">
        ${annotations.meta.author ? `<span>${annotations.meta.author}</span>` : ''}
        ${annotations.meta.date ? `<span>${annotations.meta.date}</span>` : ''}
      </div>` : ''}
  </div>
</header>\n`;
  }

  let codaHtml = '';
  const codaUpgrade = annotations.upgrades?.find(u => u.type === 'coda');
  if (codaUpgrade || annotations.meta.coda) {
    const topText = codaUpgrade?.data?.framing_top || 'CHRONICLE';
    const focalChar = codaUpgrade?.data?.focal_char || annotations.meta.coda_char || '終';
    const bottomText = codaUpgrade?.data?.framing_bottom || 'FIN';
    codaHtml = `
<footer class="chronicle-coda">
  <div class="chronicle-coda-frame">${topText}</div>
  <div class="chronicle-coda-anchor">${focalChar}</div>
  <div class="chronicle-coda-frame">${bottomText}</div>
</footer>\n`;
  }

  const finalBodyContent = `
<div class="chronicle-prose">
  ${heroHtml}
  ${renderedHtml}
  ${codaHtml}
</div>`;

  const bodyClass = isCard ? 'aspect-card' : '';
  finalHtml = tplContent
    .replace('{{THEME}}', theme)
    .replace('{{TITLE}}', docTitle)
    .replace(/\{\{BODY_CLASS\}\}/g, bodyClass)
    .replace('{{ASPECT}}', aspect)
    .replace('{{STYLES}}', cssContent)
    .replace('{{CONTENT}}', finalBodyContent);
}

writeFileSync(resolve(outPath), finalHtml, 'utf-8');
console.log(`OK: Rendered Chronicle [${docFormat.toUpperCase()}${isCard ? ` (${aspect})` : ''}] -> ${outPath}`);
